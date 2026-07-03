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

  /** Initialize: load all skills from DB and parse SKILL.md */
  async initialize(): Promise<void> {
    // 1. Seed preset system skills first
    this.seedPresets()
    // 2. Load all skills
    const skills = listSkills()
    log.info(`Loading ${skills.length} skills`)
    for (const meta of skills) {
      const skillDir = path.join(config.paths.skills, meta.name)
      const parsed = parseSkillMd(skillDir)
      if (parsed) {
        this.cache.set(meta.id, { meta, parsed })
      } else {
        log.warn(`Skill "${meta.name}" parse failed, skipping`)
      }
    }
  }

  /** Seed preset system skills (skip if name already exists) */
  private seedPresets(): void {
    const presets: { id: string; name: string; defaultAgent: string }[] = [
      { id: 'system-liability-enhancer', name: 'liability-enhancer', defaultAgent: 'liability' },
      { id: 'system-vision-enhancer', name: 'vision-enhancer', defaultAgent: 'vision' },
      { id: 'system-severity-enhancer', name: 'severity-enhancer', defaultAgent: 'severity' },
      { id: 'system-report-enhancer', name: 'report-enhancer', defaultAgent: 'report' },
    ]

    for (const preset of presets) {
      const existing = getSkillByName(preset.name)
      if (existing) {
        log.info(`Preset skill already exists: ${preset.name}`)
        // Ensure existing skill is bound to its default agent (compat migration)
        const existingSettings = getAgentSkillSettings(preset.defaultAgent)
        if (!existingSettings.some((s) => s.skillId === existing.id)) {
          setAgentSkillSetting(preset.defaultAgent, existing.id, true)
          log.info(`Backfill binding: ${preset.name} -> ${preset.defaultAgent}`)
        }
        continue
      }

      const skillDir = path.join(config.paths.skills, preset.name)
      const parsed = parseSkillMd(skillDir)
      if (!parsed) {
        log.warn(`Preset skill parse failed: ${skillDir}`)
        continue
      }

      const meta: SkillMeta = {
        id: preset.id,
        name: parsed.name,
        description: parsed.description,
        sourcePath: `skills/${preset.name}/SKILL.md`,
        filesJson: [],
        providerRef: null,
        uploadStatus: 'local',
        isSystem: true,
        enabled: true,
        createdAt: new Date().toISOString(),
      }
      insertSkill(meta)
      this.cache.set(preset.id, { meta, parsed })

      setAgentSkillSetting(preset.defaultAgent, preset.id, true)

      log.info(`Preset skill seeded: ${preset.name} (${preset.id}), default-bound to ${preset.defaultAgent}`)
    }
  }

  /** Create new skill: write SKILL.md to disk + insert DB + add to cache */
  createSkill(
    skillMdContent: string,
    files?: { path: string; content: string }[],
  ): SkillMeta {
    // 1. Write to temp dir, parse name
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
      throw new Error('SKILL.md parse failed: missing name field or invalid format')
    }

    // 2. Check duplicate name
    const existing = listSkills().find((s) => s.name === parsed.name)
    if (existing) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
      throw new Error(`Skill "${parsed.name}" already exists`)
    }

    // 3. Move to final directory
    const skillDir = path.join(config.paths.skills, parsed.name)
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true })
    }
    fs.renameSync(tmpDir, skillDir)

    // 4. Record file list
    const fileNames: string[] = []
    if (files) {
      fileNames.push(...files.map((f) => f.path))
    }

    // 5. Persist
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

    // 6. Add to cache
    this.cache.set(id, { meta, parsed })
    log.info(`Skill created: ${parsed.name} (${id})`)
    return meta
  }

  /** Delete skill */
  removeSkill(id: string): void {
    const entry = this.cache.get(id)
    if (!entry) throw new Error(`Skill not found: ${id}`)

    const skillDir = path.join(config.paths.skills, entry.meta.name)
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true })
    }
    deleteSkill(id)
    this.cache.delete(id)
    log.info(`Skill deleted: ${entry.meta.name} (${id})`)
  }

  /** Get single skill with full parsed content */
  getSkillContent(id: string): { meta: SkillMeta; parsed: ParsedSkill } | undefined {
    const entry = this.cache.get(id)
    if (!entry) return undefined
    return { meta: entry.meta, parsed: entry.parsed }
  }

  /** List all skills (metadata only) */
  listAllSkills(): SkillMeta[] {
    return Array.from(this.cache.values()).map((e) => e.meta)
  }

  /** Get enabled skills for an agent, merged with per-request selections */
  getSkillsForAgent(
    agentName: string,
    selections?: { skillId: string; agentNames: string[] }[],
  ): SkillPromptInjection[] {
    // 1. Persistently enabled skill IDs for this agent
    const enabledIds = new Set(getEnabledSkillIdsForAgent(agentName))

    // 2. Merge per-request selections
    if (selections) {
      for (const sel of selections) {
        if (sel.agentNames.includes(agentName)) {
          enabledIds.add(sel.skillId)
        }
      }
    }

    // 3. Fetch parsed skill content from cache
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

  /** Set agent-skill binding */
  setAgentSetting(agentName: string, skillId: string, enabled: boolean): void {
    setAgentSkillSetting(agentName, skillId, enabled)
  }

  /** Get agent-skill bindings */
  getAgentSettings(agentName?: string) {
    return getAgentSkillSettings(agentName)
  }

  /** Reload skill from disk (refresh cache after file update) */
  reloadSkill(id: string): boolean {
    const entry = this.cache.get(id)
    if (!entry) return false

    const skillDir = path.join(config.paths.skills, entry.meta.name)
    const parsed = parseSkillMd(skillDir)
    if (!parsed) return false

    // Update description (may have changed)
    const updatedMeta = { ...entry.meta, description: parsed.description }
    this.cache.set(id, { meta: updatedMeta, parsed })
    return true
  }

  /** Provider capabilities (v1 placeholder, native upload not supported yet) */
  getProviderCapabilities(): { supportsNativeSkills: boolean } {
    return { supportsNativeSkills: false }
  }

  /** Shutdown (reserved) */
  async shutdown(): Promise<void> {
    this.cache.clear()
    log.info('SkillsManager shut down')
  }
}

export const skillsManager = new SkillsManager()
