/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 用户管理接口封装：分页 / CRUD / 重置口令 / 角色分配与回显（部门 / 岗位为批次五扩展字段）
 */
import type { PageParam, PageResult } from '@/api/http'
import { http } from '@/api/http'

/** 用户信息（后端 UserVo；状态为 boolean，时间为 ISO 字符串） */
export interface UserVO {
  id: string
  username: string
  nickname: string
  status: boolean
  deptId: string | null
  deptName: string | null
  postIds: string[]
  createTime: string
}

/** 用户创建请求（后端 UserCreateDto；口令缺省走服务端三级兜底链） */
export interface UserCreateData {
  username: string
  nickname: string
  password?: string
  deptId?: string
  postIds?: string[]
}

/** 用户更新请求（后端 UserUpdateDto；username 不可改） */
export interface UserUpdateData {
  id: string
  nickname: string
  status: boolean
  deptId?: string
  postIds?: string[]
}

/** 用户分页查询条件（后端 UserPageDto） */
export interface UserPageParam extends Partial<PageParam> {
  username?: string
  nickname?: string
  status?: boolean
  deptId?: string
}

export async function getUserPage(params: UserPageParam): Promise<PageResult<UserVO>> {
  const { data } = await http.get<PageResult<UserVO>>('/system/user/page', { params })
  return data
}

export async function createUser(payload: UserCreateData): Promise<string> {
  const { data } = await http.post<string>('/system/user/create', payload)
  return data!
}

export async function updateUser(payload: UserUpdateData): Promise<void> {
  await http.put<null>('/system/user/update', payload)
}

export async function deleteUser(id: string): Promise<void> {
  await http.delete<null>(`/system/user/delete/${id}`)
}

/** 重置密码：恢复为初始口令（参数表 → env → admin123 三级兜底链） */
export async function resetUserPassword(id: string): Promise<void> {
  await http.put<null>('/system/user/reset-password', { id })
}

/** 查询用户已分配角色 id 集（分配弹窗回显） */
export async function getUserRoleIds(id: string): Promise<string[]> {
  const { data } = await http.get<string[]>(`/system/user/${id}/role-ids`)
  return data!
}

/** 分配角色（roleIds 为目标全集，后端差集增量绑定） */
export async function assignUserRoles(id: string, roleIds: string[]): Promise<void> {
  await http.put<null>('/system/user/assign-role', { id, roleIds })
}
