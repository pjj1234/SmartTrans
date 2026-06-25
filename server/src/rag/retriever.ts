import { embed } from 'ai'
import { createLogger } from '../utils/logger'
import { embeddingModel } from '../providers/index'
import { searchChunks, type RetrievedChunk } from './store'

const log = createLogger('rag-retriever')

/** 根据查询文本检索相关法律法规条文 */
export async function retrieveLegalContext(query: string, k = 5): Promise<RetrievedChunk[]> {
  log.info(`检索 — query="${query.slice(0, 100)}", k=${k}`)

  const { embedding } = await embed({ model: embeddingModel, value: query })
  log.debug(`嵌入完成 — dims=${embedding.length}`)

  const chunks = searchChunks(embedding, k)
  log.info(`检索完成 — 命中 ${chunks.length} 条`)

  return chunks
}

/** 把检索到的条文拼成可注入提示词的文本 */
export function formatLegalContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    log.info('formatLegalContext — 无条文可注入')
    return '（未检索到相关法条）'
  }
  const result = chunks
    .map((c, i) => `[${i + 1}] 《${c.source}》${c.articleNo ?? ''}\n${c.content}`)
    .join('\n\n')
  log.debug(`formatLegalContext — ${chunks.length} 条, ${result.length} chars`)
  return result
}
