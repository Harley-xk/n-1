/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 操作日志接口封装：分页查询与单条删除（异步入库，写入由 @OperateLog 拦截器承担）
 */
import type { PageParam, PageResult } from '@/api/http'
import { http } from '@/api/http'

/** 操作日志信息（后端 OperateLogVo；requestParams 为 JSON 字符串，详情侧美化展示） */
export interface OperateLogVO {
  id: string
  userId: string | null
  userName: string | null
  module: string
  name: string
  requestMethod: string
  requestUrl: string
  requestParams: string | null
  ip: string | null
  userAgent: string | null
  startTime: string
  durationMs: number
  resultCode: number
  resultMsg: string | null
  createTime: string
}

/** 操作日志分页查询条件（操作人 / 模块名模糊） */
export interface OperateLogPageParam extends Partial<PageParam> {
  userName?: string
  module?: string
}

export async function getOperateLogPage(params: OperateLogPageParam): Promise<PageResult<OperateLogVO>> {
  const { data } = await http.get<PageResult<OperateLogVO>>('/system/operate-log/page', { params })
  return data
}

export async function deleteOperateLog(id: string): Promise<void> {
  await http.delete<null>(`/system/operate-log/delete/${id}`)
}
