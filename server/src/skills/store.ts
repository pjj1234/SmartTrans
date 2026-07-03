import { db } from '../db/index'
import type { SkillMeta, AgentSkillSetting } from './types'

/** 插入 skill 记录（source_path 相对于 data/ 目录） */
export function insertSkill(meta: SkillMeta): void {
  db.prepare(`
    INSERT INTO skills (id, name, description, source_path, files_json, provider_ref, upload_status, is_system, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    meta.id,
    meta.name,
    meta.description,
    meta.sourcePath,
    JSON.stringify(meta.filesJson ?? []),
    meta.providerRef ?? null,
    meta.uploadStatus ?? 'local',
    meta.isSystem ? 1 : 0,
    meta.enabled ? 1 : 0,
  )
}

export function deleteSkill(id: string): void {
  // 先删除关联的 agent-skill 绑定
  db.prepare('DELETE FROM agent_skill_settings WHERE skill_id = ?').run(id)
  db.prepare('DELETE FROM skills WHERE id = ?').run(id)
}

export function getSkill(id: string): SkillMeta | undefined {
  const row = db.prepare('SELECT * FROM skills WHERE id = ?').get(id) as SkillRow | undefined
  return row ? rowToMeta(row) : undefined
}

export function listSkills(): SkillMeta[] {
  const rows = db.prepare('SELECT * FROM skills ORDER BY created_at DESC').all() as SkillRow[]
  return rows.map(rowToMeta)
}

export function updateSkillProviderRef(
  id: string,
  providerRef: string,
  status: 'uploaded' | 'failed',
): void {
  db.prepare('UPDATE skills SET provider_ref = ?, upload_status = ? WHERE id = ?').run(
    providerRef,
    status,
    id,
  )
}

// ---- agent_skill_settings ----

export function setAgentSkillSetting(
  agentName: string,
  skillId: string,
  enabled: boolean,
): void {
  const tx = db.transaction(() => {
    // When enabling a skill for an agent, disable all other skills for that agent
    // (ensures at most 1 skill per agent)
    if (enabled) {
      db.prepare(
        'UPDATE agent_skill_settings SET enabled = 0 WHERE agent_name = ? AND skill_id != ?',
      ).run(agentName, skillId)
    }
    db.prepare(`
      INSERT INTO agent_skill_settings (agent_name, skill_id, enabled)
      VALUES (?, ?, ?)
      ON CONFLICT(agent_name, skill_id) DO UPDATE SET enabled = excluded.enabled
    `).run(agentName, skillId, enabled ? 1 : 0)
  })
  tx()
}

export function getAgentSkillSettings(agentName?: string): AgentSkillSetting[] {
  if (agentName) {
    return (db
      .prepare('SELECT * FROM agent_skill_settings WHERE agent_name = ?')
      .all(agentName) as SettingRow[]).map(rowToSetting)
  }
  return (db.prepare('SELECT * FROM agent_skill_settings').all() as SettingRow[]).map(rowToSetting)
}

export function getEnabledSkillIdsForAgent(agentName: string): string[] {
  const rows = db
    .prepare(
      `SELECT ass.skill_id FROM agent_skill_settings ass
       JOIN skills s ON ass.skill_id = s.id
       WHERE ass.agent_name = ? AND ass.enabled = 1 AND s.enabled = 1`,
    )
    .all(agentName) as { skill_id: string }[]
  return rows.map((r) => r.skill_id)
}

export function updateSkillEnabled(id: string, enabled: boolean): void {
  db.prepare('UPDATE skills SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id)
}

// ---- internal helpers ----

interface SkillRow {
  id: string
  name: string
  description: string | null
  source_path: string | null
  files_json: string | null
  provider_ref: string | null
  upload_status: string
  is_system: number
  enabled: number
  created_at: string
}

interface SettingRow {
  agent_name: string
  skill_id: string
  enabled: number
}

function rowToMeta(row: SkillRow): SkillMeta {
  let filesJson: string[] = []
  if (row.files_json) {
    try {
      filesJson = JSON.parse(row.files_json)
    } catch {
      /* keep [] */
    }
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    sourcePath: row.source_path ?? '',
    filesJson,
    providerRef: row.provider_ref ?? null,
    uploadStatus: row.upload_status as SkillMeta['uploadStatus'],
    isSystem: row.is_system === 1,
    enabled: row.enabled !== 0,
    createdAt: row.created_at,
  }
}

export function getSkillByName(name: string): SkillMeta | undefined {
  const row = db.prepare('SELECT * FROM skills WHERE name = ?').get(name) as SkillRow | undefined
  return row ? rowToMeta(row) : undefined
}

function rowToSetting(row: SettingRow): AgentSkillSetting {
  return {
    agentName: row.agent_name,
    skillId: row.skill_id,
    enabled: row.enabled === 1,
  }
}
