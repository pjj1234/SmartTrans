import { generateText, Output, stepCountIs } from 'ai'
import type { ZodSchema } from 'zod'
import { createLogger } from '../utils/logger'

const log = createLogger('generate-structured')

interface GenerateOptions {
  model: any
  schema: ZodSchema
  tools?: Record<string, any>
  system?: string
  prompt?: string
  messages?: any[]
}

/**
 * 统一的结构化生成入口：
 * 使用 generateText 同时支持 tools（工具调用）和 output（结构化 schema），
 * 一次 LLM 调用完成，避免旧两阶段模式（generateText → generateObject）的双倍耗时。
 *
 * - 无 tools → generateText({ output: { schema } }) — 等价于 generateObject
 * - 有 tools → generateText({ tools, output: { schema }, maxSteps: 10 }) — 工具调用 + 结构化输出一步完成
 */
export async function generateStructured<T>(opts: GenerateOptions): Promise<T> {
  const { model, schema, tools, system, prompt, messages } = opts
  const hasTools = tools && Object.keys(tools).length > 0

  const start = Date.now()

  if (hasTools) {
    log.info(`开始 — 带 ${Object.keys(tools!).length} 个工具: ${Object.keys(tools!).join(', ')}`)
  }

  try {
    const result = await doGenerate({ model, schema, tools: hasTools ? tools : undefined, system, prompt, messages })
    if (hasTools) {
      const ms = ((Date.now() - start) / 1000).toFixed(1)
      log.info(
        `完成 — 总步骤=${(result as any).steps?.length ?? '?'}, toolCalls=${result.toolCalls?.length ?? 0}, 总耗时=${ms}s`,
      )
    }
    return (result as any).output as T
  } catch (err) {
    // 带 tools 时模型可能无法生成结构化输出（如 VL 模型被无关 tools 干扰），降级重试
    if (hasTools) {
      const msg = err instanceof Error ? err.message : String(err)
      log.warn(`带 ${Object.keys(tools!).length} 个工具生成失败，降级为无工具重试 — ${msg}`)
      const result = await doGenerate({ model, schema, system, prompt, messages })
      return (result as any).output as T
    }
    throw err
  }
}

async function doGenerate(opts: {
  model: any
  schema: ZodSchema
  tools?: Record<string, any>
  system?: string
  prompt?: string
  messages?: any[]
}): Promise<any> {
  const { model, schema, tools, system, prompt, messages } = opts
  const hasTools = tools && Object.keys(tools).length > 0
  return generateText({
    model,
    tools: hasTools ? tools : undefined,
    output: Output.object({ schema }),
    system,
    prompt,
    messages: messages as any,
    stopWhen: hasTools ? stepCountIs(10) : stepCountIs(1),
    ...(hasTools
      ? {
          onStepFinish: (event: any) => {
            const stepNumber = event.stepNumber ?? '?'
            const textLen = event.text?.length ?? 0
            const tcCount = event.toolCalls?.length ?? 0
            const tcNames = event.toolCalls?.map((tc: any) => tc.toolName).join(', ') ?? ''
            const trSummary =
              event.toolResults
                ?.map((tr: any) => `${tr.toolName}=${JSON.stringify(tr.result).slice(0, 120)}`)
                .join('; ') ?? ''

            log.info(
              `步骤${stepNumber}/10 — text=${textLen}chars` +
                (tcCount > 0 ? `, toolCalls=${tcCount}[${tcNames}]` : '') +
                (trSummary ? `, results=[${trSummary}]` : '') +
                `, reason=${event.finishReason ?? '?'}`,
            )
          },
        }
      : {}),
  })
}
