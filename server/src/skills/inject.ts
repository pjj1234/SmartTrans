import type { SkillPromptInjection } from './types'

/**
 * 将已启用的 skills 格式化为追加到 agent system prompt 的文本块。
 * 使用清晰的边界标记，让 LLM 明确知道这是外部注入的领域知识。
 */
export function formatSkillForSystemPrompt(skills: SkillPromptInjection[]): string {
  if (!skills || skills.length === 0) return ''

  const blocks = skills.map((skill) => {
    let block = `[Skill: ${skill.skillName}]\n`
    block += `Description: ${skill.description}\n`
    block += `Instructions:\n${skill.instructions}`
    if (skill.fileContents.length > 0) {
      block += `\n\nBundled Files:\n${skill.fileContents.join('\n---\n')}`
    }
    block += `\n[/Skill: ${skill.skillName}]`
    return block
  })

  return `\n\n--- BEGIN SKILLS ---\n${blocks.join('\n\n')}\n--- END SKILLS ---\n`
}
