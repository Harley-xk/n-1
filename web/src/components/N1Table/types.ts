/*
 * 作者: Harley-xk
 * 创建: 2026-09-29
 *
 * 描述: N1Table 列定义类型——vxe-column 属性的声明式子集 + 插槽标记（设计见 docs/前端/表格组件设计.md §3.3）
 */

import type { VxeColumnPropTypes } from 'vxe-table'

/**
 * N1Table 列定义
 * field 必填且页面内唯一（持久化与拖拽的列标识）；其余属性原样透传 vxe-column
 */
export interface N1TableColumn {
  /** 列标识（纯操作列统一 'action'） */
  field: string
  title?: string
  width?: number | string
  minWidth?: number | string
  fixed?: 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  /** 内容溢出处理，默认走表格级 show-overflow */
  showOverflow?: boolean | 'tooltip' | 'ellipsis' | 'title'
  /** 单元格显示格式化（如时间列 dateTimeFormatter），签名同 vxe formatter */
  formatter?: VxeColumnPropTypes.Formatter
  /** 自定义单元格插槽名（模板参数解构 { row }） */
  slot?: string
  /** 其余 vxe-column 属性透传（sortable / type 等） */
  [key: string]: unknown
}
