/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 路由定义：静态骨架（登录页 + 主布局壳 + 业务子路由 + 404 兜底），菜单由 Layout 子路由树按权限过滤生成（ADR-001，见 utils/menu.ts）
 *      业务模块按「路由模块文件静态注册」扩展（router/modules/ 下新建模块文件后在此合并），路由 name 一律 PascalCase（keep-alive 缓存键契约）
 */
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import DefaultLayout from '@/layouts/default/index.vue'

import { demoRoutes } from './modules/demo'
import { homeRoutes } from './modules/home'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题，写入浏览器标签页与页签 */
    title?: string
    /** 菜单图标语义名（utils/menu-icon 映射） */
    icon?: string
    /** 不进侧栏菜单（隐藏子页，路由仍注册供直链访问） */
    hidden?: boolean
    /** 参与多标签 keep-alive 缓存（页面 defineOptions name 须与路由 name 一致） */
    keepAlive?: boolean
    /** 不落地为页签（刷新中转路由用） */
    noTag?: boolean
    /** 访问所需权限点代码：缺省 = 仅需登录；无权访问时直链跳 404、侧栏菜单同步隐藏（权限设计 §6） */
    permission?: string
    /** 公开页面（免登录，如登录页） */
    public?: boolean
  }
}

/** 布局内业务路由（侧栏菜单由该树按权限过滤生成；新增业务模块在 router/modules/ 建文件后于此合并） */
export const layoutChildren: RouteRecordRaw[] = [
  ...homeRoutes,
  ...demoRoutes,
  {
    // 刷新中转：进入即回跳原址（页签「刷新页签」经此强制重建组件实例）
    path: 'redirect/:path(.*)*',
    name: 'Redirect',
    component: () => import('@/views/redirect/index.vue'),
    meta: { title: '刷新中', noTag: true, hidden: true },
  },
]

const routes: RouteRecordRaw[] = [
  {
    // 登录页挂根级（不进主布局、免登录；已登录访问时守卫弹回首页）
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    name: 'Layout',
    component: DefaultLayout,
    redirect: '/home',
    children: layoutChildren,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
