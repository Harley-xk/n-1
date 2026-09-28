/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 登录日志接口封装：分页查询与单条删除（登录 / 登出埋点由 AuthService 承担）
 */
import type { PageParam, PageResult } from '@/api/http'
import { http } from '@/api/http'

/** 登录日志信息（后端 LoginLogVo；logType 10 登录 / 20 登出） */
export interface LoginLogVO {
  id: string
  logType: number
  userId: string | null
  username: string
  ip: string | null
  userAgent: string | null
  resultCode: number
  resultMsg: string | null
  loginTime: string
  createTime: string
}

/** 登录日志分页查询条件（用户名模糊、类型精确） */
export interface LoginLogPageParam extends Partial<PageParam> {
  username?: string
  logType?: number
}

export async function getLoginLogPage(params: LoginLogPageParam): Promise<PageResult<LoginLogVO>> {
  const { data } = await http.get<PageResult<LoginLogVO>>('/system/login-log/page', { params })
  return data
}

export async function deleteLoginLog(id: string): Promise<void> {
  await http.delete<null>(`/system/login-log/delete/${id}`)
}
