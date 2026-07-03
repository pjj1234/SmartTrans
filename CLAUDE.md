# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

| Task | Command |
|---|---|
| Install all deps | `npm run install:all` |
| Dev (server :28123 + web :5173) | `npm run dev` |
| Dev server with auto-restart | `npm --prefix server run dev:watch` |
| Typecheck both | `npm run typecheck` |
| Rebuild RAG vector store | `npm run rag:ingest` |
| Production build (frontend → `web/dist`) | `npm run build` |
| Start server in production | `npm start` |
| Test API endpoints (needs `TEST_IMAGE` env or path arg) | `npm --prefix server run test:api` |

**server scripts** (run from `server/`): `npm run dev` (tsx), `npm run dev:watch` (tsx watch), `npm run typecheck` (tsc --noEmit), `npm run rag:ingest`, `npm run test:api`
**web scripts** (run from `web/`): `npm run dev` (vite), `npm run build`, `npm run preview`, `npm run typecheck` (vue-tsc)

## First-Time Setup

```bash
npm run install:all
cp server/.env.example server/.env   # then edit: fill in API keys for vision/reasoning/embedding models
npm run rag:ingest                   # build vector store from server/data/knowledge/
npm run dev                          # starts server:28123 + web:5173 concurrently
```

For production deployment, copy `server/.env.production.example` instead (adds `LOG_LEVEL` and `ALLOWED_ORIGINS`).

## Architecture

```
Express (server/src/index.ts)
  ├─ POST /api/analyze        ← SSE stream of multi-agent pipeline stages
  ├─ GET/POST /api/reports/*   ← CRUD on analyzed reports (SQLite)
  ├─ GET/POST /api/knowledge/* ← RAG knowledge base search, upload, & stats
  ├─ GET|POST|DELETE /api/mcp/* ← MCP connection management & agent tool binding
  ├─ GET|POST|DELETE /api/skills/* ← skill injection management & per-agent enablement
  ├─ GET /api/health
  └─ Static: /uploads/* (uploaded images), web/dist/* (prod SPA fallback)

Vue 3 SPA (web/src/)
  ├─ AnalyzeView   ← upload images + text, watch SSE progress, see final report
  ├─ HistoryView   ← browse past reports with detail dialog
  ├─ KnowledgeView ← search legal knowledge base, upload/delete documents
  ├─ McpSettingsView ← manage MCP connections + per-agent tool enablement (lazy-loaded)
  └─ SkillsView    ← manage skills injection + per-agent enablement (lazy-loaded)

**SSE pipeline client** (`composables/useAnalysisPipeline.ts`): The core frontend composable that drives the analysis flow — manages step state machine (wait→process→finish/error), auto-compresses images >512KB, feeds `StageEvent` SSE stream into reactive step cards via the `analyze()` API client.
```

