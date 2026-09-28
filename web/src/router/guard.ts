/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 全局路由守卫：多标签落地与持久化恢复、标题自动更新（登录态校验与权限过滤批次四随认证接入）
 */
import type { Router } from 'vue-router'

import { useTagsViewStore } from '@/stores/tags-view'

export function setupRouterGuard(router: Router): void {
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
