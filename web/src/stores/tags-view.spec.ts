import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

import { useTagsViewStore } from '@/stores/tags-view'
import type { TagView } from '@/stores/tags-view'

type TagsViewStore = ReturnType<typeof useTagsViewStore>

/** 构造守卫 afterEach 传入形态的最小路由对象 */
function makeRoute(
  overrides: Partial<RouteLocationNormalizedLoaded> = {},
): RouteLocationNormalizedLoaded {
  return {
    fullPath: '/demo/cache',
    path: '/demo/cache',
    name: 'DemoCache',
    query: {},
    meta: { title: '缓存演示', keepAlive: true },
    ...overrides,
  } as RouteLocationNormalizedLoaded
}

/** 便捷落签：[fullPath, 路由 name, 是否缓存] 列表 */
function addTags(tagsView: TagsViewStore, items: Array<[string, string, boolean?]>): void {
  for (const [path, name, keepAlive] of items) {
    const route = makeRoute({ fullPath: path, path, name })
    route.meta = { title: path, keepAlive: keepAlive === true }
    tagsView.addView(route)
  }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('多标签状态机', () => {
  it('落签：首页自动补位固定，noTag 路由不落签', () => {
    const tagsView = useTagsViewStore()

    addTags(tagsView, [
      ['/demo/cache', 'DemoCache'],
      ['/demo/tabs', 'DemoTabs'],
    ])
    tagsView.addView(
      makeRoute({ fullPath: '/redirect/x', path: '/redirect/x', meta: { noTag: true } }),
    )

    const paths = tagsView.views.map((view) => view.fullPath)
    expect(paths).toEqual(['/home', '/demo/cache', '/demo/tabs'])
    expect(tagsView.views[0].affix).toBe(true)
  })

  it('fullPath 一签：同 path 不同 query 分立页签，重复落地只更新标题', () => {
    const tagsView = useTagsViewStore()

    tagsView.addView(makeRoute())
    tagsView.addView(makeRoute({ fullPath: '/demo/tabs?tab=2', path: '/demo/tabs', query: { tab: '2' } }))
    tagsView.addView(makeRoute({ meta: { title: '缓存演示改', keepAlive: true } }))

    expect(tagsView.views).toHaveLength(3) // 首页 + 两个 query 页签
    expect(tagsView.views.find((view) => view.fullPath === '/demo/cache')?.title).toBe(
      '缓存演示改',
    )
  })

  it('页签图标：取当前路由图标，当前页缺图标时上溯上级路由', () => {
    const tagsView = useTagsViewStore()

    // 两级路由：布局壳 → 目录 → 页面，页面自身带图标
    tagsView.addView(
      makeRoute({
        matched: [
          { name: 'Layout', meta: {} },
          { name: 'Demo', meta: { title: '组件演示', icon: 'demo' } },
          { name: 'DemoCache', meta: { title: '缓存演示', icon: 'doc' } },
        ],
      } as Partial<RouteLocationNormalizedLoaded>),
    )
    expect(tagsView.findView('/demo/cache')?.icon).toBe('doc')

    // 隐藏子页（详情 / 表单页）自身未配图标：回退所属目录图标
    tagsView.addView(
      makeRoute({
        fullPath: '/demo/cache/detail',
        path: '/demo/cache/detail',
        name: 'DemoCacheDetail',
        matched: [
          { name: 'Layout', meta: {} },
          { name: 'Demo', meta: { title: '组件演示', icon: 'demo' } },
          { name: 'DemoCacheDetail', meta: { title: '详情', icon: null } },
        ],
      } as Partial<RouteLocationNormalizedLoaded>),
    )
    expect(tagsView.findView('/demo/cache/detail')?.icon).toBe('demo')

    // 全链无图标：留空，由渲染侧兜底默认图标
    tagsView.addView(
      makeRoute({
        fullPath: '/plain',
        path: '/plain',
        name: 'Plain',
        matched: [
          { name: 'Layout', meta: {} },
          { name: 'Plain', meta: { title: '无图标页' } },
        ],
      } as Partial<RouteLocationNormalizedLoaded>),
    )
    expect(tagsView.findView('/plain')?.icon).toBeUndefined()
  })

  it('关闭当前签：激活左邻，无左邻取右邻，固定签不可关', () => {
    const tagsView = useTagsViewStore()
    addTags(tagsView, [
      ['/demo/cache', 'DemoCache'],
      ['/demo/tabs', 'DemoTabs'],
      ['/demo/other', 'DemoOther'],
    ])

    // 关闭非当前签：页签移除但无需跳转
    expect(tagsView.closeTab('/demo/tabs', '/demo/other')).toBeNull()
    const paths = tagsView.views.map((view) => view.fullPath)
    expect(paths).toEqual(['/home', '/demo/cache', '/demo/other'])
    // 关闭当前签：激活左邻（tabs 已被上一步关掉，左邻为 cache）
    expect(tagsView.closeTab('/demo/other', '/demo/other')?.fullPath).toBe('/demo/cache')
    // 固定签（首页）不可关
    expect(tagsView.closeTab('/home', '/home')).toBeNull()
    expect(tagsView.views[0].fullPath).toBe('/home')
  })

  it('关闭其他 / 左右侧 / 全部：固定签始终保留，当前签被关才返回跳转目标', () => {
    const tagsView = useTagsViewStore()
    addTags(tagsView, [
      ['/demo/a', 'DemoA'],
      ['/demo/b', 'DemoB'],
      ['/demo/c', 'DemoC'],
      ['/demo/d', 'DemoD'],
    ])

    // 关闭其他（锚点 c）：保留首页 + c；当前签 d 被关 → 返回锚点
    let target = tagsView.closeOthers('/demo/c', '/demo/d')
    expect(tagsView.views.map((view) => view.fullPath)).toEqual(['/home', '/demo/c'])
    expect(target?.fullPath).toBe('/demo/c')

    // 重建三个签：views = [home, c, a, b, d]
    addTags(tagsView, [
      ['/demo/a', 'DemoA'],
      ['/demo/b', 'DemoB'],
      ['/demo/d', 'DemoD'],
    ])

    // 关闭左侧（锚点 d）：c / a / b 被关，当前签 b 被关 → 返回锚点
    target = tagsView.closeSide('/demo/d', 'left', '/demo/b')
    expect(tagsView.views.map((view) => view.fullPath)).toEqual(['/home', '/demo/d'])
    expect(target?.fullPath).toBe('/demo/d')

    // 关闭右侧（锚点 d，右侧已空）：无移除，当前签保留 → 无需跳转
    target = tagsView.closeSide('/demo/d', 'right', '/demo/d')
    expect(tagsView.views.map((view) => view.fullPath)).toEqual(['/home', '/demo/d'])
    expect(target).toBeNull()

    // 全部关闭：只剩固定签，当前签 d 被关 → 回首页
    target = tagsView.closeAll('/demo/d')
    expect(tagsView.views.map((view) => view.fullPath)).toEqual(['/home'])
    expect(target?.fullPath).toBe('/home')
  })

  it('缓存名单跟随页签：keepAlive 过滤 + 刷新排除 + 关签释放', () => {
    const tagsView = useTagsViewStore()
    addTags(tagsView, [
      ['/demo/cache', 'DemoCache', true],
      ['/demo/tabs', 'DemoTabs', true],
      ['/demo/plain', 'DemoPlain', false],
    ])

    expect(tagsView.cachedNames).toEqual(['DemoCache', 'DemoTabs'])

    // 刷新 cache：从名单排除（卸载不进缓存）
    tagsView.beginRefresh(tagsView.findView('/demo/cache') as TagView)
    expect(tagsView.cachedNames).toEqual(['DemoTabs'])

    // 任意路由落地结束刷新周期，名单恢复
    tagsView.addView(makeRoute())
    expect(tagsView.cachedNames).toEqual(['DemoCache', 'DemoTabs'])

    // 关闭签即释放缓存
    tagsView.closeTab('/demo/cache', '/demo/tabs')
    expect(tagsView.cachedNames).toEqual(['DemoTabs'])
  })

  it('持久化往返：变更即写 N1_TAGS，reset 清空', () => {
    const tagsView = useTagsViewStore()
    tagsView.addView(makeRoute())

    expect(JSON.parse(localStorage.getItem('N1_TAGS') ?? '[]')).toHaveLength(2)

    tagsView.closeTab('/demo/cache', '/home')
    expect(JSON.parse(localStorage.getItem('N1_TAGS') ?? '[]')).toHaveLength(1)

    tagsView.reset()
    expect(localStorage.getItem('N1_TAGS')).toBeNull()
    expect(tagsView.isInitialized).toBe(false)
  })

  it('恢复校验：可解析到布局内路由的页签保留，失效签剔除', () => {
    const saved = [
      {
        fullPath: '/demo/cache',
        path: '/demo/cache',
        title: '缓存演示',
        name: 'DemoCache',
        query: {},
        affix: false,
        keepAlive: true,
      },
      {
        fullPath: '/gone',
        path: '/gone',
        title: '已失配',
        name: 'Gone',
        query: {},
        affix: false,
        keepAlive: true,
      },
      {
        fullPath: '/home',
        path: '/home',
        title: '首页',
        name: 'Home',
        query: {},
        affix: true,
        keepAlive: false,
      },
      { broken: true },
    ]
    localStorage.setItem('N1_TAGS', JSON.stringify(saved))
    // resolve 按路径分叉：/gone 落 404 兜底，其余落在 Layout 下
    const resolve = vi.fn(({ path }: { path: string }) => {
      if (path === '/gone') {
        return { name: 'NotFound', matched: [{ name: 'NotFound' }], meta: {} } as never
      }
      const matched = [
        { name: 'Layout', meta: {} },
        { name: 'Demo', meta: { title: '组件演示', icon: 'demo' } },
        { name: 'DemoCache', meta: { title: '缓存演示', icon: 'doc' } },
      ]
      return { name: 'DemoCache', matched, meta: {} } as never
    })
    const router = { resolve } as unknown as Router

    const tagsView = useTagsViewStore()
    tagsView.restoreFromStorage(router)

    expect(tagsView.isInitialized).toBe(true)
    expect(tagsView.views.map((view) => view.fullPath)).toEqual(['/home', '/demo/cache'])
    expect(tagsView.views[0].affix).toBe(true)
    // 图标按当前路由表重算（不依赖持久化字段）
    expect(tagsView.views[1].icon).toBe('doc')
    // 恢复后写回净化结果
    expect(JSON.parse(localStorage.getItem('N1_TAGS') ?? '[]')).toHaveLength(2)
  })
})
