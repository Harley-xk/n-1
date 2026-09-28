/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 权限信息出参契约：登录后由前端守卫一次拉齐用户、角色与权限集合（无 menus——ADR-001 菜单不落库）
 */

/** 用户基本信息 */
export interface PermissionInfoUserVo {
  id: string
  username: string
  nickname: string
}

/** 权限信息（GET /system/auth/get-permission-info 出参） */
export interface PermissionInfoVo {
  /** 用户基本信息 */
  user: PermissionInfoUserVo
  /** 启用角色的 code 列表 */
  roles: string[]
  /** 权限串集合（super_admin 全集已在后端收敛，前端无特判） */
  permissions: string[]
}
