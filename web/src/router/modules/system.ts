/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 系统管理路由模块：父级 system 分组 + 八个子页（meta.permission 挂各域 query 权限，
 *      name 与页面 defineOptions 对齐 keep-alive 缓存键契约；批次五分段实装，未实装页为占位渲染）
 */
import type { RouteRecordRaw } from 'vue-router'

export const systemRoutes: RouteRecordRaw[] = [
  {
    path: 'system',
    meta: { title: '系统管理', icon: 'system' },
    redirect: '/system/user',
    children: [
      {
        path: 'user',
        name: 'SystemUser',
        component: () => import('@/views/system/user/index.vue'),
        meta: { title: '用户管理', icon: 'user', permission: 'system:user:query', keepAlive: true },
      },
      {
        path: 'role',
        name: 'SystemRole',
        component: () => import('@/views/system/role/index.vue'),
        meta: { title: '角色管理', icon: 'peoples', permission: 'system:role:query', keepAlive: true },
      },
      {
        path: 'dept',
        name: 'SystemDept',
        component: () => import('@/views/system/dept/index.vue'),
        meta: { title: '部门管理', icon: 'dept', permission: 'system:dept:query', keepAlive: true },
      },
      {
        path: 'post',
        name: 'SystemPost',
        component: () => import('@/views/system/post/index.vue'),
        meta: { title: '岗位管理', icon: 'post', permission: 'system:post:query', keepAlive: true },
      },
      {
        path: 'dict',
        name: 'SystemDict',
        component: () => import('@/views/system/dict/index.vue'),
        meta: { title: '字典管理', icon: 'dict', permission: 'system:dict:query', keepAlive: true },
      },
      {
        path: 'config',
        name: 'SystemConfig',
        component: () => import('@/views/system/config/index.vue'),
        meta: { title: '参数设置', icon: 'config', permission: 'system:config:query', keepAlive: true },
      },
      {
        path: 'operate-log',
        name: 'SystemOperateLog',
        component: () => import('@/views/system/operate-log/index.vue'),
        meta: { title: '操作日志', icon: 'operate-log', permission: 'system:operate-log:query', keepAlive: true },
      },
      {
        path: 'login-log',
        name: 'SystemLoginLog',
        component: () => import('@/views/system/login-log/index.vue'),
        meta: { title: '登录日志', icon: 'login-log', permission: 'system:login-log:query', keepAlive: true },
      },
    ],
  },
]
