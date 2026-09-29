/*
 * 作者: Harley-xk
 * 创建: 2026-09-29
 *
 * 描述: 表格列状态（列宽 / 列序）按视图 key 的 localStorage 持久化纯函数（设计见 docs/前端/表格组件设计.md §4）
 */

import { readLocalJson, writeLocalJson } from '@/utils/storage'

/** localStorage 总 key（对齐 N1_TOKEN / N1_APP / N1_TAGS 命名惯例） */
const STORAGE_KEY = 'N1_TABLE_COLS'

/** 单个视图的列状态 */
export interface TableColumnState {
  /** 列顺序（field 数组，左 → 右） */
  order: string[]
  /** 用户拖拽过的列宽（field → 像素整数） */
  widths: Record<string, number>
}

/** 全量存储形态：viewKey → 列状态 */
type ColumnStore = Record<string, TableColumnState>

/** 表格实例列信息的最小结构（vxe getColumns() 返回项的子集，便于独立单测） */
export interface PersistableColumnInfo {
  field?: string
  /** 用户拖拽后的列宽（未拖拽过的列为 0 / undefined） */
  resizeWidth?: number
}

/** 恢复算法的输入列最小结构 */
export interface OrderableColumn {
  field: string
}

/** 读取指定视图的列状态（无记录或数据损坏返回 null，脏数据顺带清除） */
export function loadColumnState(viewKey: string): TableColumnState | null {
  const store = readLocalJson<ColumnStore>(STORAGE_KEY)
  const state = store?.[viewKey]
  if (!state || !Array.isArray(state.order)) {
    return null
  }
  return {
    order: state.order,
    widths: state.widths ?? {},
  }
}

/**
 * 从表格实例列信息提取并保存列状态
 * 无 field 列跳过；resizeWidth 非正数不记宽（未拖拽过的列保持代码定义的弹性宽度）
 * widths 以既有记录为基底合并本次 resizeWidth——拖列序（无 resizeWidth）不冲掉历史列宽，
 * 本次拖出的新宽度覆盖旧值；已删除列的历史宽度随重建丢弃
 */
export function saveColumnState(viewKey: string, columns: PersistableColumnInfo[]): void {
  const cols = columns.filter(col => typeof col.field === 'string' && col.field !== '')
  if (cols.length === 0) {
    return
  }
  const store = readLocalJson<ColumnStore>(STORAGE_KEY) ?? {}
  const fieldSet = new Set(cols.map(col => col.field!))
  const widths: Record<string, number> = {}
  for (const [field, width] of Object.entries(store[viewKey]?.widths ?? {})) {
    if (fieldSet.has(field) && typeof width === 'number' && width > 0) {
      widths[field] = width
    }
  }
  for (const col of cols) {
    if (typeof col.resizeWidth === 'number' && col.resizeWidth > 0) {
      widths[col.field!] = Math.round(col.resizeWidth)
    }
  }
  store[viewKey] = { order: cols.map(col => col.field!), widths }
  writeLocalJson(STORAGE_KEY, store)
}

/**
 * 将存储状态应用回页面列定义（不修改入参）：
 * 1. order 重排：存储顺序为主；已删除列的字段忽略；代码新增列按原相对顺序追加尾部
 * 2. widths 覆盖：有拖拽记录的列改固定像素宽，其余保持原定义（fixed 等属性始终由代码决定）
 */
export function applyColumnState<T extends OrderableColumn>(columns: T[], state: TableColumnState | null): T[] {
  if (!state || columns.length === 0) {
    return columns
  }
  const fieldSet = new Set(columns.map(col => col.field))
  const storedOrder = state.order.filter(field => fieldSet.has(field))
  const orderedFields = new Set(storedOrder)
  const ordered = storedOrder
    .map(field => columns.find(col => col.field === field)!)
    .concat(columns.filter(col => !orderedFields.has(col.field)))
  return ordered.map((col) => {
    const width = state.widths[col.field]
    return typeof width === 'number' && width > 0 ? { ...col, width: Math.round(width) } : col
  })
}
