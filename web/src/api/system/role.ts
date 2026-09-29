/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 角色接口封装：分页 / 启用全量列表 / CRUD / 权限分配（菜单由路由生成，分配即纯权限点勾选）
 */
import type { PageParam, PageResult } from '@/api/http'
import { http } from '@/api/http'

/** 角色信息（后端 RoleVo） */
export interface RoleVO {
  id: string
  name: string
  code: string
  sort: number
  status: boolean
  remark: string | null
  createTime: string
}

/** 角色创建请求（code 创建后不可改；super_admin 为保留字） */
export interface RoleCreateData {
  name: string
  code: string
  sort?: number
  remark?: string
}

/** 角色更新请求（内置角色保护，后端拒绝 super_admin） */
export interface RoleUpdateData {
  id: string
  name: string
  status: boolean
  sort?: number
  remark?: string
}

/** 角色分页查询条件 */
export interface RolePageParam extends Partial<PageParam> {
  name?: string
  status?: boolean
}

export async function getRolePage(params: RolePageParam): Promise<PageResult<RoleVO>> {
  const { data } = await http.get<PageResult<RoleVO>>('/system/role/page', { params })
  return data
}

/** 启用角色全量列表（用户管理分配角色弹窗的下拉数据源） */
export async function getEnabledRoleList(): Promise<RoleVO[]> {
  const { data } = await http.get<RoleVO[]>('/system/role/list')
  return data!
}

export async function createRole(payload: RoleCreateData): Promise<string> {
  const { data } = await http.post<string>('/system/role/create', payload)
  return data!
}

export async function updateRole(payload: RoleUpdateData): Promise<void> {
  await http.put<null>('/system/role/update', payload)
}

export async function deleteRole(id: string): Promise<void> {
  await http.delete<null>(`/system/role/delete/${id}`)
}

/** 查询角色已分配权限串（分配弹窗回显） */
export async function getRolePermissions(id: string): Promise<string[]> {
  const { data } = await http.get<string[]>(`/system/role/${id}/permissions`)
  return data!
}

/** 分配权限（permissions 为目标全集，后端差集增量绑定并逐串校验注册表；body 须带 id） */
export async function assignRolePermissions(id: string, permissions: string[]): Promise<void> {
  await http.put<null>(`/system/role/${id}/permissions`, { id, permissions })
}
