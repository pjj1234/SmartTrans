import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.API_BASE ?? 'http://localhost:3000'
const IMG = process.argv[2] ?? process.env.TEST_IMAGE ?? 'C:\\Users\\zhang\\Pictures\\交通事故.jpg'

type Result = { name: string; pass: boolean; info?: string }
const results: Result[] = []
function check(name: string, pass: boolean, info?: string): boolean {
  results.push({ name, pass, info })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${info ? '  -> ' + info : ''}`)
  return pass
}

async function readSSE(
  res: Response,
  onEvent: (e: Record<string, unknown>) => void,
): Promise<void> {
  if (!res.body) throw new Error('no body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data:'))
      if (line) onEvent(JSON.parse(line.slice(5).trim()))
    }
  }
}

async function main(): Promise<void> {
  console.log(`# 后端接口测试  BASE=${BASE}`)
  console.log(`# 测试图片: ${IMG}  存在=${fs.existsSync(IMG)}\n`)

  // 1. health
  try {
    const r = await fetch(`${BASE}/api/health`)
    const j = (await r.json()) as { ok?: boolean }
    check('GET /api/health', r.ok && j.ok === true, JSON.stringify(j))
  } catch (e) {
    check('GET /api/health', false, String(e))
  }

  // 2. knowledge stats
  try {
    const r = await fetch(`${BASE}/api/knowledge`)
    const j = (await r.json()) as { documents: number; chunks: number }
    check('GET /api/knowledge', r.ok && typeof j.chunks === 'number', JSON.stringify(j))
    if (j.chunks === 0) console.log('  ⚠ 知识库为空，建议先运行 npm run rag:ingest')
  } catch (e) {
    check('GET /api/knowledge', false, String(e))
  }

  // 3. knowledge search
  try {
    const r = await fetch(`${BASE}/api/knowledge/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '追尾 责任划分', k: 3 }),
    })
    const j = (await r.json()) as unknown[]
    check('POST /api/knowledge/search', r.ok && Array.isArray(j), `命中 ${j.length} 条`)
  } catch (e) {
    check('POST /api/knowledge/search', false, String(e))
  }

  // 4. reports list (before)
  let beforeCount = 0
  try {
    const r = await fetch(`${BASE}/api/reports`)
    const j = (await r.json()) as unknown[]
    beforeCount = Array.isArray(j) ? j.length : 0
    check('GET /api/reports (before)', r.ok && Array.isArray(j), `现有 ${beforeCount} 条`)
  } catch (e) {
    check('GET /api/reports (before)', false, String(e))
  }

  // 5. analyze (multipart + SSE)  —— 视觉智能体使用真实图片
  let reportId = ''
  let imageName = ''
  try {
    const fd = new FormData()
    if (fs.existsSync(IMG)) {
      const buf = fs.readFileSync(IMG)
      fd.append('images', new Blob([buf], { type: 'image/jpeg' }), path.basename(IMG))
    } else {
      console.log('  ⚠ 测试图片不存在，将仅用文字描述测试分析流程')
    }
    fd.append('description', '两车发生交通事故，请根据现场图片与描述进行识别、严重程度评估、责任判定并生成报告。')

    const r = await fetch(`${BASE}/api/analyze`, { method: 'POST', body: fd })
    const seen = new Set<string>()
    let errMsg = ''
    await readSSE(r, (ev) => {
      if (ev.type === 'stage_start') console.log(`  → ${ev.label} 开始`)
      else if (ev.type === 'stage_complete') {
        seen.add(String(ev.stage))
        console.log(`  ✓ ${ev.label} 完成`)
      } else if (ev.type === 'done') reportId = String(ev.reportId)
      else if (ev.type === 'error') errMsg = String(ev.message)
    })
    const allStages = ['vision', 'severity', 'liability', 'report'].every((s) => seen.has(s))
    check(
      'POST /api/analyze (SSE, 真实图片)',
      r.ok && allStages && !!reportId && !errMsg,
      errMsg ? `error: ${errMsg}` : `reportId=${reportId}`,
    )
  } catch (e) {
    check('POST /api/analyze (SSE, 真实图片)', false, String(e))
  }

  // 6. report detail
  if (reportId) {
    try {
      const r = await fetch(`${BASE}/api/reports/${reportId}`)
      const j = (await r.json()) as {
        report?: { severityLevel?: string }
        imagePaths?: string[]
      }
      imageName = j.imagePaths?.[0] ?? ''
      check(
        'GET /api/reports/:id',
        r.ok && !!j.report,
        `severity=${j.report?.severityLevel}  images=${j.imagePaths?.length ?? 0}`,
      )
    } catch (e) {
      check('GET /api/reports/:id', false, String(e))
    }
  } else {
    check('GET /api/reports/:id', false, '无 reportId，跳过')
  }

  // 7. uploaded image served
  if (imageName) {
    try {
      const r = await fetch(`${BASE}/uploads/${imageName}`)
      check(
        'GET /uploads/:file',
        r.ok && (r.headers.get('content-type') ?? '').startsWith('image/'),
        `${r.status} ${r.headers.get('content-type')}`,
      )
    } catch (e) {
      check('GET /uploads/:file', false, String(e))
    }
  } else {
    check('GET /uploads/:file', false, '无图片文件名，跳过')
  }

  // 8. report 404
  try {
    const r = await fetch(`${BASE}/api/reports/not-exist-id`)
    check('GET /api/reports/:id (404)', r.status === 404, `status=${r.status}`)
  } catch (e) {
    check('GET /api/reports/:id (404)', false, String(e))
  }

  // 9. reports list (after)
  try {
    const r = await fetch(`${BASE}/api/reports`)
    const j = (await r.json()) as unknown[]
    check(
      'GET /api/reports (after)',
      r.ok && Array.isArray(j) && j.length >= beforeCount + (reportId ? 1 : 0),
      `现有 ${j.length} 条`,
    )
  } catch (e) {
    check('GET /api/reports (after)', false, String(e))
  }

  const passed = results.filter((x) => x.pass).length
  console.log(`\n# 结果: ${passed}/${results.length} 通过`)
  process.exit(passed === results.length ? 0 : 1)
}

main()
