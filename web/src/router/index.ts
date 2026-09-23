/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 前端路由配置：注册页面路由，并依据 RouteMeta.title 自动设置浏览器标题
 */

import HomeView from '@/views/HomeView.vue'

import { createRouter, createWebHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题，写入浏览器标签页 */
    title?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { title: '首页' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '页面不存在' },
    },
  ],
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · n-1` : 'n-1'
})

export default router
