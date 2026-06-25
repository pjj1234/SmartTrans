<script setup lang="ts">
import { computed } from 'vue'
import type { SeverityAssessment } from '@/types'

const props = defineProps<{ data: SeverityAssessment }>()

const levelConfig = computed(() => {
  const map: Record<string, { text: string; type: 'success' | 'warning' | 'danger' }> = {
    minor: { text: '轻微', type: 'success' },
    moderate: { text: '一般', type: 'warning' },
    severe: { text: '严重', type: 'danger' },
  }
  return map[props.data.level] ?? { text: '未知', type: 'danger' as const }
})

const confidencePercent = computed(() => Math.round(props.data.confidence * 100))
</script>

<template>
  <div class="severity-card">
    <!-- 严重等级 + 置信度 -->
    <div class="level-row">
      <div class="level-tag">
        <span class="level-label">严重等级</span>
        <el-tag :type="levelConfig.type" effect="dark" size="large">
          {{ levelConfig.text }}
        </el-tag>
      </div>
      <div class="confidence">
        <span class="level-label">置信度</span>
        <el-progress
          :percentage="confidencePercent"
          :color="levelConfig.type === 'danger' ? '#f56c6c' : levelConfig.type === 'warning' ? '#e6a23c' : '#67c23a'"
          :stroke-width="16"
        />
      </div>
    </div>

    <!-- 评估详情 -->
    <div class="section">
      <h4 class="section-title">📋 详细评估</h4>
      <el-descriptions :column="1" size="small" border>
        <el-descriptions-item label="人员伤亡风险">
          {{ data.injuryRisk || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="财产损失评估">
          {{ data.propertyDamage || '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 评估依据 -->
    <div class="section">
      <h4 class="section-title">📝 评估依据</h4>
      <p class="reasoning-text">{{ data.reasoning || '-' }}</p>
    </div>
  </div>
</template>

<style scoped>
.severity-card {
  padding: 12px 14px;
  background: var(--el-bg-color);
}
.level-row {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.level-tag {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.level-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.confidence {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.section {
  margin-bottom: 14px;
}
.section:last-child {
  margin-bottom: 0;
}
.section-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.reasoning-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}
</style>
