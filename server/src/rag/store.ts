import { db } from '../db/index'
import { createLogger } from '../utils/logger'

const log = createLogger('rag-store')

export interface RetrievedChunk {
  id: number
  content: string
  articleNo: string | null
  source: string
  distance: number
}

/** 返回当前北京时间字符串 (YYYY-MM-DD HH:MM:SS) */
function beijingNow(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false })
}

export function clearKnowledge(): void {
  const before = knowledgeStats()
  log.info(`清空知识库 — 删除前: ${before.documents} documents, ${before.chunks} chunks`)
  db.exec('DELETE FROM vec_kb_chunks; DELETE FROM kb_chunks; DELETE FROM kb_documents;')
  log.info('知识库已清空')
}

export function insertDocument(title: string, source: string, category: string): number {
  const info = db
    .prepare(`INSERT INTO kb_documents (title, source, category, created_at) VALUES (?, ?, ?, ?)`)
    .run(title, source, category, beijingNow())
  const id = Number(info.lastInsertRowid)
  log.info(`插入文档 — id=${id}, title="${title}", category=${category}`)
  return id
}

export function insertChunk(
  documentId: number,
  content: string,
  articleNo: string | null,
  embedding: number[],
): void {
  const info = db
    .prepare(
      `INSERT INTO kb_chunks (document_id, content, article_no, token_count) VALUES (?, ?, ?, ?)`,
    )
    .run(documentId, content, articleNo, content.length)
  const chunkId = info.lastInsertRowid
  db.prepare(`INSERT INTO vec_kb_chunks (rowid, embedding) VALUES (?, ?)`).run(
    BigInt(chunkId),
    JSON.stringify(embedding),
  )
  log.debug(`插入分块 — chunkId=${chunkId}, docId=${documentId}, articleNo=${articleNo ?? '-'}, embedding[${embedding.length}]`)
}

export function searchChunks(embedding: number[], k = 5): RetrievedChunk[] {
  log.debug(`向量搜索 — k=${k}, embedding dims=${embedding.length}`)
  const rows = db
    .prepare(
      `WITH knn AS (
         SELECT rowid, distance
         FROM vec_kb_chunks
         WHERE embedding MATCH ?
         ORDER BY distance
         LIMIT ?
       )
       SELECT c.id AS id, c.content AS content, c.article_no AS articleNo,
              d.title AS source, knn.distance AS distance
       FROM knn
       JOIN kb_chunks c ON c.id = knn.rowid
       JOIN kb_documents d ON d.id = c.document_id
       ORDER BY knn.distance`,
    )
    .all(JSON.stringify(embedding), k) as RetrievedChunk[]
  log.info(`向量搜索结果 — 命中 ${rows.length} 条`)
  if (rows.length > 0) {
    log.debug('命中详情', rows.map((r) => ({ source: r.source, articleNo: r.articleNo, distance: r.distance.toFixed(4) })))
  }
  return rows
}

export function knowledgeStats(): { documents: number; chunks: number } {
  const documents = (db.prepare(`SELECT COUNT(*) AS n FROM kb_documents`).get() as { n: number }).n
  const chunks = (db.prepare(`SELECT COUNT(*) AS n FROM kb_chunks`).get() as { n: number }).n
  return { documents, chunks }
}

export interface DocumentRow {
  id: number
  title: string
  source: string
  category: string
  createdAt: string
  chunkCount: number
}

/** 列出所有已上传的文档及其分块数量，按创建时间倒序 */
export function listDocuments(): DocumentRow[] {
  const rows = db
    .prepare(
      `SELECT d.id, d.title, d.source, d.category, d.created_at AS createdAt,
              (SELECT COUNT(*) FROM kb_chunks c WHERE c.document_id = d.id) AS chunkCount
       FROM kb_documents d
       ORDER BY d.created_at DESC`,
    )
    .all() as DocumentRow[]
  log.debug(`列出文档 — ${rows.length} 个`)
  return rows
}

/** 删除文档及其所有分块和向量，使用事务保证一致性 */
export function deleteDocument(id: number): boolean {
  log.info(`删除文档 — id=${id}`)

  const transaction = db.transaction(() => {
    const chunkIds = (
      db.prepare(`SELECT id FROM kb_chunks WHERE document_id = ?`).all(id) as { id: number }[]
    ).map((r) => BigInt(r.id))

    log.debug(`关联分块 — ${chunkIds.length} 个`)

    if (chunkIds.length > 0) {
      for (const cid of chunkIds) {
        db.prepare(`DELETE FROM vec_kb_chunks WHERE rowid = ?`).run(cid)
      }
      db.prepare(`DELETE FROM kb_chunks WHERE document_id = ?`).run(id)
      log.debug(`已删除 ${chunkIds.length} 个分块及向量`)
    }
    const info = db.prepare(`DELETE FROM kb_documents WHERE id = ?`).run(id)
    return info.changes > 0
  })

  const deleted = transaction()
  if (deleted) {
    log.info(`文档已删除 — id=${id}`)
  } else {
    log.warn(`文档不存在 — id=${id}`)
  }
  return deleted
}
