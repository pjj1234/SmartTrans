<script setup lang="ts">
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useAnalysisPipeline } from '@/composables/useAnalysisPipeline'
import AgentProgress from '@/components/AgentProgress.vue'

defineOptions({ name: 'AnalyzeView' })

const {
  fileList,
  description,
  running,
  errorMsg,
  finalReport,
  expandedKey,
  steps,
  run,
  resetAll,
} = useAnalysisPipeline()
</script>

<template>
  <div class="analyze">
    <el-row :gutter="20">
      <el-col :xs="24" :md="10">
        <el-card shadow="never">
          <template #header>事故信息录入</template>
          <el-form label-position="top">
            <el-form-item label="事故现场图片">
              <el-upload
                v-model:file-list="fileList"
                list-type="picture-card"
                :auto-upload="false"
                accept="image/*"
                multiple
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
            </el-form-item>
            <el-form-item label="文字描述（可选）">
              <el-input
                v-model="description"
                type="textarea"
                :rows="5"
                placeholder="请描述事故经过、时间、地点、天气、当事方等信息"
              />
            </el-form-item>
            <div class="actions">
              <el-button type="primary" :loading="running" @click="run">开始分析</el-button>
              <el-button v-if="finalReport" :icon="Refresh" @click="resetAll">新分析</el-button>
            </div>
          </el-form>
          <el-alert
            v-if="errorMsg"
            :title="errorMsg"
            type="error"
            show-icon
            :closable="false"
            class="err"
          />
        </el-card>
      </el-col>

      <el-col :xs="24" :md="14">
        <el-card shadow="never" class="pipeline">
          <template #header>多智能体分析流水线</template>
          <AgentProgress v-model:expanded-key="expandedKey" :steps="steps" />
        </el-card>

      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  gap: 10px;
}
.err {
  margin-top: 16px;
}

</style>
