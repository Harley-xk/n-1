/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 首页路由模块（无 meta.permission = 仅需登录即可见）
 */
import type { RouteRecordRaw } from 'vue-router'

import HomeView from '@/views/HomeView.vue'

export const homeRoutes: RouteRecordRaw[] = [
  {
    path: 'home',
    name: 'Home',
    component: HomeView,
    meta: { title: '首页', icon: 'home' },
  },
]
