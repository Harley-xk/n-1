<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 刷新中转页：进入即原址 replace 返回（配合 refreshingName 缓存排除，实现当前页强制重建，见 docs/前端/布局与风格设计.md §3.5）
-->
<template>
  <div class="n1-redirect" />
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 挂载即回跳原址（path 经 catch-all 参数带回，query 原样透传）
const targetPath = Array.isArray(route.params.path)
  ? route.params.path.join('/')
  : (route.params.path ?? '')
router.replace({ path: `/${targetPath}`, query: route.query })
</script>

<style scoped>
.n1-redirect {
  height: 100%;
}
</style>
