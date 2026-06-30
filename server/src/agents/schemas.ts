import { z } from 'zod'
import type { SupportedLanguage } from '../i18n'

/**
 * Returns all 4 Zod schemas with `.describe()` strings localized to the target language.
 * This is critical: the AI SDK's Output.object({ schema }) passes .describe() strings
 * directly to the model as field-level output format instructions. Without localization,
 * the model receives Chinese descriptions and outputs Chinese regardless of system prompt language.
 */
export function getSchemas(language: SupportedLanguage) {
  const L = (en: string, zhCN: string, zhTW: string) =>
    language === 'en' ? en : language === 'zh-CN' ? zhCN : zhTW

  // ---- Scene Schema ----
  const sceneSchema = z.object({
    vehicles: z
      .array(
        z.object({
          type: z.string().describe(
            L('Participant type, e.g. car/truck/e-bike/pedestrian',
              '交通参与者类型，如轿车/卡车/电动车/行人',
              '交通參與者類型，如轎車/卡車/電動車/行人'),
          ),
          color: z.string().nullable().describe(
            L('Color, null if unknown',
              '颜色，未知则 null',
              '顏色，未知則 null'),
          ),
          position: z.string().describe(
            L('Relative position at the scene',
              '在现场的相对位置',
              '在現場的相對位置'),
          ),
          visibleDamage: z.string().describe(
            L('Visible damage',
              '可见受损情况',
              '可見受損情況'),
          ),
        }),
      )
      .describe(
        L('Vehicles/traffic participants identified at the scene',
          '现场识别到的车辆/交通参与者',
          '現場識別到的車輛/交通參與者'),
      ),
    roadCondition: z.string().describe(
      L('Road surface / road condition',
        '路面/道路状况',
        '路面/道路狀況'),
    ),
    weather: z.string().describe(
      L('Weather / lighting conditions',
        '天气/光照条件',
        '天氣/光照條件'),
    ),
    trafficSignals: z.string().describe(
      L('Traffic signals / signs / markings',
        '交通信号灯/标志/标线情况',
        '交通號誌/標誌/標線情況'),
    ),
    sceneSummary: z.string().describe(
      L('Overall objective description of the scene',
        '现场总体客观描述',
        '現場總體客觀描述'),
    ),
  })

  // ---- Severity Schema ----
  const severitySchema = z.object({
    level: z.enum(['minor', 'moderate', 'severe']).describe(
      L('Severity level: minor / moderate / severe',
        '严重等级：轻微/一般/严重',
        '嚴重等級：輕微/一般/嚴重'),
    ),
    injuryRisk: z.string().describe(
      L('Assessment of injury risk to persons',
        '人员伤亡风险评估',
        '人員傷亡風險評估'),
    ),
    propertyDamage: z.string().describe(
      L('Assessment of property damage',
        '财产损失评估',
        '財產損失評估'),
    ),
    confidence: z.number().min(0).max(1).describe(
      L('Confidence score 0-1',
        '置信度 0-1',
        '置信度 0-1'),
    ),
    reasoning: z.string().describe(
      L('Rationale for the assessment',
        '评估依据',
        '評估依據'),
    ),
  })

  // ---- Liability Schema ----
  const liabilitySchema = z.object({
    parties: z
      .array(
        z.object({
          party: z.string().describe(
            L('Party identifier, e.g. Vehicle A / Vehicle B / Pedestrian',
              '当事方标识，如 A车/B车/行人',
              '當事方標識，如 A車/B車/行人'),
          ),
          faultPercentage: z.number().min(0).max(100).describe(
            L('Fault percentage (0-100)',
              '责任比例（百分数）',
              '責任比例（百分數）'),
          ),
          reasoning: z.string().describe(
            L('Reasoning for this party\'s fault allocation',
              '该方责任依据',
              '該方責任依據'),
          ),
        }),
      )
      .describe(
        L('Fault allocation for each party',
          '各当事方责任划分',
          '各當事方責任劃分'),
      ),
    citedArticles: z.array(z.string()).describe(
      L('Cited legal articles (source + article number)',
        '引用的法条（来源 + 条号）',
        '引用的法條（來源 + 條號）'),
    ),
    conclusion: z.string().describe(
      L('Liability determination conclusion',
        '责任划分结论',
        '責任劃分結論'),
    ),
  })

  // ---- Report Schema ----
  const reportSchema = z.object({
    title: z.string().describe(
      L('Report title',
        '报告标题',
        '報告標題'),
    ),
    summary: z.string().describe(
      L('Accident summary',
        '事故概要',
        '事故概要'),
    ),
    sceneSummary: z.string().describe(
      L('Scene situation description',
        '现场情况',
        '現場情況'),
    ),
    severityLevel: z.enum(['minor', 'moderate', 'severe']).describe(
      L('Severity level',
        '严重等级',
        '嚴重等級'),
    ),
    liabilityConclusion: z.string().describe(
      L('Liability determination conclusion',
        '责任认定结论',
        '責任認定結論'),
    ),
    citedArticles: z.array(z.string()).describe(
      L('Cited legal articles',
        '引用法条',
        '引用法條'),
    ),
    recommendations: z.array(z.string()).describe(
      L('Recommendations / suggested actions',
        '处理建议',
        '處理建議'),
    ),
  })

  return { sceneSchema, severitySchema, liabilitySchema, reportSchema }
}

// Keep type exports — all language variants produce identical shapes,
// so we infer from the English version.
const _schemas = getSchemas('en')
export type SceneDescription = z.infer<typeof _schemas.sceneSchema>
export type SeverityAssessment = z.infer<typeof _schemas.severitySchema>
export type LiabilityAnalysis = z.infer<typeof _schemas.liabilitySchema>
export type AccidentReport = z.infer<typeof _schemas.reportSchema>
