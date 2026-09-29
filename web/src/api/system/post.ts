/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 岗位接口封装：分页与 CRUD（code 全局唯一）
 */
import type { PageParam, PageResult } from '@/api/http'
import { http } from '@/api/http'

/** 岗位信息（后端 PostVo） */
export interface PostVO {
  id: string
  code: string
  name: string
  sort: number
  status: boolean
  createTime: number
}

/** 岗位创建请求 */
export interface PostCreateData {
  code: string
  name: string
  sort?: number
  status?: boolean
}

/** 岗位更新请求 */
export interface PostUpdateData {
  id: string
  code: string
  name: string
  sort?: number
  status?: boolean
}

/** 岗位分页查询条件 */
export interface PostPageParam extends Partial<PageParam> {
  code?: string
  name?: string
  status?: boolean
}

export async function getPostPage(params: PostPageParam): Promise<PageResult<PostVO>> {
  const { data } = await http.get<PageResult<PostVO>>('/system/post/page', { params })
  return data
}

/** 岗位全量列表（用户表单岗位多选的数据源；数量有限不分页） */
export async function getPostList(): Promise<PostVO[]> {
  const { data } = await http.get<PostVO[]>('/system/post/list')
  return data!
}

export async function createPost(payload: PostCreateData): Promise<string> {
  const { data } = await http.post<string>('/system/post/create', payload)
  return data!
}

export async function updatePost(payload: PostUpdateData): Promise<void> {
  await http.put<null>('/system/post/update', payload)
}

export async function deletePost(id: string): Promise<void> {
  await http.delete<null>(`/system/post/delete/${id}`)
}
