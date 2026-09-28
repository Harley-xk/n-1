/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 权限点展示辅助：按权限串的域段分组（角色分配权限弹窗的分组勾选数据整形）
 */
import type { PermissionPointVO } from '@/api/system/permission'

/** 权限分组（无父子级联，组内平铺勾选） */
export interface PermissionGroup {
  /** 域标识（权限串第二段，如 user） */
  domain: string
  /** 域中文名（纯展示映射，未登记的域原样展示） */
  label: string
  /** 域下权限点（保持注册表顺序） */
  points: PermissionPointVO[]
}

/** 域标识 → 中文名（与后端权限注册表的登记顺序对应） */
const DOMAIN_LABELS: Record<string, string> = {
  user: '用户管理',
  role: '角色管理',
  dict: '字典管理',
  config: '参数设置',
  dept: '部门管理',
  post: '岗位管理',
  'operate-log': '操作日志',
  'login-log': '登录日志',
}

/** 按权限串域段分组（code 形如 system:user:query，第二段为域） */
export function groupPermissions(points: PermissionPointVO[]): PermissionGroup[] {
  const groupMap = new Map<string, PermissionGroup>()
  for (const point of points) {
    const segments = point.code.split(':')
    const domain = segments.length >= 2 ? segments[1] : point.code
    let group = groupMap.get(domain)
    if (!group) {
      group = { domain, label: DOMAIN_LABELS[domain] ?? domain, points: [] }
      groupMap.set(domain, group)
    }
    group.points.push(point)
  }
  return [...groupMap.values()]
}
