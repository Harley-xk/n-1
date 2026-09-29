/*
 * 作者: Harley-xk
 * 创建: 2026-09-29
 *
 * 描述: 开发示例路由模块（示例商品单表 CRUD 样板，接入方式见 docs/指南/新模块接入指南.md 第 7 步）
 */
import type { RouteRecordRaw } from 'vue-router'

export const demoRoutes: RouteRecordRaw[] = [
  {
    path: 'demo',
    name: 'Demo',
    redirect: '/demo/product',
    meta: { title: '开发示例', icon: 'demo' },
    children: [
      {
        path: 'product',
        name: 'DemoProduct',
        component: () => import('@/views/demo/product/index.vue'),
        meta: { title: '商品管理', icon: 'product', permission: 'demo:product:query', keepAlive: true },
      },
    ],
  },
]
