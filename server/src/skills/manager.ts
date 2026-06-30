import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { config } from '../config'
import { createLogger } from '../utils/logger'
import { parseSkillMd } from './parser'
import {
  insertSkill,
  deleteSkill,
  getSkill,
  listSkills,
  getSkillByName,
  updateSkillProviderRef,
  setAgentSkillSetting,
  getAgentSkillSettings,
  getEnabledSkillIdsForAgent,
} from './store'
import type { SkillMeta, ParsedSkill, SkillPromptInjection } from './types'

const log = createLogger('skills-manager')

interface CacheEntry {
  meta: SkillMeta
  parsed: ParsedSkill
}

class SkillsManager {
  private cache = new Map<string, CacheEntry>()

  /** 启动时从 DB 加载所有 skills 并解析 SKILL.md */
  async initialize(): Promise<void> {
    // 1. 先播种预置的系统 skills
    this.seedPresets()
    // 2. 加载所有 skills
    const skills = listSkills()
    log.info(`加载 ${skills.length} 个 skills`)
    for (const meta of skills) {
      const skillDir = path.join(config.paths.skills, meta.name)
      const parsed = parseSkillMd(skillDir)
      if (parsed) {
        this.cache.set(meta.id, { meta, parsed })
      } else {
        log.warn(`Skill "${meta.name}" 解析失败，跳过`)
      }
    }
  }

  /** 播种预置的系统 skills（同名已存在则跳过） */
  private seedPresets(): void {
    const PRESET_ID = 'system-liability-enhancer'
    const PRESET_NAME = 'liability-enhancer'

    // 检查是否已存在
    const existing = getSkillByName(PRESET_NAME)
    if (existing) {
      log.info(`预置 Skill 已存在 — ${PRESET_NAME}`)
      return
    }

    // 从磁盘读取预置 SKILL.md
    const skillDir = path.join(config.paths.skills, PRESET_NAME)
    const parsed = parseSkillMd(skillDir)
    if (!parsed) {
      log.warn(`预置 Skill 解析失败 — ${skillDir}`)
      return
    }

    const meta: SkillMeta = {
      id: PRESET_ID,
      name: parsed.name,
      description: parsed.description,
      sourcePath: `skills/${PRESET_NAME}/SKILL.md`,
      filesJson: [],
      providerRef: null,
      uploadStatus: 'local',
      isSystem: true,
      enabled: true,
      createdAt: new Date().toISOString(),
    }
    insertSkill(meta)
    this.cache.set(PRESET_ID, { meta, parsed })

    // 默认启用给 liability agent
    setAgentSkillSetting('liability', PRESET_ID, true)

    log.info(`预置 Skill 已播种 — ${PRESET_NAME} (${PRESET_ID})，默认绑定 liability agent`)
  }

