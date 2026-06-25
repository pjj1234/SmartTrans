import { z } from 'zod'

export const sceneSchema = z.object({
  vehicles: z
    .array(
      z.object({
        type: z.string().describe('交通参与者类型，如轿车/卡车/电动车/行人'),
        color: z.string().nullable().describe('颜色，未知则 null'),
        position: z.string().describe('在现场的相对位置'),
        visibleDamage: z.string().describe('可见受损情况'),
      }),
    )
    .describe('现场识别到的车辆/交通参与者'),
  roadCondition: z.string().describe('路面/道路状况'),
  weather: z.string().describe('天气/光照条件'),
  trafficSignals: z.string().describe('交通信号灯/标志/标线情况'),
  sceneSummary: z.string().describe('现场总体客观描述'),
})
export type SceneDescription = z.infer<typeof sceneSchema>

export const severitySchema = z.object({
  level: z.enum(['minor', 'moderate', 'severe']).describe('严重等级：轻微/一般/严重'),
  injuryRisk: z.string().describe('人员伤亡风险评估'),
  propertyDamage: z.string().describe('财产损失评估'),
  confidence: z.number().min(0).max(1).describe('置信度 0-1'),
  reasoning: z.string().describe('评估依据'),
})
export type SeverityAssessment = z.infer<typeof severitySchema>

export const liabilitySchema = z.object({
  parties: z
    .array(
      z.object({
        party: z.string().describe('当事方标识，如 A车/B车/行人'),
        faultPercentage: z.number().min(0).max(100).describe('责任比例（百分数）'),
        reasoning: z.string().describe('该方责任依据'),
      }),
    )
    .describe('各当事方责任划分'),
  citedArticles: z.array(z.string()).describe('引用的法条（来源 + 条号）'),
  conclusion: z.string().describe('责任划分结论'),
})
export type LiabilityAnalysis = z.infer<typeof liabilitySchema>

export const reportSchema = z.object({
  title: z.string().describe('报告标题'),
  summary: z.string().describe('事故概要'),
  sceneSummary: z.string().describe('现场情况'),
  severityLevel: z.enum(['minor', 'moderate', 'severe']).describe('严重等级'),
  liabilityConclusion: z.string().describe('责任认定结论'),
  citedArticles: z.array(z.string()).describe('引用法条'),
  recommendations: z.array(z.string()).describe('处理建议'),
})
export type AccidentReport = z.infer<typeof reportSchema>
