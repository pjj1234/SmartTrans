<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import {
  listSkills,
  createSkill,
  deleteSkill,
  updateSkillEnabled,
  getProviderCapabilities,
  getAgentSkillSettings,
  getSkill,
  type SkillMeta,
  type ProviderCapabilities,
  type AgentSkillSetting,
} from '@/api/client'

defineOptions({ name: 'SkillsView' })

const { t } = useI18n()

const skills = ref<SkillMeta[]>([])
const loading = ref(false)
const providerCaps = ref<ProviderCapabilities>({ supportsNativeSkills: false })
const agentSettings = ref<AgentSkillSetting[]>([])

// Create skill dialog
const createDialogVisible = ref(false)
const createForm = ref({
  skillMd: `---
name: my-skill
description: ${t('skills.description')}
---

# Skill Name

## Instructions
1. Step 1
2. Step 2
`,
})
const creating = ref(false)
const toggling = ref<string | null>(null)

const md = new MarkdownIt()

// View dialog state
const viewDialogVisible = ref(false)
const viewSkillName = ref('')
const viewContent = ref('')
const viewLoading = ref(false)
const showRendered = ref(false)

function renderedHtml(): string {
  try {
    return md.render(viewContent.value)
  } catch {
    return '<p style="color:red">Markdown render error</p>'
  }
}

async function load() {
  loading.value = true
  try {
    const [list, caps, settings] = await Promise.all([
      listSkills(),
      getProviderCapabilities().catch(() => ({ supportsNativeSkills: false })),
      getAgentSkillSettings(),
    ])
    skills.value = list
    providerCaps.value = caps
    agentSettings.value = settings
  } catch {
    ElMessage.error(t('skills.loadFail'))
  } finally {
    loading.value = false
  }
}

/** Get i18n agent labels bound to a skill */
function getBoundAgentLabels(skillId: string): string[] {
  return agentSettings.value
    .filter((s) => s.skillId === skillId && s.enabled)
    .map((s) => t(`agent.${s.agentName}.label`) ?? s.agentName)
}

async function handleView(skillId: string, skillName: string) {
  viewSkillName.value = skillName
  viewDialogVisible.value = true
  viewLoading.value = true
  try {
    const skill = await getSkill(skillId)
    viewContent.value = skill.parsed.instructions
  } catch {
    viewContent.value = t('skills.loadFail')
  } finally {
    viewLoading.value = false
  }
}

async function handleCreate() {
  creating.value = true
  try {
    await createSkill(createForm.value.skillMd)
    ElMessage.success(t('skills.createSuccess'))
    createDialogVisible.value = false
    createForm.value.skillMd = `---
name: my-skill
description: ${t('skills.description')}
---

# Skill Name

## Instructions
1. Step 1
2. Step 2
`
    await load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : t('skills.createFail'))
  } finally {
    creating.value = false
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(
      t('skills.deleteConfirm', { name: row.name }),
      t('mcp.confirmTitle'),
      { type: 'warning' },
    )
    await deleteSkill(row.id)
    ElMessage.success(t('skills.deleted'))
    await load()
  } catch {
    // cancelled
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleToggle(row: any) {
  const id = row.id as string
  const newVal = !row.enabled
  toggling.value = id
  try {
    await updateSkillEnabled(id, newVal)
    row.enabled = newVal
    ElMessage.success(newVal ? t('skills.enabledStatus') : t('skills.disabledStatus'))
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : t('skills.toggleFail'))
  } finally {
    toggling.value = null
  }
}

const uploadStatusTag = (s: string) => (s === 'uploaded' ? 'success' : 'info')
const uploadStatusText = (s: string): string => {
  const map: Record<string, string> = {
    uploaded: t('skills.uploaded'),
    failed: t('skills.uploadFailed'),
    local: t('skills.local'),
  }
  return map[s] ?? s
}

onMounted(load)
</script>

