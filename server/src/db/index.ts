import fs from 'node:fs'
import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import { createLogger } from '../utils/logger'
import { config } from '../config'

const log = createLogger('db')

fs.mkdirSync(config.paths.uploads, { recursive: true })
fs.mkdirSync(config.paths.knowledge, { recursive: true })

log.info(`打开数据库 — ${config.paths.db}`)
export const db = new Database(config.paths.db)
db.pragma('journal_mode = WAL')

sqliteVec.load(db)
log.info('sqlite-vec 已加载')

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    description TEXT,
    image_paths TEXT,
    scene       TEXT,
    severity    TEXT,
    liability   TEXT,
    report      TEXT,
    created_at  TEXT DEFAULT (datetime('now', '+8 hours'))
  );

  CREATE TABLE IF NOT EXISTS kb_documents (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT,
    source     TEXT,
    category   TEXT,
    created_at TEXT DEFAULT (datetime('now', '+8 hours'))
  );

  CREATE TABLE IF NOT EXISTS kb_chunks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER,
    content     TEXT,
    article_no  TEXT,
    token_count INTEGER
  );
`)

db.exec(
  `CREATE VIRTUAL TABLE IF NOT EXISTS vec_kb_chunks USING vec0(embedding float[${config.embedding.dim}]);`,
)

// 启动时输出知识库状态
const docCount = (db.prepare('SELECT COUNT(*) AS n FROM kb_documents').get() as { n: number }).n
const chunkCount = (db.prepare('SELECT COUNT(*) AS n FROM kb_chunks').get() as { n: number }).n
const vecCount = (db.prepare('SELECT COUNT(*) AS n FROM vec_kb_chunks').get() as { n: number }).n
log.info(`数据库就绪 — reports 表, kb_documents=${docCount}, kb_chunks=${chunkCount}, vec_kb_chunks=${vecCount}`)
