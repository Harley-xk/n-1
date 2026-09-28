<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: login-log 管理占位页（批次五段六实装，路由与权限先行注册）
-->
<template>
  <PlaceholderView />
</template>

<script setup lang="ts">
import PlaceholderView from '@/components/PlaceholderView.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemLoginLog' })
</script>
