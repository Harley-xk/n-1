<!--
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 首页视图：项目介绍与两组示例卡片（Pinia 状态管理、后端连通性检查），进入主布局内容卡片（el-card 自动扁平化）
-->
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref } from 'vue'

import { http } from '@/api/http'
import { useCounterStore } from '@/stores/counter'

defineOptions({ name: 'Home' })

const counter = useCounterStore()

type HealthStatus = 'pending' | 'ok' | 'error'

const healthStatus = ref<HealthStatus>('pending')
const checking = ref(false)

/** 调用后端健康检查接口，验证前后端链路是否打通 */
async function checkHealth() {
  checking.value = true
  try {
    const { data } = await http.get<{ status: string }>('/health')
    healthStatus.value = data.status === 'ok' ? 'ok' : 'error'
    ElMessage.success(`后端服务正常：${data.status}`)
  }
  catch {
    healthStatus.value = 'error'
    ElMessage.error('后端服务不可用，请确认 server 已启动（pnpm dev:server）')
  }
  finally {
    checking.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <header class="home__header">
      <h1 class="home__title">
        n-1
      </h1>
      <p class="home__subtitle">
        企业级全栈项目框架底座 · vibe coding first
      </p>
    </header>

    <el-row :gutter="20">
      <el-col
        :xs="24"
        :md="12"
      >
        <el-card shadow="hover">
          <template #header>
            <span>Pinia 状态管理示例</span>
          </template>
          <p class="demo-value">
            count = {{ counter.count }}，doubleCount = {{ counter.doubleCount }}
          </p>
          <el-button
            type="primary"
            @click="counter.increment()"
          >
            increment
          </el-button>
        </el-card>
      </el-col>

      <el-col
        :xs="24"
        :md="12"
      >
        <el-card shadow="hover">
          <template #header>
            <span>后端连通性检查</span>
          </template>
          <p class="demo-value">
            状态：
            <el-tag
              :type="healthStatus === 'ok' ? 'success' : healthStatus === 'error' ? 'danger' : 'info'"
            >
              {{ healthStatus === 'ok' ? '正常' : healthStatus === 'error' ? '异常' : '未检查' }}
            </el-tag>
          </p>
          <el-button
            type="primary"
            :loading="checking"
            @click="checkHealth"
          >
            检查 /api/health
          </el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.home__header {
  margin-bottom: 16px;
}

.home__title {
  margin: 0;
  font-size: 24px;
  color: var(--n1-text-1);
}

.home__subtitle {
  margin: 8px 0 0;
  color: var(--n1-text-3);
  font-size: 14px;
}

.demo-value {
  margin: 0 0 16px;
  font-size: 15px;
}
</style>
