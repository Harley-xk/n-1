/*
 * 作者: Harley-xk
 * 创建: 2026-10-22
 *
 * 描述: 个人中心路由模块（hidden：不进侧栏菜单，顶栏下拉与直链可达；仅需登录，设计见 docs/前端/个人中心设计.md）
 */
import type { RouteRecordRaw } from 'vue-router'

export const profileRoutes: RouteRecordRaw[] = [
  {
    path: 'profile',
    name: 'ProfileCenter',
    component: () => import('@/views/profile/index.vue'),
    meta: { title: '个人中心', hidden: true },
  },
]
