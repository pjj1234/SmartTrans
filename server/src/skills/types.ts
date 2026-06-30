/** 持久化的 skill 元数据（对应 DB skills 表） */
export interface SkillMeta {
  id: string
  name: string
  description: string
  sourcePath: string
  filesJson: string[]
  providerRef: string | null
  uploadStatus: 'local' | 'uploaded' | 'failed'
  isSystem: boolean
  enabled: boolean
  createdAt: string
}

/** 解析后的 SKILL.md 完整内容 */
export interface ParsedSkill {
  name: string
  description: string
  instructions: string
  files: SkillFile[]
}

export interface SkillFile {
  path: string
  content: string
}

/** agent-skill 绑定 */
export interface AgentSkillSetting {
  agentName: string
  skillId: string
  enabled: boolean
}

/** 注入到 agent system prompt 的 skill 内容 */
export interface SkillPromptInjection {
  skillName: string
  description: string
  instructions: string
  fileContents: string[]
}
