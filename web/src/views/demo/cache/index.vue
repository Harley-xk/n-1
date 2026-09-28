<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: keep-alive 缓存演示页：计数器与挂载时间验证「缓存跟随页签」——切签保留、关签 / 刷新重建（批次六由正式样板模块吸收）
-->
<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <span>keep-alive 缓存演示</span>
      </template>
      <p class="demo-line">
        本页路由 meta.keepAlive = true，组件 name 与路由 name 同为 DemoCache。
      </p>
      <el-descriptions :column="1" border class="demo-desc">
        <el-descriptions-item label="当前计数">
          <el-tag type="primary">
            {{ count }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="挂载时间">
          {{ mountedAt }}
        </el-descriptions-item>
      </el-descriptions>
      <p class="demo-tip">
        切换其他页签再回来：计数与挂载时间不变（实例被缓存）；关闭本页签再打开、或右键「刷新页签」：计数归零、挂载时间更新（实例重建）。
      </p>
      <el-button type="primary" @click="count += 1">
        计数 +1
      </el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'DemoCache' })

const count = ref(0)

/** 挂载时间：实例重建即刷新（缓存保留期间不变） */
const mountedAt = formatDateTime(Date.now())
</script>

<style scoped>
.demo-line {
  margin: 0 0 12px;
}

.demo-desc {
  margin-bottom: 12px;
}

.demo-tip {
  margin: 0 0 16px;
  color: var(--n1-text-3);
  font-size: 13px;
}
</style>
