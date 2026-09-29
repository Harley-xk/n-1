/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 参数配置接口封装：分页 / 按键取值 / CRUD（列表侧对不可见参数打码展示）
 */
import type { PageParam, PageResult } from '@/api/http'
import { http } from '@/api/http'

/** 参数信息（后端 ConfigVo；visible false 时列表侧打码展示） */
export interface ConfigVO {
  id: string
  category: string
  name: string
  configKey: string
  configValue: string
  visible: boolean
  remark: string | null
  createTime: number
}

/** 参数创建请求（configKey 全局唯一） */
export interface ConfigCreateData {
  category: string
  name: string
  configKey: string
  configValue: string
  visible?: boolean
  remark?: string
}

/** 参数更新请求 */
export interface ConfigUpdateData {
  id: string
  category: string
  name: string
  configKey: string
  configValue: string
  visible?: boolean
  remark?: string
}

/** 参数分页查询条件（名称 / 键模糊） */
export interface ConfigPageParam extends Partial<PageParam> {
  name?: string
  configKey?: string
}

export async function getConfigPage(params: ConfigPageParam): Promise<PageResult<ConfigVO>> {
  const { data } = await http.get<PageResult<ConfigVO>>('/system/config/page', { params })
  return data
}

/** 按键取值（未命中返回 null；初始口令链第一级即读此接口背后的参数表） */
export async function getConfigByKey(key: string): Promise<string | null> {
  const { data } = await http.get<string | null>('/system/config/get-by-key', { params: { key } })
  return data ?? null
}

export async function createConfig(payload: ConfigCreateData): Promise<void> {
  await http.post<null>('/system/config/create', payload)
}

export async function updateConfig(payload: ConfigUpdateData): Promise<void> {
  await http.put<null>('/system/config/update', payload)
}

export async function deleteConfig(id: string): Promise<void> {
  await http.delete<null>(`/system/config/delete/${id}`)
}
