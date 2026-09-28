<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 字典标签：按字典类型 + 取值渲染彩色 el-tag（表格字典列统一组件，boolean 值直传天然命中）
-->
<template>
  <el-tag :type="tagType">
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useDictStore } from '@/stores/dict'

const props = defineProps<{
  /** 字典类型（如 common_status） */
  type: string
  /** 字典取值（string / number / boolean；boolean 直传经 String() 命中 'true' / 'false' 种子值） */
  value: string | number | boolean | null | undefined
}>()

const dictStore = useDictStore()

const label = computed(() => dictStore.getDictLabel(props.type, props.value))

/** 字典色缺失时兜底 info（与 common_status 的 success / danger 形成完整色系） */
const tagType = computed(() => dictStore.getDictColorType(props.type, props.value) ?? 'info')
</script>
