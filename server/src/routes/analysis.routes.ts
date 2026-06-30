import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import { createLogger } from '../utils/logger'
import { runPipeline, type SkillSelection } from '../agents/orchestrator'
import { upload } from '../middleware/upload'

const log = createLogger('route:analysis')
const router = Router()

router.post('/analyze', upload.array('images', 6), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  const description = typeof req.body?.description === 'string' ? req.body.description : ''
  const images = files.map((f) => fs.readFileSync(f.path))
  const imagePaths = files.map((f) => path.basename(f.path))

  // 解析 skill 选择
  let skillSelections: SkillSelection[] | undefined
  if (req.body?.skillSelections) {
    try {
      skillSelections = typeof req.body.skillSelections === 'string'
        ? JSON.parse(req.body.skillSelections)
        : req.body.skillSelections
    } catch {
      log.warn('skillSelections 解析失败，忽略')
    }
  }

  log.info(`POST /analyze — 图片 ${files.length} 张, 描述: "${description.slice(0, 80)}", skills: ${skillSelections?.length ?? 0}`)

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  for await (const ev of runPipeline(images, imagePaths, description, skillSelections)) {
    if (ev.type === 'error') {
      log.error('流水线错误', ev.message)
    }
    send(ev)
  }
  res.end()
  log.info('POST /analyze — SSE 流结束')
})

export default router
