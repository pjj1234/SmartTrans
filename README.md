# SmartTrans — 交通事故识别多智能体系统

Express (后端) + Vue 3 (前端) + Vercel AI SDK + RAG，用于对交通事故现场图片与文字描述进行多智能体分析，并基于交通法律法规知识库给出责任判定与结构化报告。

## 技术栈

- **后端** `server/`：Express + TypeScript + tsx
- **前端** `web/`：Vue 3 + Vite + TypeScript + Element Plus
- **AI**：`ai` + `@ai-sdk/openai-compatible` + `zod`
- **RAG**：AI SDK `embed/embedMany` + `sqlite-vec`
- **存储**：better-sqlite3；**上传**：multer

## 模型（均走 SiliconFlow OpenAI 兼容端点）

| 用途 | 模型 | 环境变量前缀 |
|---|---|---|
| 视觉（图像识别） | `Qwen/Qwen3-VL-30B-A3B-Instruct` | `QWEN_*` |
| 推理（评估/责任/报告） | `deepseek-ai/DeepSeek-V4-Flash` | `DEEPSEEK_*` |
| 嵌入（RAG） | `Qwen/Qwen3-Embedding-8B` | `EMBEDDING_*` |

## 多智能体流水线

1. **图像识别**（Qwen3-VL）→ 场景描述
2. **严重程度评估**（DeepSeek）→ 严重等级
3. **责任判定**（DeepSeek + RAG）→ 责任比例 + 法条引用
4. **报告生成**（DeepSeek）→ 结构化事故报告（落库 SQLite）

## 快速开始

```bash
# 1. 安装全部依赖
npm run install:all

# 2. 配置环境变量
copy server\.env.example server\.env   # 然后填入 API key

# 3. 构建 RAG 知识库（读取 server/data/knowledge/*）
npm run rag:ingest

# 4. 启动前后端（server:3000 / web:5173）
npm run dev
```

打开 http://localhost:5173 。

## 脚本

- `npm run dev` 同时启动前后端
- `npm run rag:ingest` 重建法律法规向量库
- `npm run build` 构建前端（生产环境由 Express 托管 `web/dist`）
- `npm run typecheck` 前后端类型检查
