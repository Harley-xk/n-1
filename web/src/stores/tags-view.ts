/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 多标签页状态机：页签增删切换、右键批量关闭、keep-alive 缓存名单、localStorage 持久化与恢复
 *
 * 约定（见 docs/前端/布局与风格设计.md §3）：
 * - 页签粒度 fullPath 一签（同 path 不同 query 视为不同页签）
 * - 缓存跟随页签：cachedNames = 打开中且 keepAlive 的路由 name，页签关闭即释放缓存
 * - 刷新经 redirect 中转路由配合 refreshingName 排除实现强制重建（KeepAlive include 命名排除）
 * - store 不持有 router：导航由调用方（TagsBar / 守卫）执行，关闭类操作返回应跳转的目标页签
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

import { readLocalJson, removeLocalKey, writeLocalJson } from '@/utils/storage'

/** 页签数据（持久化的纯数据字段） */
export interface TagView {
  /** 唯一标识：path + query */
  fullPath: string
  /** 路由路径（恢复校验用） */
  path: string
  /** 页签标题（route.meta.title） */
  title: string
  /** 菜单图标语义名（route.meta.icon，经 utils/menu-icon 映射为组件） */
  icon?: string
  /** 路由 name（keep-alive 缓存键，与页面 defineOptions name 对齐） */
  name?: string
  /** 回带 query */
  query: Record<string, unknown>
  /** 固定页签（首页），不可关闭 */
  affix: boolean
  /** 是否参与 keep-alive 缓存 */
  keepAlive: boolean
}

const TAGS_KEY = 'N1_TAGS'

/** 首页固定页签 */
const HOME_PATH = '/home'

/** 路由匹配链上取 meta 的最小形态（RouteRecordNormalized 与 RouteLocationMatched 皆可传入） */
interface MatchedRecord {
  name?: unknown
  meta?: Record<string, unknown>
}

/**
 * 页签图标语义名：取当前路由图标，缺失时上溯最近一级带图标的路由
 * （隐藏子页如详情页常只配目录图标）；全链无图标返回 undefined，由渲染侧兜底
 */
function resolveTagIcon(matched: readonly MatchedRecord[] | undefined): string | undefined {
  const chain = (matched ?? []).filter((record) => record.name !== 'Layout')
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const icon = chain[index].meta?.icon
    if (typeof icon === 'string' && icon !== '') {
      return icon
    }
  }
  return undefined
}

function homeView(): TagView {
  // 首页为静态路由（title「首页」），此处不复用路由表以保持 store 与 router 解耦
  return {
    fullPath: HOME_PATH,
    path: HOME_PATH,
    title: '首页',
    icon: 'home',
    name: 'Home',
    query: {},
    affix: true,
    keepAlive: false,
  }
}

