/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 部门接口封装：平铺全量列表（前端组树）与 CRUD
 */
import { http } from '@/api/http'

/** 部门信息（后端 DeptVo；parentId 为 null 表示根部门，树形在前端组装） */
export interface DeptVO {
  id: string
  name: string
  parentId: string | null
  sort: number
  phone: string | null
  email: string | null
  status: boolean
  createTime: string
}

/** 部门创建请求（parentId 缺省为根部门） */
export interface DeptCreateData {
  name: string
  parentId?: string
  sort?: number
  phone?: string
  email?: string
  status?: boolean
}

/** 部门更新请求（后端防环三态校验） */
export interface DeptUpdateData {
  id: string
  name: string
  parentId?: string
  sort?: number
  phone?: string
  email?: string
  status?: boolean
}

export async function getDeptList(): Promise<DeptVO[]> {
  const { data } = await http.get<DeptVO[]>('/system/dept/list')
  return data!
}

export async function createDept(payload: DeptCreateData): Promise<void> {
  await http.post<null>('/system/dept/create', payload)
}

export async function updateDept(payload: DeptUpdateData): Promise<void> {
  await http.put<null>('/system/dept/update', payload)
}

export async function deleteDept(id: string): Promise<void> {
  await http.delete<null>(`/system/dept/delete/${id}`)
}
