import path from 'node:path'
import { createLogger } from '../utils/logger'
import { config } from '../config'
import { insertReport, updateReportPdfPath } from '../db/reports.repo'
import { analyzeLiability } from './liability.agent'
import { generateReport } from './report.agent'
import { generatePdf } from '../pdf/generator'
import { assessSeverity } from './severity.agent'
import { recognizeScene } from './vision.agent'
import { mcpManager } from '../mcp/manager'
import { skillsManager } from '../skills/manager'
import type { AccidentReport } from './schemas'

const log = createLogger('orchestrator')

export type StageName = 'vision' | 'severity' | 'liability' | 'report'

export type StageEvent =
  | { type: 'stage_start'; stage: StageName; label: string; skillNames: string[] }
  | { type: 'stage_complete'; stage: StageName; label: string; data: unknown; skillNames: string[] }
  | { type: 'done'; reportId: string; report: unknown }
  | { type: 'error'; message: string }

const LABELS: Record<StageName, string> = {
  vision: '图像识别智能体',
  severity: '严重程度评估智能体',
  liability: '责任判定智能体',
  report: '报告生成智能体',
}

function skillNames(skills: { skillName: string }[]): string[] {
  return skills.map((s) => s.skillName)
}

export interface SkillSelection {
  skillId: string
  agentNames: string[]
}

/**
 * 多智能体流水线：依次执行图像识别 → 严重程度评估 → 责任判定(含 RAG) → 报告生成，
 * 通过异步生成器逐阶段产出事件（供 SSE 推送），最终落库并返回报告 id。
 */
export async function* runPipeline(
  images: Buffer[],
  imagePaths: string[],
  description: string,
  skillSelections?: SkillSelection[],
): AsyncGenerator<StageEvent> {
  log.info(`流水线启动 — 图片 ${images.length} 张, 描述: "${description.slice(0, 80)}"`)

  try {
    // 预先获取每个智能体启用的 MCP 工具（一次查询，避免每阶段重复）
    const agentTools = {
      vision: await mcpManager.getToolsForAgent('vision'),
      severity: await mcpManager.getToolsForAgent('severity'),
      liability: await mcpManager.getToolsForAgent('liability'),
      report: await mcpManager.getToolsForAgent('report'),
    }

    // 预先获取每个智能体启用的 Skills（合并持久化设置 + 此次分析选择）
    const agentSkills = {
      vision: skillsManager.getSkillsForAgent('vision', skillSelections),
      severity: skillsManager.getSkillsForAgent('severity', skillSelections),
      liability: skillsManager.getSkillsForAgent('liability', skillSelections),
      report: skillsManager.getSkillsForAgent('report', skillSelections),
    }

    // ---- 1. 图像识别 ----
    yield { type: 'stage_start', stage: 'vision', label: LABELS.vision, skillNames: skillNames(agentSkills.vision) }
    log.info('阶段开始: vision')
    const scene = await recognizeScene(images, description, agentTools.vision, agentSkills.vision)
    yield { type: 'stage_complete', stage: 'vision', label: LABELS.vision, data: scene, skillNames: skillNames(agentSkills.vision) }
    log.info('阶段完成: vision', scene)

    // ---- 2. 严重程度评估 ----
    yield { type: 'stage_start', stage: 'severity', label: LABELS.severity, skillNames: skillNames(agentSkills.severity) }
    log.info('阶段开始: severity')
    const severity = await assessSeverity(scene, description, agentTools.severity, agentSkills.severity)
    yield { type: 'stage_complete', stage: 'severity', label: LABELS.severity, data: severity, skillNames: skillNames(agentSkills.severity) }
    log.info('阶段完成: severity', severity)

    // ---- 3. 责任判定 (RAG) ----
    yield { type: 'stage_start', stage: 'liability', label: LABELS.liability, skillNames: skillNames(agentSkills.liability) }
    log.info('阶段开始: liability')
    const { analysis: liability } = await analyzeLiability(scene, severity, description, agentTools.liability, agentSkills.liability)
    yield { type: 'stage_complete', stage: 'liability', label: LABELS.liability, data: liability, skillNames: skillNames(agentSkills.liability) }
    log.info(`阶段完成: liability — citedArticles=${liability.citedArticles?.length ?? 0}`, liability.citedArticles)

    // ---- 4. 报告生成 ----
    yield { type: 'stage_start', stage: 'report', label: LABELS.report, skillNames: skillNames(agentSkills.report) }
    log.info('阶段开始: report')
    const report = await generateReport({ scene, severity, liability, description }, agentTools.report, agentSkills.report)
    yield { type: 'stage_complete', stage: 'report', label: LABELS.report, data: report, skillNames: skillNames(agentSkills.report) }
    log.info(`阶段完成: report — citedArticles=${report.citedArticles?.length ?? 0}`, report.citedArticles)

    // ---- 落库 ----
    const reportId = insertReport({ description, imagePaths, scene, severity, liability, report })
    log.info(`报告已落库, id=${reportId}`)

    // ---- PDF 生成（仅当 report agent 绑定了 PDF MCP 工具时） ----
    const reportToolKeys = Object.keys(agentTools.report)
    const hasPdfTool = reportToolKeys.some(
      (k) => k === 'generate_report_pdf' || k.endsWith('__generate_report_pdf'),
    )
    if (hasPdfTool) {
      try {
        const pdfFilename = `report-${reportId}.pdf`
        const pdfPath = path.join(config.paths.pdfs, pdfFilename)
        await generatePdf(report as AccidentReport, pdfPath)
        updateReportPdfPath(reportId, path.join('pdfs', pdfFilename))
        log.info(`PDF 已生成 — ${pdfFilename}`)
      } catch (err) {
        log.error('PDF 生成失败（报告仍可使用）', err instanceof Error ? err.message : String(err))
      }
    } else {
      log.info('PDF 未生成 — report agent 未绑定 generate_report_pdf 工具')
    }

    yield { type: 'done', reportId, report }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('流水线异常', message)
    yield { type: 'error', message }
  }
}
