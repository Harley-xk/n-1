<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 字典下拉：按字典类型渲染 el-select（表单 / 搜索字典字段统一组件，$attrs 透传）
-->
<template>
  <el-select
    :model-value="modelValue"
    :placeholder="placeholder"
    :clearable="clearable"
    :loading="!dictStore.isLoaded"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="data in dictStore.getDictDatas(type)"
      :key="data.value"
      :label="data.label"
      :value="data.value"
    />
  </el-select>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useDictStore } from '@/stores/dict'

withDefaults(
  defineProps<{
    /** 字典类型（如 common_status） */
    type: string
    /** 选中取值（v-model；字典 value 统一字符串形态） */
    modelValue?: string | number | null
    /** 占位提示 */
    placeholder?: string
    /** 可清空 */
    clearable?: boolean
  }>(),
  {
    modelValue: undefined,
    placeholder: '请选择',
    clearable: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number | undefined]
}>()

const dictStore = useDictStore()

onMounted(() => {
  dictStore.ensureLoaded()
})
</script>
