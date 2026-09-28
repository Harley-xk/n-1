<!--
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 应用根组件：承载路由出口，根级初始化外观状态（主题生效与媒体查询监听，布局外页面同样吃到主题与断点）
-->
<template>
  <router-view />
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'

// 根级初始化：登录页（批次四）等布局外页面同样吃到主题与断点状态
const app = useAppStore()
app.setupMediaQueries()
app.applyTheme()
</script>