<template>
  <div class="skills-view">
    <el-alert
      v-if="!providerCaps.supportsNativeSkills"
      :title="t('skills.modeAlert')"
      :description="t('skills.modeAlertDesc')"
      type="info"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    />

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ t('skills.title') }}</span>
          <el-button type="primary" :icon="Plus" @click="createDialogVisible = true">
            {{ t('skills.newSkill') }}
          </el-button>
        </div>
      </template>

      <el-table :data="skills" v-loading="loading" stripe>
        <el-table-column :label="t('skills.name')" min-width="140">
          <template #default="{ row }">
            {{ row.name }}
            <el-tag v-if="row.isSystem" size="small" type="info" effect="plain" style="margin-left:6px">
              {{ t('skills.system') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" :label="t('skills.description')" min-width="240" show-overflow-tooltip />
        <el-table-column :label="t('skills.boundAgents')" width="220">
          <template #default="{ row }">
            <el-tag
              v-for="agent in getBoundAgentLabels(row.id)"
              :key="agent"
              size="small"
              type="success"
              effect="plain"
              style="margin-right: 4px"
            >
              {{ agent }}
            </el-tag>
            <span v-if="getBoundAgentLabels(row.id).length === 0" class="no-bindings">—</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('skills.enabled')" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              :loading="toggling === row.id"
              @change="handleToggle(row)"
            />
          </template>
        </el-table-column>
        <el-table-column :label="t('skills.actions')" width="140">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="handleView(row.id, row.name)">
              {{ t('skills.view') }}
            </el-button>
            <el-button v-if="!row.isSystem" size="small" text type="danger" @click="handleDelete(row)">
              {{ t('skills.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && skills.length === 0" :description="t('skills.noSkills')">
        <template #description>
          <div style="max-width: 400px; margin: 0 auto; color: var(--el-text-color-secondary)">
            <p>{{ t('skills.noSkillsHint1') }}</p>
            <p>{{ t('skills.noSkillsHint2') }}</p>
          </div>
        </template>
      </el-empty>
    </el-card>

    <!-- View Skill dialog -->
    <el-dialog v-model="viewDialogVisible" :title="viewSkillName" width="780px" destroy-on-close @open="showRendered = true">
      <div class="view-toolbar">
        <el-radio-group v-model="showRendered" size="small">
          <el-radio-button :value="false">{{ t('skills.raw') }}</el-radio-button>
          <el-radio-button :value="true">{{ t('skills.rendered') }}</el-radio-button>
        </el-radio-group>
      </div>
      <div v-loading="viewLoading" style="min-height: 120px">
        <pre v-if="!showRendered" class="view-content">{{ viewContent }}</pre>
        <div v-else class="view-markdown" v-html="renderedHtml()" />
      </div>
      <template #footer>
        <el-button type="primary" @click="viewDialogVisible = false">{{ t('settings.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- Create Skill dialog -->
    <el-dialog v-model="createDialogVisible" :title="t('skills.createTitle')" width="640px" destroy-on-close>
      <el-form label-position="top">
        <el-form-item :label="t('skills.createLabel')">
          <el-input
            v-model="createForm.skillMd"
            type="textarea"
            :rows="16"
            :placeholder="t('skills.createPlaceholder')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">{{ t('knowledge.cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">{{ t('skills.create') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.skills-view {
  max-width: 1100px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.no-bindings {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}
.view-toolbar {
  margin-bottom: 12px;
}
.view-content {
  margin: 0;
  padding: 14px 18px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 500px;
  overflow: auto;
  color: var(--el-text-color-primary);
}
.view-markdown {
  padding: 14px 18px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  max-height: 500px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-primary);
}
.view-markdown :deep(h1) { font-size: 1.4em; margin: 0.6em 0 0.3em; }
.view-markdown :deep(h2) { font-size: 1.2em; margin: 0.5em 0 0.3em; }
.view-markdown :deep(h3) { font-size: 1.05em; margin: 0.4em 0 0.2em; }
.view-markdown :deep(p) { margin: 0.4em 0; }
.view-markdown :deep(ul), .view-markdown :deep(ol) { padding-left: 1.5em; margin: 0.3em 0; }
.view-markdown :deep(table) { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.view-markdown :deep(th), .view-markdown :deep(td) { border: 1px solid var(--el-border-color); padding: 4px 8px; text-align: left; font-size: 12px; }
.view-markdown :deep(th) { background: var(--el-fill-color); font-weight: 600; }
.view-markdown :deep(code) { background: var(--el-fill-color); padding: 1px 4px; border-radius: 3px; font-size: 12px; }
.view-markdown :deep(pre) { background: var(--el-bg-color); padding: 10px 14px; border-radius: 6px; overflow: auto; font-size: 12px; }
.view-markdown :deep(blockquote) { border-left: 3px solid var(--el-color-primary-light-3); padding-left: 12px; margin: 0.5em 0; color: var(--el-text-color-secondary); }
</style>
