/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 全局路由守卫：登录态校验、权限信息拉取、无权直链拦截 + 多标签落地与持久化恢复、标题自动更新
 */
import type { Router } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useTagsViewStore } from '@/stores/tags-view'

export function setupRouterGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    const tagsView = useTagsViewStore()

    // 登出联动清签：本地已无 token 但页签尚未重置（登出后仍在同页面会话内），
    // 先清页签与持久化，下次登录走全新恢复流程（避免旧账号页签泄漏给下一账号）
    if (!auth.isLoggedIn && tagsView.isInitialized)
      tagsView.reset()

    // 公开页面直接放行（登录页）；已登录访问登录页弹回首页
    if (to.meta.public === true) {
      if (auth.isLoggedIn && to.name === 'Login')
        return { path: '/' }
      return true
    }

    // 未登录：携 redirect 回带跳登录页
    if (!auth.isLoggedIn)
      return { path: '/login', query: { redirect: to.fullPath } }

    // 已登录且权限信息未拉取：首次导航一次拉齐（变更 / 回收由下次会话或 401 兜底）
    if (!auth.isLoaded) {
      try {
        await auth.loadPermissionInfo()
      }
      catch {
        // 拉取失败（网络异常等；401 已由 http 层整页接管）：强制清本地态回登录页
        auth.resetLocalState()
        return { path: '/login', query: { redirect: to.fullPath } }
      }
    }

    // 无权直链：跳 404（不泄露页面存在性，与侧栏菜单不可见语义一致，权限设计 §6）
    if (!auth.hasPermission(to.meta.permission))
      return { name: 'NotFound' }

    return true
  })

  router.afterEach((to) => {
    const tagsView = useTagsViewStore()

    // 持久化页签恢复：首次导航成功时（逐签 resolve 校验，失效签剔除）
    if (!tagsView.isInitialized) {
      tagsView.restoreFromStorage(router)
    }
    // 布局内路由落页签（404 / redirect 中转不落签）
    if (to.matched.some((record) => record.name === 'Layout')) {
      tagsView.addView(to)
    }

    // RouteMeta.title 自动写页面标题
    const title = to.meta.title as string | undefined
    document.title = title ? `${title} · n-1` : 'n-1'
  })
}
