# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

| Task | Command |
|---|---|
| Install all deps | `npm run install:all` |
| Dev (server :3000 + web :5173) | `npm run dev` |
| Typecheck both | `npm run typecheck` |
| Rebuild RAG vector store | `npm run rag:ingest` |
| Production build (frontend → `web/dist`) | `npm run build` |

**server scripts** (run from `server/`): `npm run dev` (tsx), `npm run typecheck` (tsc --noEmit), `npm run rag:ingest`
**web scripts** (run from `web/`): `npm run dev` (vite), `npm run build`, `npm run typecheck` (vue-tsc)

## Architecture

```
Express (server/src/index.ts)
  ├─ POST /api/analyze        ← SSE stream of multi-agent pipeline stages
  ├─ GET/POST /api/reports/*   ← CRUD on analyzed reports (SQLite)
  └─ GET/POST /api/knowledge/* ← RAG knowledge base search & stats

Vue 3 SPA (web/src/)
  ├─ AnalyzeView   ← upload images + text, watch SSE progress, see final report
  ├─ HistoryView   ← browse past reports with detail dialog
  └─ KnowledgeView ← search legal knowledge base (RAG)
```

## Multi-Agent Pipeline (server/src/agents/orchestrator.ts)

The pipeline runs sequentially via an async generator that yields `StageEvent`s over SSE:

1. **Vision Agent** (`Qwen3-VL-30B-A3B-Instruct`) → scene description (vehicles, road, weather, signals)
2. **Severity Agent** (`DeepSeek-V4-Flash`) → minor/moderate/severe + injury/property assessment
3. **Liability Agent** (`DeepSeek-V4-Flash` + RAG) → fault percentages per party + cited legal articles
4. **Report Agent** (`DeepSeek-V4-Flash`) → structured accident report with recommendations

All agent outputs are validated against Zod schemas (`schemas.ts`) via `generateObject()`. On completion, the report is persisted to SQLite via `insertReport()`.

## RAG System (server/src/rag/)

- **Knowledge corpus**: Markdown files in `server/data/knowledge/` (currently one file with traffic law excerpts)
- **Chunking** (`chunk.ts`): Article-aware — detects `第X条` markers and splits by article; falls back to sliding window (500 chars, 80 overlap)
- **Embedding** (`ingest.ts`): Uses `embedMany()` with Qwen3-Embedding-8B (4096 dims)
- **Storage** (`store.ts`): `better-sqlite3` + `sqlite-vec` virtual table (`vec_kb_chunks`) for vector similarity search
- **Retrieval** (`retriever.ts`): Embeds query → KNN on vec0 table → returns top-k chunks with source/article metadata

Rebuild the vector store after changing knowledge files: `npm run rag:ingest`

## AI Model Configuration (server/src/config.ts + providers/index.ts)

All three models go through SiliconFlow's OpenAI-compatible endpoint. Each has its own env var prefix for API key, base URL, and model name (see `.env.example`). The provider setup (`createOpenAICompatible`) creates three separate providers — one per model class — to allow different keys/endpoints per model.
