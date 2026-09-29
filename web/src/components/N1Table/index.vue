<!--
  作者: Harley-xk
  创建: 2026-09-29

  描述: 列表表格统一封装（基于 vxe-table）：声明式列配置 + 单元格插槽桥接 + 列宽/列序按路由持久化
  设计依据 docs/前端/表格组件设计.md——列宽与列序拖拽默认开启，其余属性经 attrs 透传 vxe-table
-->
<template>
  <vxe-table
    ref="tableRef"
    v-bind="tableProps"
    :data="data"
    :loading="!!loading"
    @column-resizable-change="persistColumnState"
    @column-dragend="persistColumnState"
  >
    <vxe-column v-for="col in renderColumns" :key="col.field" v-bind="colAttrs(col)">
      <template v-if="col.slot" #default="{ row }">
        <slot :name="col.slot" :row="row" />
      </template>
    </vxe-column>

    <template #empty>
      <el-empty description="暂无数据" :image-size="60" />
    </template>
  </vxe-table>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import { useRoute } from 'vue-router'
import type { VxeTablePropTypes } from 'vxe-table'

import { applyColumnState, loadColumnState, saveColumnState } from './column-persist'
import type { N1TableColumn } from './types'

// 命名对齐目录名（业务页手动 import）
defineOptions({ name: 'N1Table' })

const props = defineProps<{
  /** 列定义（field 必填且唯一，持久化与拖拽的列标识） */
  columns: N1TableColumn[]
  /** 行数据 */
  data: unknown[]
  /** 加载中遮罩 */
  loading?: boolean
  /** 持久化视图 key，默认取当前路由 name（抽屉等非页面级表格显式指定，如 'SystemDict:data'） */
  persistKey?: string
}>()

const attrs = useAttrs()
const route = useRoute()

const tableRef = ref<{
  getColumns: () => { field?: string, resizeWidth?: number }[]
}>()

/** 持久化视图 key：显式指定优先，否则路由 name（PascalCase，与 keep-alive 缓存键同源） */
const viewKey = computed(() => props.persistKey ?? (typeof route.name === 'string' ? route.name : ''))

/**
 * 表格绑定属性：内置默认（列宽/列序拖拽开启、hover、斑马纹、溢出 tooltip）+ 页面透传合并
 * 对象型默认与透传值做浅合并，页面可增量覆盖单项而无需重写全量
 */
const tableProps = computed(() => {
  const {
    'column-config': userColumnConfig,
    'row-config': userRowConfig,
    'column-drag-config': userColumnDragConfig,
    'cell-config': userCellConfig,
    stripe: userStripe,
    'show-overflow': userShowOverflow,
    ...rest
  } = attrs
  return {
    ...rest,
    columnConfig: { useKey: true, resizable: true, drag: true, ...(userColumnConfig as object) },
    rowConfig: { useKey: true, isHover: true, ...(userRowConfig as object) },
    // 列拖拽须 showIcon 渲染表头把手（mousedown 激活 th draggable 后方可原生拖动），默认开启
    columnDragConfig: { showIcon: true, ...(userColumnDragConfig as object) },
    // vxe 4.22 默认单元格 padding 为 0（内容贴边），显式开启四边留白
    cellConfig: { padding: true, ...(userCellConfig as object) },
    stripe: (userStripe as boolean | undefined) ?? true,
    showOverflow: (userShowOverflow as VxeTablePropTypes.ShowOverflow | undefined) ?? 'tooltip',
  }
})

/** 挂载前读取一次已持久化的列状态（此后拖拽由 vxe 内部维持，仅事件触发时落盘） */
const persistedState = loadColumnState(viewKey.value)

/** 渲染列：应用持久化状态（order 重排 + width 覆盖）后剔除 slot 标记以外的处理 */
const renderColumns = computed(() => applyColumnState(props.columns, persistedState))

/** slot 为插槽标记而非 vxe-column 属性，剔除避免落到 DOM attribute */
function colAttrs(col: N1TableColumn): Record<string, unknown> {
  const attrs: Record<string, unknown> = { ...col }
  delete attrs.slot
  return attrs
}

/** 列宽 / 列序变化后落盘：事件仅作信号，列状态统一从表格实例读取 */
function persistColumnState(): void {
  if (!viewKey.value) {
    return
  }
  // column-dragend 触发时 vxe 内部列序尚未重排（页面上已变化），延迟到下一宏任务读真实状态
  setTimeout(() => {
    const columns = tableRef.value?.getColumns() ?? []
    if (columns.length === 0) {
      return
    }
    saveColumnState(viewKey.value, columns)
  })
}
</script>
