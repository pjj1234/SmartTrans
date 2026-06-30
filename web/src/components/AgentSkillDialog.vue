<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getAgentSkillSettings, updateAgentSkillSetting, type AgentSkillSetting } from '@/api/client'

const props = defineProps<{
  visible: boolean
  skillId: string
  skillName: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  updated: []
}>()

const AGENTS = [
  { key: 'vision', label: '图像识别 (Vision)' },
  { key: 'severity', label: '严重程度评估 (Severity)' },
  { key: 'liability', label: '责任判定 (Liability)' },
  { key: 'report', label: '报告生成 (Report)' },
]

const settings = ref<AgentSkillSetting[]>([])
const loading = ref(false)
const saving = ref<string | null>(null)

watch(
  () => props.visible,
  async (v) => {
    if (v && props.skillId) {
      await loadSettings()
    }
  },
)

async function loadSettings() {
  loading.value = true
  try {
    const all = await getAgentSkillSettings()
    settings.value = all.filter((s) => s.skillId === props.skillId)
  } catch {
    ElMessage.error('加载 agent 绑定失败')
  } finally {
    loading.value = false
  }
}

function isEnabled(agentName: string): boolean {
  return settings.value.some((s) => s.agentName === agentName && s.enabled)
}

async function toggle(agentName: string) {
  saving.value = agentName
  try {
    const current = isEnabled(agentName)
    await updateAgentSkillSetting(agentName, props.skillId, !current)
    // 更新本地状态
    const existing = settings.value.find((s) => s.agentName === agentName)
    if (existing) {
      existing.enabled = !current
    } else {
      settings.value.push({ agentName, skillId: props.skillId, enabled: !current })
    }
    ElMessage.success(`${AGENTS.find((a) => a.key === agentName)?.label} — ${!current ? '已启用' : '已禁用'}`)
    emit('updated')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  } finally {
    saving.value = null
  }
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="`配置 Skill — ${skillName}`"
    width="480px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-loading="loading">
      <p style="color: var(--el-text-color-secondary); margin-bottom: 16px">
        选择哪些智能体在分析时使用此 Skill。启用的智能体将把 Skill 指令注入到系统提示词中。
      </p>
      <div v-for="agent in AGENTS" :key="agent.key" class="agent-row">
        <span class="agent-label">{{ agent.label }}</span>
        <el-switch
          :model-value="isEnabled(agent.key)"
          :loading="saving === agent.key"
          @change="toggle(agent.key)"
        />
      </div>
    </div>
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.agent-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.agent-row:last-child {
  border-bottom: none;
}
.agent-label {
  font-size: 14px;
}
</style>
