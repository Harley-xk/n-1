<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 多标签粒度演示页：以不同 query 打开同一路由，验证「fullPath 一签」——同 path 不同 query 分立页签（批次六由正式样板模块吸收）
-->
<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <span>多标签粒度演示</span>
      </template>
      <p class="demo-line">
        页签粒度为 fullPath（path + query）：同一页面带不同参数打开时，会分立为多个页签，互不覆盖。
      </p>
      <el-descriptions :column="1" border class="demo-desc">
        <el-descriptions-item label="当前 tab 参数">
          {{ route.query.tab ?? '（空）' }}
        </el-descriptions-item>
        <el-descriptions-item label="当前 fullPath">
          {{ route.fullPath }}
        </el-descriptions-item>
      </el-descriptions>
      <div class="demo-actions">
        <el-button
          v-for="n in 3"
          :key="n"
          type="primary"
          @click="router.push({ path: '/demo/tabs', query: { tab: String(n) } })"
        >
          打开 tab={{ n }}
        </el-button>
      </div>
      <p class="demo-tip">
        点击按钮分别打开 tab=1 / 2 / 3 的页签；在页签上右键可批量关闭（关闭其他 / 左侧 / 右侧 / 全部）。
      </p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

defineOptions({ name: 'DemoTabs' })

const route = useRoute()
const router = useRouter()
</script>

<style scoped>
.demo-line {
  margin: 0 0 12px;
}

.demo-desc {
  margin-bottom: 16px;
}

.demo-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.demo-tip {
  margin: 0;
  color: var(--n1-text-3);
  font-size: 13px;
}
</style>
