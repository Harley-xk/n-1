/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 认证接口：登录（后端 @SkipSignature 豁免验签，前端带签名头无害）、登出、权限信息下发
 */

import { http } from './http'

/** 登录请求体 */
export interface LoginPayload {
  username: string
  password: string
}

/** 登录用户信息（get-permission-info 下发） */
export interface AuthUserInfo {
  id: string
  username: string
  nickname: string
}

/** 权限信息（登录后一次拉齐：用户 + 角色 + 权限集合） */
export interface PermissionInfo {
  user: AuthUserInfo
  roles: string[]
  permissions: string[]
}

/** 登录：成功返回 JWT（无状态，有效期与刷新策略见 ADR-003） */
export function loginApi(payload: LoginPayload) {
  return http.post<{ token: string }>('/system/auth/login', payload)
}

/** 登出：无状态 JWT 无服务端态，接口供批次五登录日志埋点；本地清令牌由 store 承担 */
export function logoutApi() {
  return http.post<null>('/system/auth/logout')
}

/** 权限信息：路由守卫登录后首次导航时调用 */
export function getPermissionInfoApi() {
  return http.get<PermissionInfo>('/system/auth/get-permission-info')
}