export const useTagsViewStore = defineStore('tags-view', () => {
  /** 已打开页签（首个恒为首页固定签） */
  const views = ref<TagView[]>([])

  /** 持久化恢复是否已完成（守卫在首次导航成功后触发） */
  const isInitialized = ref(false)

  /** 刷新中的路由 name（暂从 cachedNames 排除，令卸载时实例不进缓存） */
  const refreshingName = ref<string | null>(null)

  /** keep-alive 缓存名单：打开中且 keepAlive 的页签 name（排除刷新中的） */
  const cachedNames = computed(() => {
    const names = new Set<string>()
    for (const view of views.value) {
      if (view.keepAlive && view.name && view.name !== refreshingName.value) {
        names.add(view.name)
      }
    }
    return [...names]
  })

  function persist(): void {
    writeLocalJson(TAGS_KEY, views.value)
  }

  function ensureHomeView(): void {
    if (!views.value.some((view) => view.fullPath === HOME_PATH)) {
      views.value.unshift(homeView())
    }
  }

  /** 路由落地为页签（守卫 afterEach 调用；noTag 路由不落签；任意落地结束一次刷新周期） */
  function addView(to: RouteLocationNormalizedLoaded): void {
    if (to.meta.noTag === true) {
      return
    }
    refreshingName.value = null
    ensureHomeView()
    const view: TagView = {
      fullPath: to.fullPath,
      path: to.path,
      title: (to.meta.title as string | undefined) ?? '未命名',
      icon: resolveTagIcon(to.matched as unknown as MatchedRecord[]),
      name: typeof to.name === 'string' ? to.name : undefined,
      query: { ...to.query } as Record<string, unknown>,
      affix: to.path === HOME_PATH,
      keepAlive: to.meta.keepAlive === true,
    }
    const existing = views.value.find((item) => item.fullPath === view.fullPath)
    if (existing) {
      existing.title = view.title
      existing.icon = view.icon
      existing.query = view.query
    } else {
      views.value.push(view)
    }
    persist()
  }

  /** 按 fullPath 找页签 */
  function findView(fullPath: string): TagView | undefined {
    return views.value.find((view) => view.fullPath === fullPath)
  }

  /**
   * 关闭页签：关闭当前激活签时返回应跳转的目标（左邻 → 右邻 → 首页），否则返回 null
   */
  function closeTab(fullPath: string, currentFullPath: string): TagView | null {
    const index = views.value.findIndex((view) => view.fullPath === fullPath)
    if (index === -1) {
      return null
    }
    if (views.value[index].affix) {
      return null
    }
    views.value.splice(index, 1)
    persist()
    if (fullPath !== currentFullPath) {
      return null
    }
    return views.value[index - 1] ?? views.value[index] ?? views.value[0] ?? null
  }

  /** 关闭其他：保留固定签与指定签；当前签被关掉时返回保留侧目标 */
  function closeOthers(keepFullPath: string, currentFullPath: string): TagView | null {
    views.value = views.value.filter((view) => view.affix || view.fullPath === keepFullPath)
    persist()
    if (!views.value.some((view) => view.fullPath === currentFullPath)) {
      return views.value[views.value.length - 1] ?? null
    }
    return null
  }

  /** 关闭左侧 / 右侧：保留固定签与锚点签；当前签被关掉时返回锚点签 */
  function closeSide(
    anchorFullPath: string,
    side: 'left' | 'right',
    currentFullPath: string,
  ): TagView | null {
    const anchorIndex = views.value.findIndex((view) => view.fullPath === anchorFullPath)
    if (anchorIndex === -1) {
      return null
    }
    const currentRemoved = views.value.some(
      (view, index) =>
        !view.affix &&
        view.fullPath === currentFullPath &&
        (side === 'left' ? index < anchorIndex : index > anchorIndex),
    )
    views.value = views.value.filter(
      (view, index) =>
        view.affix || (side === 'left' ? index >= anchorIndex : index <= anchorIndex),
    )
    persist()
    return currentRemoved ? (findView(anchorFullPath) ?? null) : null
  }

  /** 全部关闭（固定签保留）：当前签被关掉时返回首页 */
  function closeAll(currentFullPath: string): TagView | null {
    views.value = views.value.filter((view) => view.affix)
    persist()
    if (!views.value.some((view) => view.fullPath === currentFullPath)) {
      return views.value[0] ?? null
    }
    return null
  }

  /** 刷新开始：把目标 name 摘出缓存名单（卸载时不进缓存），随后由调用方跳 redirect 中转路由回来 */
  function beginRefresh(view: TagView): void {
    refreshingName.value = view.name ?? null
  }

  /**
   * 从 localStorage 恢复页签（守卫在首次导航成功后调用）
   * 逐签 resolve 校验：仅保留能解析到布局内非 404 路由的页签（路由变更后失效页签自动剔除）
   */
  function restoreFromStorage(router: Router): void {
    isInitialized.value = true
    const saved = readLocalJson<(Partial<TagView> | null)[]>(TAGS_KEY) ?? []
    views.value = []
    ensureHomeView()
    for (const item of saved) {
      if (!item || typeof item.fullPath !== 'string' || typeof item.path !== 'string') {
        continue
      }
      if (item.fullPath === HOME_PATH) {
        continue
      }
      const resolved = resolveRestorable(item, router)
      if (!resolved) {
        continue
      }
      views.value.push({
        fullPath: item.fullPath,
        path: item.path,
        title: item.title ?? '未命名',
        // 图标按当前路由表重算（旧持久化数据无此字段，路由换图标后自动跟上）
        icon: resolveTagIcon(resolved.matched as unknown as MatchedRecord[]),
        name: item.name,
        query: (item.query as Record<string, unknown>) ?? {},
        affix: false,
        keepAlive: item.keepAlive === true,
      })
    }
    persist()
  }

  /** 恢复校验：能解析到布局内非 404 路由时返回解析结果，否则 null */
  function resolveRestorable(
    item: Partial<TagView>,
    router: Router,
  ): ReturnType<Router['resolve']> | null {
    try {
      const resolved = router.resolve({ path: item.path!, query: item.query as never })
      const keep =
        resolved.matched.length > 0 &&
        resolved.matched.some((record) => record.name === 'Layout') &&
        resolved.name !== 'NotFound'
      return keep ? resolved : null
    } catch {
      return null
    }
  }

  /** 清空页签与持久化（登出时守卫调用；下次登录走恢复流程重建——批次四接认证后启用） */
  function reset(): void {
    views.value = []
    refreshingName.value = null
    removeLocalKey(TAGS_KEY)
    isInitialized.value = false
  }

  return {
    views,
    isInitialized,
    refreshingName,
    cachedNames,
    addView,
    findView,
    closeTab,
    closeOthers,
    closeSide,
    closeAll,
    beginRefresh,
    restoreFromStorage,
    reset,
  }
})
