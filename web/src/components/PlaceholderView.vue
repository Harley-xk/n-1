<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 路由已配置但页面尚未实现的占位组件（业务模块接入期的兜底渲染件）
-->
<template>
  <el-empty :description="`「${title}」页面建设中`" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

// 命名对齐 keep-alive 契约（多标签刷新经 include 名单排除实现强制重建）
defineOptions({ name: 'PlaceholderView' })

const route = useRoute()
const title = computed(() => (route.meta.title as string | undefined) ?? '该')
</script>
