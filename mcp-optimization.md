# MCP 系统优化方案

## Context

当前 MCP 系统存在两个核心问题：

1. **PDF 生成器走的是"假 MCP"**：系统预设的 PDF 生成器使用 stdio transport（子进程方式），但 stdio 客户端经常连接失败，此时代码走本地兜底（`buildSystemToolExecutor` 直接调用 `generatePdf()`），完全绕过了 MCP 协议。用户添加的 HTTP/SSE MCP 连接虽然有真实 MCP 调用路径，但缺乏缓存和超时控制。

2. **真实 MCP 访问很慢**：`getToolsForAgent()` 每个 pipeline 被调用 5 次，每次都调用 `client.tools()`（触发网络请求），没有缓存 AI SDK tool 对象。MCP 连接操作也没有超时控制，可能长时间挂起。

## 核心问题分析

### 问题 1：`client.tools()` 结果没有缓存（性能瓶颈）

`manager.ts:130-177` `getToolsForAgent()` — 每次调用都执行 `entry.client.tools()`，这是异步 MCP 协议调用。Pipeline 中调用 5 次：
```
vision:     await mcpManager.getToolsForAgent('vision')
severity:   await mcpManager.getToolsForAgent('severity')
liability:  await mcpManager.getToolsForAgent('liability')
report:     await mcpManager.getToolsForAgent('report', ['generate_report_pdf'])
report:     await mcpManager.getToolsForAgent('report', ['maps_regeocode'])  // 逆地理编码
```

`toolCache` 字段（`McpToolInfo[]`）只缓存了工具元数据，不缓存 AI SDK tool 对象。

### 问题 2：PDF 生成器 stdio transport 不可靠

`manager.ts:318-322` `seedPresets()` 配置：
```ts
{ command: 'node', args: ['--import', 'tsx', 'src/mcp/pdf-server.ts'] }
```
- 子进程启动可能失败（路径、环境等问题）
- `connect()` 失败被静默吞掉（line 51: `.catch(() => {})`）
- 失败后回退到 `buildSystemToolExecutor()`，直接本地调用 `generatePdf()`

### 问题 3：缺少超时控制

- `connect()` 没有超时 → 对慢速 MCP 服务器可能一直挂起
- `client.listTools()` / `client.tools()` 没有超时
- 前端 MCP 管理页面添加连接时可能长时间等待

### 问题 4：竞态条件

`connect()` 在后台异步执行（line 51），`getToolsForAgent()` 可能在连接完成前被调用。对非系统连接，此时 `client` 为 null 且没有本地兜底 → 返回空工具列表。

## 方案

### 改动 1：缓存 `client.tools()` 结果（核心优化）

**文件**：`server/src/mcp/manager.ts`

在 `ClientEntry` 中新增 `aiToolCache: Record<string, any> | null` 字段，缓存 `client.tools()` 的返回值。

修改 `connect()` 方法：连接成功后立即调用 `client.tools()` 预热缓存：
```ts
// connect() 成功后
const aiTools = await client.tools()
entry.aiToolCache = aiTools
```

修改 `getToolsForAgent()`：
- 优先从 `entry.aiToolCache` 取已缓存的 AI SDK tools
- 只在缓存为空时才调用 `client.tools()`，调用后写入缓存
- 系统连接的本地兜底逻辑保持不变（当 client 为 null 时使用）

修改 `reconnect()`：清空 `aiToolCache`，重连后重新预热。

### 改动 2：为系统 PDF 连接改用 HTTP transport（解决"假 MCP"问题）

**新增文件**：`server/src/mcp/pdf-server-http.ts`（或改造 `pdf-server.ts`）

将 PDF 生成器从 stdio 子进程模式改为启动一个本地 HTTP 服务（如 `localhost:28124`），让 MCP 系统通过 HTTP transport 连接。

或者更简单的方案：既然 `pdf-server.ts` 已经是一个完整的 MCP 服务器（JSON-RPC 2.0 over stdio），可以保持 stdio transport，但修复其可靠性问题（见改动 3）。

**推荐方案**：保持 stdio，但增加以下措施使其可靠：
1. 使用绝对路径：`command: process.execPath`（当前 node 可执行文件），`args` 中使用 `path.resolve` 的绝对路径
2. 增加启动超时和重试
3. 连接失败时不再静默吞掉，而是记录详细错误日志

### 改动 3：增加超时控制

**文件**：`server/src/mcp/manager.ts`

1. `connect()` 增加超时（如 15s），超时后标记为 error
2. `getToolsForAgent()` 中 `client.tools()` 调用增加超时（如 5s）
3. 前端路由 `POST /api/mcp/connections` 增加超时保护

使用 `AbortSignal.timeout()` 或 `Promise.race` 实现。

### 改动 4：修复竞态条件

**文件**：`server/src/mcp/manager.ts`

在 `getToolsForAgent()` 中，如果 `entry.client` 为 null 且连接状态为 `connecting`，等待连接完成（使用 Promise）。可以通过在 `ClientEntry` 中存储一个 `connectPromise` 来实现。

```ts
interface ClientEntry {
  config: McpConnectionConfig
  client: MCPClient | null
  toolCache: McpToolInfo[] | null
  aiToolCache: Record<string, any> | null
  connectPromise: Promise<void> | null  // 新增
}
```

### 改动 5：减少 `getToolsForAgent` 调用次数（可选优化）

**文件**：`server/src/agents/orchestrator.ts`

当前 5 次调用中，第 4 次（report + generate_report_pdf）和第 5 次（report + maps_regeocode）是同一 agent 不同 tool filter。可以合并为一次调用，在 orchestrator 内部过滤：

```ts
const reportTools = await mcpManager.getToolsForAgent('report')
const pdfTool = reportTools['generate_report_pdf'] ?? reportTools[Object.keys(reportTools).find(k => k.endsWith('__generate_report_pdf')) ?? '']
const regeocodeTool = reportTools['maps_regeocode'] ?? reportTools[Object.keys(reportTools).find(k => k.endsWith('__maps_regeocode')) ?? '']
```

### 涉及文件

| 文件 | 改动内容 |
|---|---|
| `server/src/mcp/manager.ts` | 主要改动：添加 `aiToolCache`、超时、竞态修复、连接可靠性 |
| `server/src/mcp/types.ts` | 可能新增类型（如超时配置） |
| `server/src/agents/orchestrator.ts` | 可选：减少 `getToolsForAgent` 调用次数 |

### 不改动的部分

- MCP routes（`routes/mcp.routes.ts`）— API 接口保持不变
- `pdf-server.ts`（MCP stdio 服务器）— 逻辑不变，只修复启动可靠性
- PDF generator（`pdf/generator.ts`）— 不变
- MCP store（`store.ts`）— 不变
- 前端 MCP 页面 — 不变

## 验证方式

1. **启动服务器**：`npm run dev`，确认 `MCP_ENABLED=true`
2. **检查日志**：确认 PDF 系统连接成功 "MCP 连接成功 — PDF报告生成器"
3. **触发分析**：上传图片执行一次完整分析
4. **观察性能**：
   - 日志中 `getToolsForAgent` 不应再有重复的 `client.tools()` 调用
   - 多次分析请求应复用缓存（`aiToolCache` hit）
5. **添加外部 MCP**：通过 UI 添加一个 HTTP MCP 服务器，验证连接超时机制
6. **PDF 生成**：确认分析完成后 PDF 正常生成（通过 MCP 路径而非本地兜底）
