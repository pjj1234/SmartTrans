export interface Chunk {
  content: string
  articleNo: string | null
}

const ARTICLE_RE = /^\s*第\s*[0-9一二三四五六七八九十百零两]+\s*条/

function slidingWindow(text: string, size = 500, overlap = 80): Chunk[] {
  const clean = text.replace(/\r\n/g, '\n').trim()
  if (clean.length <= size) return clean ? [{ content: clean, articleNo: null }] : []
  const chunks: Chunk[] = []
  let start = 0
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length)
    const content = clean.slice(start, end).trim()
    if (content) chunks.push({ content, articleNo: null })
    if (end >= clean.length) break
    start = end - overlap
  }
  return chunks
}

/**
 * 将法律法规文本分块：
 * - 若存在「第X条」标记，则按条文分块并记录条号
 * - 否则退化为滑动窗口分块
 */
export function chunkText(text: string): Chunk[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const chunks: Chunk[] = []
  let cur: string[] = []
  let curNo: string | null = null
  let hasArticles = false

  const flush = () => {
    const content = cur.join('\n').trim()
    if (content) chunks.push({ content, articleNo: curNo })
    cur = []
  }

  for (const line of lines) {
    const m = line.match(ARTICLE_RE)
    if (m) {
      hasArticles = true
      flush()
      curNo = m[0].trim()
    }
    cur.push(line)
  }
  flush()

  if (!hasArticles) return slidingWindow(text)
  return chunks.filter((c) => c.content.length > 0)
}
