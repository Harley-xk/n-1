/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 权限点接口封装：注册表全集清单（角色分配权限弹窗的勾选数据源）
 */
import { http } from '@/api/http'

/** 权限点（后端 PermissionPoint：code 为唯一权限串，label 为中文展示名） */
export interface PermissionPointVO {
  code: string
  label: string
}

/** 权限点全集（与后端代码注册表同源，启动期 fail-fast 保证唯一性） */
export async function getPermissionList(): Promise<PermissionPointVO[]> {
  const { data } = await http.get<PermissionPointVO[]>('/system/permission/list')
  return data!
}
