/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 展示格式化工具：毫秒时间戳转日期时间文案
 */

/** 毫秒时间戳 → yyyy-MM-dd HH:mm:ss（空值返回占位符） */
export function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp) {
    return '-'
  }
  const date = new Date(timestamp)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/** Element Plus 表格时间列通用 formatter（cellValue 为毫秒时间戳，签名适配 el-table-column :formatter） */
export function dateTimeColumnFormatter(
  _row: unknown,
  _column: unknown,
  cellValue: number | null | undefined,
): string {
  return formatDateTime(cellValue)
}
