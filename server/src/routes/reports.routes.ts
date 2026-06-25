import { Router } from 'express'
import { createLogger } from '../utils/logger'
import { getReport, listReports } from '../db/reports.repo'

const log = createLogger('route:reports')
const router = Router()

router.get('/', (_req, res) => {
  const reports = listReports()
  log.info(`GET / — ${reports.length} 条报告`)
  res.json(reports)
})

router.get('/:id', (req, res) => {
  log.info(`GET /${req.params.id}`)
  const report = getReport(req.params.id)
  if (!report) {
    log.warn(`GET /${req.params.id} — 未找到`)
    res.status(404).json({ error: 'report not found' })
    return
  }
  log.debug(`GET /${req.params.id} — 已返回`)
  res.json(report)
})

export default router