  /** 创建新 skill：写入 SKILL.md 到磁盘 + 插入 DB + 加入缓存 */
  createSkill(
    skillMdContent: string,
    files?: { path: string; content: string }[],
  ): SkillMeta {
    // 1. 先写入磁盘临时目录，解析出 name
    const tmpDir = path.join(config.paths.skills, '.tmp-' + crypto.randomUUID())
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'SKILL.md'), skillMdContent, 'utf-8')
    if (files) {
      for (const f of files) {
        const filePath = path.join(tmpDir, f.path)
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
        fs.writeFileSync(filePath, f.content, 'utf-8')
      }
    }

    const parsed = parseSkillMd(tmpDir)
    if (!parsed) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
      throw new Error('SKILL.md 解析失败：缺少 name 字段或格式不正确')
    }

    // 2. 检查重名
    const existing = listSkills().find((s) => s.name === parsed.name)
    if (existing) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
      throw new Error(`Skill "${parsed.name}" 已存在`)
    }

    // 3. 移动到正式目录
    const skillDir = path.join(config.paths.skills, parsed.name)
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true })
    }
    fs.renameSync(tmpDir, skillDir)

    // 4. 记录文件列表
    const fileNames: string[] = []
    if (files) {
      fileNames.push(...files.map((f) => f.path))
    }

    // 5. 持久化
    const id = crypto.randomUUID()
    const meta: SkillMeta = {
      id,
      name: parsed.name,
      description: parsed.description,
      sourcePath: `skills/${parsed.name}/SKILL.md`,
      filesJson: fileNames,
      providerRef: null,
      uploadStatus: 'local',
      isSystem: false,
      enabled: true,
      createdAt: new Date().toISOString(),
    }
    insertSkill(meta)

    // 6. 加入缓存
    this.cache.set(id, { meta, parsed })
    log.info(`Skill 已创建 — ${parsed.name} (${id})`)
    return meta
  }

  /** 删除 skill */
  removeSkill(id: string): void {
    const entry = this.cache.get(id)
    if (!entry) throw new Error(`Skill 不存在: ${id}`)

    const skillDir = path.join(config.paths.skills, entry.meta.name)
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true })
    }
    deleteSkill(id)
    this.cache.delete(id)
    log.info(`Skill 已删除 — ${entry.meta.name} (${id})`)
  }

  /** 获取单个 skill 完整内容（含解析后的 instructions） */
  getSkillContent(id: string): { meta: SkillMeta; parsed: ParsedSkill } | undefined {
    const entry = this.cache.get(id)
    if (!entry) return undefined
    return { meta: entry.meta, parsed: entry.parsed }
  }

  /** 列出所有 skills（仅 metadata） */
  listAllSkills(): SkillMeta[] {
    return Array.from(this.cache.values()).map((e) => e.meta)
  }

  /** 获取某 agent 启用的所有 skills 的 prompt 注入内容 */
  getSkillsForAgent(
    agentName: string,
    selections?: { skillId: string; agentNames: string[] }[],
  ): SkillPromptInjection[] {
    // 1. 持久化设置中为该 agent 启用的 skill IDs
    const enabledIds = new Set(getEnabledSkillIdsForAgent(agentName))

    // 2. 合并此次分析的选择
    if (selections) {
      for (const sel of selections) {
        if (sel.agentNames.includes(agentName)) {
          enabledIds.add(sel.skillId)
        }
      }
    }

    // 3. 从缓存取出已解析的 skill 内容
    const injections: SkillPromptInjection[] = []
    for (const skillId of enabledIds) {
      const entry = this.cache.get(skillId)
      if (!entry) continue
      injections.push({
        skillName: entry.parsed.name,
        description: entry.parsed.description,
        instructions: entry.parsed.instructions,
        fileContents: entry.parsed.files.map((f) => f.content),
      })
    }
    return injections
  }

  /** 设置 agent-skill 绑定 */
  setAgentSetting(agentName: string, skillId: string, enabled: boolean): void {
    setAgentSkillSetting(agentName, skillId, enabled)
  }

  /** 获取 agent-skill 绑定 */
  getAgentSettings(agentName?: string) {
    return getAgentSkillSettings(agentName)
  }

  /** 重新解析磁盘上的 skill 文件（用于文件更新后刷新缓存） */
  reloadSkill(id: string): boolean {
    const entry = this.cache.get(id)
    if (!entry) return false

    const skillDir = path.join(config.paths.skills, entry.meta.name)
    const parsed = parseSkillMd(skillDir)
    if (!parsed) return false

    // 更新 description（可能已变更）
    const updatedMeta = { ...entry.meta, description: parsed.description }
    this.cache.set(id, { meta: updatedMeta, parsed })
    return true
  }

  /** 尝试 native uploadSkill（v1 预留，当前 provider 不支持） */
  getProviderCapabilities(): { supportsNativeSkills: boolean } {
    return { supportsNativeSkills: false }
  }

  /** 关闭（预留接口） */
  async shutdown(): Promise<void> {
    this.cache.clear()
    log.info('SkillsManager 已关闭')
  }
}

export const skillsManager = new SkillsManager()