During dev, Vite proxies `/api` and `/uploads` to `http://localhost:28123` (matching the server's default `PORT`). In production, Express serves `web/dist` directly.

## Multi-Agent Pipeline (server/src/agents/orchestrator.ts)

The pipeline runs sequentially via an async generator that yields `StageEvent`s over SSE:

1. **Vision Agent** (`Qwen3-VL-30B-A3B-Instruct`) → scene description (vehicles, road, weather, signals)
2. **Severity Agent** (`DeepSeek-V4-Flash`) → minor/moderate/severe + injury/property assessment
3. **Liability Agent** (`DeepSeek-V4-Flash` + RAG) → fault percentages per party + cited legal articles
4. **Report Agent** (`DeepSeek-V4-Flash`) → structured accident report with recommendations

All agent outputs are validated against Zod schemas (`schemas.ts`). On completion, the report is persisted to SQLite via `insertReport()` and a PDF is generated (best-effort, failure is non-fatal).

### Structured Generation (server/src/agents/helpers.ts)

`generateStructured()` is the central helper used by all four agents. It uses a **single-stage** `generateText()` call with both `tools` and `output: Output.object({ schema })` combined:

- **Without tools**: `generateText({ output: { schema }, stopWhen: stepCountIs(1) })` — equivalent to `generateObject`
- **With MCP tools**: `generateText({ tools, output: { schema }, stopWhen: stepCountIs(10) })` — tool calls and structured output in one pass, capped at 10 steps

This single-stage approach avoids the double latency of the old two-phase pattern (generateText → generateObject).

## RAG System (server/src/rag/)

- **Knowledge corpus**: Markdown files in `server/data/knowledge/` (traffic law excerpts), plus runtime-uploaded documents via the web UI
- **Chunking** (`chunk.ts`): Article-aware — detects `第X条` markers and splits by article; falls back to sliding window (500 chars, 80 overlap)
- **Embedding** (`ingest.ts`): Batch CLI using `embedMany()` with Qwen3-Embedding-8B (4096 dims)
- **Storage** (`store.ts`): `better-sqlite3` + `sqlite-vec` virtual table (`vec_kb_chunks`) for vector similarity search. Runtime uploads go through the same embed→insert flow via the knowledge routes
- **Retrieval** (`retriever.ts`): Embeds query → KNN on vec0 table → returns top-k chunks with source/article metadata
- **Tool** (`tool.ts`): AI SDK `tool()` definition (`searchLegalKnowledge`) for agentic RAG — agents can call this to retrieve laws on-demand during generation

Rebuild the vector store after changing knowledge files: `npm run rag:ingest`. Individual documents can also be uploaded/deleted at runtime via `POST/DELETE /api/knowledge/documents`.

**Liability agent guardrail**: If RAG returns no results, `citedArticles` is programmatically cleared to `[]` and a disclaimer is added to the system prompt instructing the model not to cite articles from its own knowledge.

## MCP System (server/src/mcp/)

Model Context Protocol integration allows agents to call external tools during analysis:

- **Manager** (`manager.ts`): Singleton `McpManager` — maintains a map of MCP client connections, handles connect/reconnect/disconnect lifecycle, provides `getToolsForAgent(agentName)` to aggregate tools from all enabled connections for a given agent. When MCP is disabled, returns `{}`.
- **Store** (`store.ts`): Persists connection configs (`mcp_connections` table) and per-agent enablement settings (`agent_mcp_settings` table)
- **Types** (`types.ts`): `McpConnectionConfig` (transport: http/sse/stdio), `McpConnectionStatus`, `AgentMcpSetting`
- **Routes** (`routes/mcp.routes.ts`): `GET/POST/DELETE /api/mcp/connections`, `GET/PUT /api/mcp/agent-settings`, `GET /api/mcp/status`
- **PDF Server** (`pdf-server.ts`): Stdio MCP server implementing the `generate_report_pdf` tool — JSON-RPC 2.0 over stdin/stdout, used by the `system-pdf-generator` preset connection

MCP is gated by the `MCP_ENABLED` env var (defaults to `false`). When disabled, all `/api/mcp/*` routes (except `/status`) return 404 and agents run without external tools.

**Tool name disambiguation**: When two MCP connections expose tools with the same name, the second is prefixed with `connectionName__` to avoid collisions (`manager.ts` line 152).

### Preset System Connections

Preset MCP connections are seeded on startup by `McpManager.seedPresets()`, cannot be deleted by users, and show a "系统" badge in the UI. They are marked with `is_system = 1` in the `mcp_connections` table.

**PDF报告生成器** (`system-pdf-generator`): Exposes `generate_report_pdf` — takes `reportJson` string, generates a styled PDF via pdfkit, stores to `server/data/pdfs/`. Has a local fallback executor: if the stdio MCP client fails to connect, the manager runs `generatePdf()` directly without going through the MCP transport.

### PDF Report Generation (server/src/pdf/generator.ts)

After the multi-agent pipeline completes and the report is persisted, the orchestrator generates a PDF automatically (best-effort, failure is non-fatal). PDFs are stored at `server/data/pdfs/report-<uuid>.pdf` with a `pdf_path` column in the `reports` table tracking the file.

- **Library**: `pdfkit` (A4, 50pt margins, styled sections with serif/sans-serif font pairing)
- **Fonts**: Priority order — (1) custom fonts in `server/data/fonts/` (SourceHanSansSC + SourceHanSerifSC in Regular/Bold), (2) system fonts (Windows: SimHei/SimSun/KaiTi; macOS: PingFang/STHeiti; Linux: Noto Sans CJK/WenQuanYi)
- **Download**: `GET /api/reports/:id/pdf` streams the PDF with `Content-Disposition: attachment`
- Frontend shows a "下载PDF" button in HistoryView only when `hasPdf` is true

## Database (server/src/db/)

SQLite via `better-sqlite3` with WAL mode + `sqlite-vec` extension. File: `server/data/app.db`.

| Table | Purpose |
|---|---|
| `reports` | Completed analysis reports (JSON columns + pdf_path for optional PDF download) |
| `kb_documents` | Knowledge base document metadata |
| `kb_chunks` | Text chunks with article number references |
| `vec_kb_chunks` | Virtual table (vec0) — float[4096] embeddings for vector search |
| `mcp_connections` | MCP server connection configs and status (includes `is_system` flag) |
| `agent_mcp_settings` | Per-agent enable/disable flags for each MCP connection |
| `skills` | Skill metadata (name, description, source path, bundled files) |
| `agent_skill_settings` | Per-agent enable/disable flags for each skill |

Timestamps use Beijing time (`Asia/Shanghai`, `datetime('now', '+8 hours')`).

## AI Model Configuration (server/src/config.ts + providers/index.ts)

All three models go through SiliconFlow's OpenAI-compatible endpoint. Three separate providers are created via `createOpenAICompatible` — one per model class — to allow different keys/endpoints per model. See `server/.env.example` for all env vars.

## Deployment

- **Linux/macOS**: `bash deploy.sh` — installs deps, builds frontend, rebuilds RAG, starts via PM2
- **Windows**: `.\deploy.ps1` — installs deps, builds frontend, rebuilds RAG, prints manual start instructions
- **PM2 config**: `ecosystem.config.cjs` — runs `tsx src/index.ts` from `server/`, port 28123, auto-restart (max 10), 500MB memory limit, logs to `logs/`

## Upload Middleware (server/src/middleware/upload.ts)

- **Analysis images**: `upload.array('images', 6)` — max 6 files, 15MB each, image MIME types only
- **Knowledge documents**: `uploadKnowledge.single('file')` — max 1 file, 5MB, `.md`/`.txt`/`.markdown` only

Uploaded files are stored in `server/data/uploads/` with random UUID filenames.

## i18n System (server/src/i18n/index.ts)

All agent system prompts, step labels, and PDF text support three languages: `en`, `zh-CN`, `zh-TW`. The frontend sends `Accept-Language` header; the server resolves it via `getLanguage()` and passes localized prompts to each agent. When adding new prompt text, add entries for all three languages.

## Skills System (server/src/skills/)

Skills allow users to inject custom instructions and bundled files into agent system prompts at runtime. Each skill is a directory under `server/data/skills/<skillName>/` containing a `SKILL.md` with YAML frontmatter (`name`, `description`) + markdown body (instructions) + optional bundled files.

- **Manager** (`manager.ts`): Singleton `SkillsManager` — seeds preset skills on startup, loads all from DB, maintains a cache of parsed skills
- **Store** (`store.ts`): Persists skills (`skills` table) and per-agent enablement (`agent_skill_settings` table)
- **Inject** (`inject.ts`): `formatSkillForSystemPrompt()` wraps enabled skills in `[Skill: name]...[/Skill: name]` blocks appended to the agent's system prompt
- **Routes**: `GET|POST|DELETE /api/skills/*`, `GET|PUT /api/skills/agent-settings`

Skills are always active (no env-var gate); enabled skills are injected into agent system prompts at pipeline runtime.
