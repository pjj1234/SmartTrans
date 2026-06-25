import { tool } from 'ai'
import { z } from 'zod'
import { retrieveLegalContext } from './retriever'

/**
 * AI SDK 工具：供智能体按需检索交通法律法规。
 * 用于将流水线升级为可自主检索的 agentic RAG。
 */
export const searchLegalKnowledge = tool({
  description: '检索与交通事故相关的法律法规条文，用于责任判定与报告引用。',
  inputSchema: z.object({
    query: z.string().describe('检索关键词或问题描述'),
    k: z.number().int().min(1).max(10).optional().describe('返回条文数量，默认 5'),
  }),
  execute: async ({ query, k }) => {
    const chunks = await retrieveLegalContext(query, k ?? 5)
    return chunks.map((c) => ({
      source: c.source,
      articleNo: c.articleNo,
      content: c.content,
    }))
  },
})
