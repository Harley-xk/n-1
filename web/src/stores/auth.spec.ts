import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// mock 认证接口边界（store 的协作对象），store 自身逻辑全真运行
vi.mock('@/api/auth', () => ({
  loginApi: vi.fn(),
  logoutApi: vi.fn(),
  getPermissionInfoApi: vi.fn(),
}))

import { getPermissionInfoApi, loginApi, logoutApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const loginApiMock = vi.mocked(loginApi)
const logoutApiMock = vi.mocked(logoutApi)
const getPermissionInfoApiMock = vi.mocked(getPermissionInfoApi)

/** 成功响应包装（对齐 http 拦截器解包后的形态） */
function ok<T>(data: T) {
  return { data } as never
}

describe('认证状态机', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('登录成功应落 token：内存与 localStorage 同步', async () => {
    loginApiMock.mockResolvedValue(ok({ token: 'jwt-1' }))

    const auth = useAuthStore()
    await auth.login('admin', 'admin123')

    expect(auth.token).toBe('jwt-1')
    expect(localStorage.getItem('N1_TOKEN')).toBe('jwt-1')
    expect(auth.isLoggedIn).toBe(true)
  })

  it('token 应从 localStorage 恢复（会话保持）', () => {
    localStorage.setItem('N1_TOKEN', 'restored-token')

    const auth = useAuthStore()

    expect(auth.token).toBe('restored-token')
    expect(auth.isLoggedIn).toBe(true)
  })

  it('loadPermissionInfo 应一次拉齐用户、角色与权限并置 isLoaded', async () => {
    localStorage.setItem('N1_TOKEN', 't')
    getPermissionInfoApiMock.mockResolvedValue(ok({
      user: { id: 'u1', username: 'admin', nickname: '系统管理员' },
      roles: ['super_admin'],
      permissions: ['system:user:query'],
    }))

    const auth = useAuthStore()
    await auth.loadPermissionInfo()

    expect(auth.user?.nickname).toBe('系统管理员')
    expect(auth.roles).toEqual(['super_admin'])
    expect(auth.permissions).toEqual(['system:user:query'])
    expect(auth.isLoaded).toBe(true)
  })

  it('登出：后端失败也应清理本地态（无状态 JWT 清令牌即登出）', async () => {
    localStorage.setItem('N1_TOKEN', 't')
    logoutApiMock.mockRejectedValue(new Error('network'))

    const auth = useAuthStore()
    auth.isLoaded = true
    auth.user = { id: 'u1', username: 'admin', nickname: '系统管理员' }
    await auth.logout()

    expect(auth.token).toBe('')
    expect(auth.user).toBeNull()
    expect(auth.isLoaded).toBe(false)
    expect(localStorage.getItem('N1_TOKEN')).toBeNull()
    expect(auth.isLoggedIn).toBe(false)
  })

  it('hasPermission：无要求放行，持有即通过，缺失即拒绝', () => {
    const auth = useAuthStore()
    auth.permissions = ['system:user:query']

    expect(auth.hasPermission(undefined)).toBe(true)
    expect(auth.hasPermission('system:user:query')).toBe(true)
    expect(auth.hasPermission('system:role:query')).toBe(false)
  })
})
