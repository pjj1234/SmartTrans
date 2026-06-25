<script setup lang="ts">
import { computed } from 'vue'
import type { AccidentReportView } from '@/types'

const props = defineProps<{ report: AccidentReportView; images?: string[] }>()

const levelMap: Record<string, { text: string; type: 'success' | 'warning' | 'danger' | 'info' }> =
  {
    minor: { text: '轻微', type: 'success' },
    moderate: { text: '一般', type: 'warning' },
    severe: { text: '严重', type: 'danger' },
  }

const level = computed(
  () => levelMap[props.report.severityLevel ?? ''] ?? { text: '未知', type: 'info' as const },
)
</script>

<template>
  <el-card shadow="never" class="report-card">
    <template #header>
      <div class="report-header">
        <span class="report-title">{{ report.title || '交通事故分析报告' }}</span>
        <el-tag :type="level.type" effect="dark">严重等级：{{ level.text }}</el-tag>
      </div>
    </template>

    <div v-if="images && images.length" class="report-images">
      <el-image
        v-for="img in images"
        :key="img"
        :src="`/uploads/${img}`"
        :preview-src-list="images.map((i) => `/uploads/${i}`)"
        fit="cover"
        class="thumb"
      />
    </div>

    <el-descriptions :column="1" border class="report-desc">
      <el-descriptions-item label="事故概要">{{ report.summary || '-' }}</el-descriptions-item>
      <el-descriptions-item label="现场情况">{{ report.sceneSummary || '-' }}</el-descriptions-item>
      <el-descriptions-item label="责任认定">
        {{ report.liabilityConclusion || '-' }}
      </el-descriptions-item>
    </el-descriptions>

    <div v-if="report.citedArticles?.length" class="report-section">
      <h4>引用法条</h4>
      <el-tag
        v-for="(a, i) in report.citedArticles"
        :key="i"
        type="info"
        effect="plain"
        class="article-tag"
      >
        {{ a }}
      </el-tag>
    </div>

    <div v-if="report.recommendations?.length" class="report-section">
      <h4>处理建议</h4>
      <ul class="rec-list">
        <li v-for="(r, i) in report.recommendations" :key="i">{{ r }}</li>
      </ul>
    </div>
  </el-card>
</template>

<style scoped>
.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.report-title {
  font-size: 16px;
  font-weight: 700;
}
.report-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.thumb {
  width: 96px;
  height: 96px;
  border-radius: 6px;
}
.report-section {
  margin-top: 16px;
}
.report-section h4 {
  margin: 0 0 8px;
}
.article-tag {
  margin: 0 8px 8px 0;
}
.rec-list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
}
</style>
