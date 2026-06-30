<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  listSkills,
  createSkill,
  deleteSkill,
  updateSkillEnabled,
  getProviderCapabilities,
  type SkillMeta,
  type ProviderCapabilities,
} from '@/api/client'

defineOptions({ name: 'SkillsView' })

const skills = ref<SkillMeta[]>([])
const loading = ref(false)
const providerCaps = ref<ProviderCapabilities>({ supportsNativeSkills: false })

// 创建 skill 对话框
const createDialogVisible = ref(false)
const createForm = ref({
  skillMd: `---
name: my-skill
description: 技能描述
---

# 技能名称

## 指令
1. 步骤 1
2. 步骤 2
`,
})
const creating = ref(false)
const toggling = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    const [list, caps] = await Promise.all([
      listSkills(),
      getProviderCapabilities().catch(() => ({ supportsNativeSkills: false })),
    ])
    skills.value = list
    providerCaps.value = caps
  } catch (e) {
    ElMessage.error('加载 Skills 失败')
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  creating.value = true
  try {
    await createSkill(createForm.value.skillMd)
    ElMessage.success('Skill 创建成功')
    createDialogVisible.value = false
    createForm.value.skillMd = `---
name: my-skill
description: 技能描述
---

# 技能名称

## 指令
1. 步骤 1
2. 步骤 2
`
    await load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除 Skill「${row.name}」？`, '确认删除', { type: 'warning' })
    await deleteSkill(row.id)
    ElMessage.success('已删除')
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
    ElMessage.success(newVal ? '已启用' : '已禁用')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  } finally {
    toggling.value = null
  }
}

const uploadStatusTag = (s: string) => (s === 'uploaded' ? 'success' : 'info')
const uploadStatusText = (s: string) => (s === 'uploaded' ? '已上传' : s === 'failed' ? '上传失败' : '本地')

onMounted(load)
</script>

<template>
  <div class="skills-view">
    <el-alert
      v-if="!providerCaps.supportsNativeSkills"
      title="当前使用 Prompt 注入模式"
      description="Skills 内容将直接注入到智能体的系统提示词中，兼容所有 AI Provider。"
      type="info"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    />

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>技能管理 (Skills)</span>
          <el-button type="primary" :icon="Plus" @click="createDialogVisible = true">
            新建技能
          </el-button>
        </div>
      </template>

      <el-table :data="skills" v-loading="loading" stripe>
        <el-table-column label="名称" min-width="160">
          <template #default="{ row }">
            {{ row.name }}
            <el-tag v-if="row.isSystem" size="small" type="info" effect="plain" style="margin-left:6px">
              系统
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="260" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="uploadStatusTag(row.uploadStatus)" size="small" effect="light">
              {{ uploadStatusText(row.uploadStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              :loading="toggling === row.id"
              @change="handleToggle(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button v-if="!row.isSystem" size="small" type="danger" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && skills.length === 0" description="暂无 Skills，点击「新建技能」创建">
        <template #description>
          <div style="max-width: 400px; margin: 0 auto; color: var(--el-text-color-secondary)">
            <p>Skills 是可复用的 AI 领域能力包，遵循 SKILL.md 标准格式。</p>
            <p>创建 Skill 后在此启用，然后在分析页面的智能体设置中绑定到具体智能体。</p>
          </div>
        </template>
      </el-empty>
    </el-card>

    <!-- 创建 Skill 对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建技能" width="640px" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="SKILL.md 内容">
          <el-input
            v-model="createForm.skillMd"
            type="textarea"
            :rows="16"
            placeholder="粘贴 SKILL.md 内容，包含 YAML frontmatter (name, description) 和 Markdown 指令"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.skills-view {
  max-width: 1000px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
