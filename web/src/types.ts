// ---- Agent step state (used by pipeline UI) ----
export interface AgentStep {
  key: string
  label: string
  status: 'wait' | 'process' | 'finish' | 'error'
  data?: unknown
  skillNames?: string[]
  toolNames?: string[]
}

// ---- Agent output types (mirrors server/src/agents/schemas.ts) ----

export interface VehicleInfo {
  type: string
  color: string | null
  position: string
  visibleDamage: string
}

/** 场景识别智能体输出 */
export interface SceneDescription {
  vehicles: VehicleInfo[]
  roadCondition: string
  weather: string
  trafficSignals: string
  sceneSummary: string
}

/** 严重程度评估智能体输出 */
export interface SeverityAssessment {
  level: 'minor' | 'moderate' | 'severe'
  injuryRisk: string
  propertyDamage: string
  confidence: number // 0-1
  reasoning: string
}

export interface LiabilityParty {
  party: string
  faultPercentage: number // 0-100
  reasoning: string
}

export interface CitedArticle {
  citation: string
  content: string
}

/** 责任判定智能体输出 */
export interface LiabilityAnalysis {
  parties: LiabilityParty[]
  citedArticles: CitedArticle[]
  conclusion: string
}

/** 最终报告 */
export interface AccidentReportView {
  title?: string
  summary?: string
  sceneSummary?: string
  severityLevel?: string
  liabilityConclusion?: string
  citedArticles?: CitedArticle[]
  location?: string
  generatedAt?: string
  recommendations?: string[]
}
