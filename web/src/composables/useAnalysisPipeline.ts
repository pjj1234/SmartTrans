import { reactive, ref } from 'vue'
import type { UploadUserFile } from 'element-plus'
import { ElMessage } from 'element-plus'
import { analyze, type StageEvent } from '@/api/client'
import { compressImage } from '@/utils/compressImage'
import type { AgentStep, AccidentReportView } from '@/types'

export interface StepDef {
  key: string
  label: string
}

const DEFAULT_STEPS: StepDef[] = [
  { key: 'vision', label: '图像识别智能体' },
  { key: 'severity', label: '严重程度评估智能体' },
  { key: 'liability', label: '责任判定智能体' },
  { key: 'report', label: '报告生成智能体' },
]

export function useAnalysisPipeline(stepDefs: StepDef[] = DEFAULT_STEPS) {
  const fileList = ref<UploadUserFile[]>([])
  const description = ref('')
  const running = ref(false)
  const errorMsg = ref('')
  const finalReport = ref<AccidentReportView | null>(null)
  const expandedKey = ref<string | null>(null)

  const steps = reactive<AgentStep[]>(
    stepDefs.map((s) => ({ key: s.key, label: s.label, status: 'wait' as const, data: undefined })),
  )

  function resetSteps(): void {
    for (const s of steps) {
      s.status = 'wait'
      s.data = undefined
    }
    finalReport.value = null
    errorMsg.value = ''
  }

  function resetAll(): void {
    resetSteps()
    fileList.value = []
    description.value = ''
    expandedKey.value = null
  }

  function findStep(key?: string): AgentStep | undefined {
    return steps.find((s) => s.key === key)
  }

  async function run(): Promise<void> {
    const rawFiles = fileList.value
      .map((f) => f.raw)
      .filter((f): f is NonNullable<typeof f> => Boolean(f))
    if (rawFiles.length === 0 && !description.value.trim()) {
      ElMessage.warning('请上传事故现场图片或填写文字描述')
      return
    }

    // 自动压缩超过 512KB 的图片
    const files = await Promise.all(rawFiles.map((f) => compressImage(f)))
    resetSteps()
    expandedKey.value = null
    running.value = true
    try {
      await analyze(files, description.value, (ev: StageEvent) => {
        if (ev.type === 'stage_start') {
          const s = findStep(ev.stage)
          if (s) s.status = 'process'
        } else if (ev.type === 'stage_complete') {
          expandedKey.value = ev.stage ?? null
          const s = findStep(ev.stage)
          if (s) {
            s.status = 'finish'
            s.data = ev.data
          }
        } else if (ev.type === 'done') {
          finalReport.value = ev.report as AccidentReportView
        } else if (ev.type === 'error') {
          errorMsg.value = ev.message ?? '分析失败'
          const s = steps.find((x) => x.status === 'process')
          if (s) s.status = 'error'
        }
      })
    } catch (e) {
      errorMsg.value = e instanceof Error ? e.message : String(e)
    } finally {
      running.value = false
    }
  }

  return {
    // state
    fileList,
    description,
    running,
    errorMsg,
    finalReport,
    expandedKey,
    steps,
    // actions
    run,
    resetAll,
  }
}
