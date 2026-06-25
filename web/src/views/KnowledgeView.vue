<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, UploadFilled } from '@element-plus/icons-vue'
import {
  knowledgeStats,
  searchKnowledge,
  uploadKnowledgeFileWithProgress,
  listKnowledgeDocuments,
  deleteKnowledgeDocument,
} from '@/api/client'
import type { KnowledgeStats, LegalChunk, UploadedDocument } from '@/api/client'

const ALLOWED_EXT = ['md', 'txt', 'markdown']

const stats = ref<KnowledgeStats>({ documents: 0, chunks: 0 })
const documents = ref<UploadedDocument[]>([])
const query = ref('')
const results = ref<LegalChunk[]>([])
const searching = ref(false)

// ---- 上传对话框 ----
const dialogVisible = ref(false)
const dialogFile = ref<File | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function loadAll(): Promise<void> {
  try {
    const [s, docs] = await Promise.all([knowledgeStats(), listKnowledgeDocuments()])
    stats.value = s
    documents.value = docs
  } catch {
    /* ignore */
  }
}

function acceptFile(file: File): void {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXT.includes(ext)) {
    ElMessage.error('仅支持 .md 和 .txt 文件')
    return
  }
  dialogFile.value = file
}

/** 点击拖拽区域 → 打开文件选择器 */
function onDropZoneClick(): void {
  fileInput.value?.click()
}

/** 文件选择器 change 事件 */
function onInputChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) acceptFile(file)
  input.value = '' // reset so same file re-select works
}

/** 拖拽进入 */
function onDragEnter(e: DragEvent): void {
  e.preventDefault()
  dragOver.value = true
}

/** 拖拽悬停 */
function onDragOver(e: DragEvent): void {
  e.preventDefault()
}

/** 拖拽离开 */
function onDragLeave(): void {
  dragOver.value = false
}

/** 拖拽放下 */
function onDrop(e: DragEvent): void {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) acceptFile(file)
}

function openDialog(): void {
  dialogFile.value = null
  uploadProgress.value = 0
  dragOver.value = false
  dialogVisible.value = true
}

async function doUpload(): Promise<void> {
  if (!dialogFile.value) return
  uploading.value = true
  uploadProgress.value = 0
  try {
    await uploadKnowledgeFileWithProgress(dialogFile.value, (pct) => {
      uploadProgress.value = pct
    })
    ElMessage.success(`"${dialogFile.value.name}" 上传成功`)
    dialogVisible.value = false
    await loadAll()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '上传失败')
  } finally {
    uploading.value = false
  }
}

async function onDelete(id: number, title: string): Promise<void> {
  try {
    await deleteKnowledgeDocument(id)
    ElMessage.success('已删除')
    await loadAll()
  } catch {
    /* cancelled */
  }
}

async function doSearch(): Promise<void> {
  if (!query.value.trim()) {
    ElMessage.warning('请输入检索内容')
    return
  }
  searching.value = true
  try {
    results.value = await searchKnowledge(query.value)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '检索失败')
  } finally {
    searching.value = false
  }
}

onMounted(loadAll)
</script>

<template>
  <div class="knowledge">
    <!-- 统计区 -->
    <el-card shadow="never">
      <template #header>法规知识库（RAG）</template>
      <el-descriptions :column="2" border class="stats">
        <el-descriptions-item label="文档数">{{ stats.documents }}</el-descriptions-item>
        <el-descriptions-item label="分块数">{{ stats.chunks }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 文档管理区 -->
    <el-card shadow="never" class="section">
      <template #header>
        <div class="card-head">
          <span>文档管理</span>
          <el-button type="primary" :icon="Plus" @click="openDialog">添加新文档</el-button>
        </div>
      </template>
      <el-alert
        v-if="documents.length === 0"
        type="info"
        :closable="false"
        show-icon
        title="暂无文档，请上传 .md 或 .txt 文件构建知识库"
      />
      <el-table v-if="documents.length" :data="documents" stripe>
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="category" label="类别" width="80" />
        <el-table-column prop="chunkCount" label="分块数" width="90" align="center" />
        <el-table-column prop="createdAt" label="上传时间" width="170" />
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-popconfirm
              :title="`确认删除「${row.title}」？`"
              confirm-button-text="删除"
              cancel-button-text="取消"
              @confirm="onDelete(row.id, row.title)"
            >
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 检索区 -->
    <el-card shadow="never" class="section">
      <template #header>语义检索</template>
      <div class="search">
        <el-input
          v-model="query"
          placeholder="输入检索内容，例如：追尾 责任划分"
          @keyup.enter="doSearch"
        >
          <template #append>
            <el-button :loading="searching" @click="doSearch">检索</el-button>
          </template>
        </el-input>
      </div>
      <div v-if="results.length" class="results">
        <el-card v-for="item in results" :key="item.id" shadow="never" class="result-item">
          <div class="result-head">
            <span class="result-source">《{{ item.source }}》{{ item.articleNo ?? '' }}</span>
            <el-tag size="small" type="info">distance {{ item.distance.toFixed(4) }}</el-tag>
          </div>
          <p class="result-content">{{ item.content }}</p>
        </el-card>
      </div>
    </el-card>

    <!-- 添加新文档对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="添加新文档"
      width="480px"
      :close-on-click-modal="false"
    >
      <div class="dialog-body">
        <!-- 拖拽 / 点击上传区域 -->
        <div
          class="drop-zone"
          :class="{ 'drop-active': dragOver, 'has-file': !!dialogFile }"
          @click="onDropZoneClick"
          @dragenter="onDragEnter"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".md,.txt,.markdown"
            style="display: none"
            @change="onInputChange"
          />
          <el-icon class="drop-icon" :size="36"><UploadFilled /></el-icon>
          <div class="drop-text" v-if="!dialogFile">
            <em>拖拽文件到此处</em> 或 <em>点击选择</em>
            <p class="drop-hint">支持 .md / .txt 文件</p>
          </div>
          <div class="drop-text" v-else>
            <span class="file-name">{{ dialogFile.name }}</span>
            <p class="drop-hint">点击重新选择</p>
          </div>
        </div>

        <div v-if="uploading" class="progress-wrap">
          <span class="progress-label">正在上传并处理...</span>
          <el-progress :percentage="uploadProgress" :stroke-width="12" />
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false" :disabled="uploading">取消</el-button>
        <el-button type="primary" :loading="uploading" :disabled="!dialogFile" @click="doUpload">
          上传
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.section {
  margin-top: 16px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---- 拖拽区域 ---- */
.drop-zone {
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 32px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.25s, background 0.25s;
  user-select: none;
}
.drop-zone:hover,
.drop-zone.drop-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.drop-zone.has-file {
  border-style: solid;
  border-color: var(--el-color-primary-light-3);
  background: var(--el-color-primary-light-9);
}
.drop-icon {
  color: var(--el-color-primary);
  margin-bottom: 8px;
}
.drop-text {
  font-size: 14px;
  color: var(--el-text-color-regular);
}
.drop-text .file-name {
  font-weight: 600;
  color: var(--el-color-primary);
  word-break: break-all;
}
.drop-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* ---- 进度条 ---- */
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}
.progress-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
.progress-wrap :deep(.el-progress) {
  flex: 1;
}

/* ---- 检索 ---- */
.search {
  margin-top: 8px;
}
.results {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.result-source {
  font-weight: 600;
}
.result-content {
  margin: 8px 0 0;
  white-space: pre-wrap;
  color: var(--el-text-color-regular);
}
</style>
