import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

// mock 认证接口边界：守卫依赖真实 auth store（store 调 api），mock 打在 api 层
vi.mock('@/api/auth', () => ({
  loginApi: vi.fn(),
  logoutApi: vi.fn(),
  getPermissionInfoApi: vi.fn(),
}))

import { getPermissionInfoApi } from '@/api/auth'
import { setupRouterGuard } from '@/router/guard'
import { useAuthStore } from '@/stores/auth'
import { useTagsViewStore } from '@/stores/tags-view'

const getPermissionInfoApiMock = vi.mocked(getPermissionInfoApi)

/** 空组件占位（守卫不渲染组件，仅需路由可解析） */
const EmptyView = { template: '<div />' }

function buildRouter(): Router {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: EmptyView, meta: { title: '登录', public: true } },
      {
        path: '/',
        name: 'Layout',
        component: EmptyView,
        redirect: '/home',
        children: [
          { path: 'home', name: 'Home', component: EmptyView, meta: { title: '首页' } },
          { path: 'secret', name: 'Secret', component: EmptyView, meta: { title: '机密', permission: 'system:secret' } },
        ],
      },
      { path: '/:pathMatch(.*)*', name: 'NotFound', component: EmptyView, meta: { title: '页面不存在' } },
    ],
  })
  setupRouterGuard(router)
  return router
}

/** 授予指定权限的权限信息成功响应 */
function grant(permissions: string[]) {
  getPermissionInfoApiMock.mockResolvedValue({
    data: { user: { id: 'u1', username: 'admin', nickname: '系统管理员' }, roles: ['operator'], permissions },
  } as never)
}

describe('路由守卫 · 登录态与权限', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
    grant([])
  })

  it('未登录访问受保护页应重定向登录页并回带 redirect', async () => {
    const router = buildRouter()

    await router.push('/secret')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/secret')
  })

  it('登录页为公开页面，未登录可直接访问', async () => {
    const router = buildRouter()

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('Login')
  })

  it('已登录访问登录页应弹回首页', async () => {
    localStorage.setItem('N1_TOKEN', 't')
    const router = buildRouter()

    await router.push('/login')

    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('登录后首次导航应拉取权限信息并放行无权限要求的页面', async () => {
    localStorage.setItem('N1_TOKEN', 't')
    const auth = useAuthStore()
    const router = buildRouter()

    await router.push('/home')

    expect(getPermissionInfoApiMock).toHaveBeenCalledTimes(1)
    expect(auth.isLoaded).toBe(true)
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('权限信息已加载后不再重复拉取（会话内一次）', async () => {
    localStorage.setItem('N1_TOKEN', 't')
    const router = buildRouter()

    await router.push('/home')
    await router.push('/login').then(() => router.push('/home'))

    expect(getPermissionInfoApiMock).toHaveBeenCalledTimes(1)
  })

  it('无权直链应跳 404（不泄露页面存在性）', async () => {
    localStorage.setItem('N1_TOKEN', 't')
    const router = buildRouter()

    await router.push('/secret')

    expect(router.currentRoute.value.name).toBe('NotFound')
  })

  it('持有 meta.permission 应放行', async () => {
    localStorage.setItem('N1_TOKEN', 't')
    grant(['system:secret'])
    const router = buildRouter()

    await router.push('/secret')

    expect(router.currentRoute.value.path).toBe('/secret')
  })

  it('登出联动：本地无 token 且页签已初始化时应清空旧账号页签', async () => {
    const tagsView = useTagsViewStore()
    tagsView.isInitialized = true
    // 模拟旧账号遗留页签（守卫 reset 后，afterEach 从已清空的存储重建，旧签不得残留）
    tagsView.views.push({
      fullPath: '/secret',
      path: '/secret',
      title: '机密',
      name: 'Secret',
      query: {},
      affix: false,
      keepAlive: false,
    })
    const router = buildRouter()

    await router.push('/home')

    expect(tagsView.views.some(view => view.fullPath === '/secret')).toBe(false)
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('权限信息拉取失败应清本地态并回登录页（401 已由 http 层整页接管，此处覆盖网络异常）', async () => {
    localStorage.setItem('N1_TOKEN', 't')
    getPermissionInfoApiMock.mockRejectedValue(new Error('network'))
    const auth = useAuthStore()
    const router = buildRouter()

    await router.push('/home')

    expect(auth.isLoggedIn).toBe(false)
    expect(localStorage.getItem('N1_TOKEN')).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
