import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'

import { buildMenuTree } from '@/utils/menu'


describe('路由树转菜单树', () => {
  it('嵌套路由递归生成菜单，meta 透传标题与图标', () => {
    const routes = [
      {
        path: 'home',
        meta: { title: '首页', icon: 'home' },
      },
      {
        path: 'demo',
        meta: { title: '组件演示', icon: 'demo' },
        children: [
          {
            path: 'cache',
            meta: { title: '缓存演示' },
          },
        ],
      },
    ] as unknown as RouteRecordRaw[]

    const tree = buildMenuTree(routes)

    expect(tree).toHaveLength(2)
    expect(tree[0]).toMatchObject({ path: '/home', title: '首页', icon: 'home' })
    expect(tree[1].children).toHaveLength(1)
    expect(tree[1].children[0].path).toBe('/demo/cache')
  })

  it('hidden 路由不进菜单（刷新中转等隐藏子页）', () => {
    const routes = [
      { path: 'home', meta: { title: '首页' } },
      { path: 'redirect/:path(.*)*', meta: { title: '刷新中', hidden: true } },
    ] as unknown as RouteRecordRaw[]

    const tree = buildMenuTree(routes)

    expect(tree).toHaveLength(1)
    expect(tree[0].path).toBe('/home')
  })

  it('顶级绝对路径直接使用，不重复拼接', () => {
    const routes = [{ path: '/absolute', meta: { title: '绝对' } }] as unknown as RouteRecordRaw[]

    expect(buildMenuTree(routes)[0].path).toBe('/absolute')
  })

  it('title 缺失兜底「未命名」', () => {
    const routes = [{ path: 'x' }] as unknown as RouteRecordRaw[]

    expect(buildMenuTree(routes)[0].title).toBe('未命名')
  })
})
