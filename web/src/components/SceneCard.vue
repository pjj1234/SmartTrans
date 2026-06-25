<script setup lang="ts">
import type { SceneDescription } from '@/types'

const props = defineProps<{ data: SceneDescription }>()

const columns = [
  { key: 'type', label: '类型', width: '100' },
  { key: 'color', label: '颜色', width: '80' },
  { key: 'position', label: '位置', width: '120' },
  { key: 'visibleDamage', label: '可见损伤', minWidth: '140' },
]
</script>

<template>
  <div class="scene-card">
    <!-- 车辆/交通参与者 -->
    <div class="section">
      <h4 class="section-title">🚗 交通参与者</h4>
      <el-table
        v-if="data.vehicles?.length"
        :data="data.vehicles"
        size="small"
        border
        stripe
        class="scene-table"
      >
        <el-table-column
          v-for="col in columns"
          :key="col.key"
          :prop="col.key"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
        />
      </el-table>
      <el-empty v-else description="未识别到交通参与者" :image-size="48" />
    </div>

    <!-- 环境信息 -->
    <div class="section">
      <h4 class="section-title">🌤 环境信息</h4>
      <el-descriptions :column="1" size="small" border class="env-desc">
        <el-descriptions-item label="路面状况">
          {{ data.roadCondition || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="天气/光照">
          {{ data.weather || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="交通信号/标志">
          {{ data.trafficSignals || '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 现场总结 -->
    <div class="section">
      <h4 class="section-title">📋 现场总结</h4>
      <p class="summary-text">{{ data.sceneSummary || '-' }}</p>
    </div>
  </div>
</template>

<style scoped>
.scene-card {
  padding: 12px 14px;
  background: var(--el-bg-color);
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
.scene-table {
  width: 100%;
}
.env-desc {
  font-size: 12px;
}
.summary-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}
</style>
