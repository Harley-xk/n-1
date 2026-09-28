<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 槽位渲染器：优先渲染业务注册的覆盖组件，未注册回退布局默认组件（都无则不渲染）
-->
<template>
  <component :is="resolved" v-if="resolved" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'

import type { SlotKey } from './keys'
import { getComponentOverride } from './registry'

const props = defineProps<{
  /** 槽位 key */
  name: SlotKey
  /** 框架默认组件（业务未覆盖时的兜底） */
  fallback?: Component
}>()

const resolved = computed<Component | undefined>(
  () => getComponentOverride(props.name) ?? props.fallback,
)
</script>
