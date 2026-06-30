import { Router } from 'express'
import { createLogger } from '../utils/logger'
import { skillsManager } from '../skills/manager'
import { getSkill, updateSkillEnabled } from '../skills/store'

const log = createLogger('skills-routes')
export const skillsRoutes = Router()

// ---- Skills CRUD ----

/** 列出所有 skills（仅 metadata） */
skillsRoutes.get('/', (_req, res) => {
  const list = skillsManager.listAllSkills()
  res.json(list)
})

/** 获取单个 skill 完整内容 */
skillsRoutes.get('/:id', (req, res) => {
  const result = skillsManager.getSkillContent(req.params.id)
  if (!result) {
    return res.status(404).json({ error: 'Skill 不存在' })
  }
  res.json(result)
})

/** 创建新 skill（multipart/form-data: skillMd 文本 + 可选 files 数组） */
skillsRoutes.post('/', async (req, res) => {
  try {
    const { skillMd } = req.body
    if (!skillMd || typeof skillMd !== 'string') {
      return res.status(400).json({ error: '缺少必填字段: skillMd (SKILL.md 内容)' })
    }

    // 解析可选的打包文件（客户端以 JSON 数组发送，每项 { path, content }）
    let files: { path: string; content: string }[] | undefined
    if (req.body.files) {
      try {
        files = typeof req.body.files === 'string' ? JSON.parse(req.body.files) : req.body.files
      } catch {
        return res.status(400).json({ error: 'files 格式不正确，应为 JSON 数组' })
      }
    }

    const meta = skillsManager.createSkill(skillMd, files)
    log.info(`创建 Skill — ${meta.name} (${meta.id})`)
    res.status(201).json(meta)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('已存在')) {
      return res.status(409).json({ error: message })
    }
    if (message.includes('解析失败')) {
      return res.status(400).json({ error: message })
    }
    log.error('创建 skill 失败', e)
    res.status(500).json({ error: message })
  }
})

/** 删除 skill */
skillsRoutes.delete('/:id', async (req, res) => {
  try {
    const skill = getSkill(req.params.id)
    if (skill?.isSystem) {
      return res.status(403).json({ error: '系统技能不可删除' })
    }
    skillsManager.removeSkill(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    log.error('删除 skill 失败', e)
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

/** 更新 skill 全局启用/禁用 */
skillsRoutes.put('/:id/enabled', (req, res) => {
  try {
    const { enabled } = req.body
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: '缺少必填字段: enabled (boolean)' })
    }
    const skill = getSkill(req.params.id)
    if (!skill) {
      return res.status(404).json({ error: 'Skill 不存在' })
    }
    updateSkillEnabled(req.params.id, enabled)
    skillsManager.reloadSkill(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    log.error('更新 skill enabled 失败', e)
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

// ---- Agent-Skill 绑定 ----

/** 获取 agent-skill 绑定（可选 ?agent=vision 过滤） */
skillsRoutes.get('/bindings/agent-settings', (req, res) => {
  const agentName = req.query.agent as string | undefined
  res.json(skillsManager.getAgentSettings(agentName))
})

/** 设置 agent-skill 绑定 */
skillsRoutes.put('/bindings/agent-settings', (req, res) => {
  try {
    const { agentName, skillId, enabled } = req.body
    if (!agentName || !skillId) {
      return res.status(400).json({ error: '缺少必填字段: agentName, skillId' })
    }
    skillsManager.setAgentSetting(agentName, skillId, Boolean(enabled))
    res.json({ ok: true })
  } catch (e) {
    log.error('更新 agent skill 绑定失败', e)
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

// ---- 上传技能包（.zip） ----

skillsRoutes.post('/upload-bundle', async (req, res) => {
  try {
    const { skillMd, files } = req.body
    if (!skillMd || typeof skillMd !== 'string') {
      return res.status(400).json({ error: '缺少必填字段: skillMd' })
    }

    let parsedFiles: { path: string; content: string }[] | undefined
    if (files) {
      try {
        parsedFiles = typeof files === 'string' ? JSON.parse(files) : files
      } catch {
        return res.status(400).json({ error: 'files 格式不正确' })
      }
    }

    const meta = skillsManager.createSkill(skillMd, parsedFiles)
    log.info(`上传技能包 — ${meta.name} (${meta.id})`)
    res.status(201).json(meta)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('已存在')) {
      return res.status(409).json({ error: message })
    }
    log.error('上传技能包失败', e)
    res.status(500).json({ error: message })
  }
})

// ---- Provider 能力查询 ----

skillsRoutes.get('/meta/provider-capabilities', (_req, res) => {
  res.json(skillsManager.getProviderCapabilities())
})

// ---- 重新解析（刷新缓存） ----

skillsRoutes.post('/:id/reload', (req, res) => {
  const ok = skillsManager.reloadSkill(req.params.id)
  if (!ok) {
    return res.status(404).json({ error: 'Skill 不存在或解析失败' })
  }
  res.json({ ok: true })
})
