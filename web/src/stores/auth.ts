/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 认证状态机：token 与权限信息持有、登录 / 登出 / 权限加载（守卫与指令的唯一数据源）
 *
 * 约定：
 * - token 唯一事实源是 localStorage（utils/auth），store 的 token 字段是内存镜像（刷新经 localStorage 恢复）
 * - 权限信息（user / roles / permissions）不持久化：每次会话由守卫在首次导航时拉取（变更即时生效）
 * - super_admin 全集由后端收敛进 permissions 数组（前端无特判，权限设计 §4）
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getPermissionInfoApi, loginApi, logoutApi } from '@/api/auth'
import type { AuthUserInfo } from '@/api/auth'
import { getToken, removeToken, setToken } from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  /** 登录令牌（内存镜像，恢复自 localStorage） */
  const token = ref<string>(getToken() ?? '')

  /** 当前用户信息（权限信息加载后可用） */
  const user = ref<AuthUserInfo | null>(null)

  /** 角色代码集合 */
  const roles = ref<string[]>([])

  /** 权限点集合（super_admin 已被后端收敛为注册表全集） */
  const permissions = ref<string[]>([])

  /** 权限信息是否已在本会话拉取（守卫据此决定是否调 get-permission-info） */
  const isLoaded = ref(false)

  /** 是否已登录（以持有 token 为准） */
  const isLoggedIn = computed(() => token.value !== '')

  /** 登录：成功后落 token（权限信息由守卫在首次导航时拉取，不在登录请求里耦合） */
  async function login(username: string, password: string): Promise<void> {
    const { data } = await loginApi({ username, password })
    token.value = data.token
    setToken(data.token)
  }

  /** 拉取权限信息（守卫在登录后首次导航时调用；isLoaded 置位前失败可重试） */
  async function loadPermissionInfo(): Promise<void> {
    const { data } = await getPermissionInfoApi()
    user.value = data.user
    roles.value = data.roles
    permissions.value = data.permissions
    isLoaded.value = true
  }

  /** 登出：尽力通知后端（失败不阻断），随后无条件清理本地态 */
  async function logout(): Promise<void> {
    try {
      await logoutApi()
    }
    catch {
      // 无状态 JWT 下登出的本质是清令牌；后端不可达不阻断本地登出
    }
    resetLocalState()
  }

  /** 清空本地登录态（登出 / 401 失效共用） */
  function resetLocalState(): void {
    token.value = ''
    user.value = null
    roles.value = []
    permissions.value = []
    isLoaded.value = false
    removeToken()
  }

  /** 权限判定：无要求（undefined / 空串）视为仅需登录；持有任一即通过由调用方（some）承担 */
  function hasPermission(required?: string): boolean {
    if (!required) {
      return true
    }
    return permissions.value.includes(required)
  }

  return {
    token,
    user,
    roles,
    permissions,
    isLoaded,
    isLoggedIn,
    login,
    loadPermissionInfo,
    logout,
    resetLocalState,
    hasPermission,
  }
})
