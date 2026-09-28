/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 组件演示路由模块（无 meta.permission = 仅需登录即可见；批次六由样板模块吸收）
 */
import type { RouteRecordRaw } from 'vue-router'

export const demoRoutes: RouteRecordRaw[] = [
  {
    path: 'demo',
    name: 'Demo',
    redirect: '/demo/cache',
    meta: { title: '组件演示', icon: 'demo' },
    children: [
      {
        path: 'cache',
        name: 'DemoCache',
        component: () => import('@/views/demo/cache/index.vue'),
        meta: { title: '缓存演示', keepAlive: true },
      },
      {
        path: 'tabs',
        name: 'DemoTabs',
        component: () => import('@/views/demo/tabs/index.vue'),
        meta: { title: '页签演示' },
      },
    ],
  },
]
