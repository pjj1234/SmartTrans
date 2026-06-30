import fs from 'node:fs'
import path from 'node:path'
import { createLogger } from '../utils/logger'
import type { ParsedSkill, SkillFile } from './types'

const log = createLogger('skills-parser')

/** 简易 YAML frontmatter 解析（不引入额外依赖），提取 name 和 description */
function parseFrontmatter(
  text: string,
): { name: string; description: string } | null {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!match) return null

  const fm = match[1]
  const name = extractYamlField(fm, 'name')
  const description = extractYamlField(fm, 'description')
  if (!name) return null

  return { name, description: description ?? '' }
}

function extractYamlField(fm: string, key: string): string | null {
  // 支持 "key: value" 和 "key: |"（多行）两种格式
  const multiLineMatch = fm.match(
    new RegExp(`^${key}:\\s*\\|\\s*\\n([\\s\\S]*?)(?=\\n\\S|\$)`, 'm'),
  )
  if (multiLineMatch) {
    return multiLineMatch[1]
      .split('\n')
      .map((l) => l.replace(/^\s{2}/, ''))
      .join('\n')
      .trim()
  }

  const simpleMatch = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
  return simpleMatch ? simpleMatch[1].trim() : null
}

/** 抽取 frontmatter 之后的 Markdown 正文 */
function extractBody(text: string): string {
  const match = text.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/)
  return match ? match[1].trim() : text.trim()
}

/**
 * 解析磁盘上的 SKILL.md 文件，返回 ParsedSkill。
 * @param skillDir skill 所在的目录（如 data/skills/my-skill/）
 */
export function parseSkillMd(skillDir: string): ParsedSkill | null {
  const mdPath = path.join(skillDir, 'SKILL.md')
  if (!fs.existsSync(mdPath)) {
    log.warn(`SKILL.md 不存在 — ${mdPath}`)
    return null
  }

  const raw = fs.readFileSync(mdPath, 'utf-8')
  const frontmatter = parseFrontmatter(raw)
  if (!frontmatter) {
    log.warn(`SKILL.md 缺少 frontmatter — ${mdPath}`)
    return null
  }

  const body = extractBody(raw)

  // 读取打包文件（除 SKILL.md 外的所有文件）
  const files: SkillFile[] = []
  if (fs.existsSync(skillDir)) {
    const entries = fs.readdirSync(skillDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && entry.name !== 'SKILL.md') {
        const filePath = path.join(skillDir, entry.name)
        try {
          files.push({
            path: entry.name,
            content: fs.readFileSync(filePath, 'utf-8'),
          })
        } catch {
          log.warn(`无法读取 skill 文件 — ${filePath}`)
        }
      }
    }
  }

  return { name: frontmatter.name, description: frontmatter.description, instructions: body, files }
}
