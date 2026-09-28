/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 多标签操作编排：关闭类动作的跳转兜底与当前页刷新（redirect 中转）——标签栏与右键菜单共用
 */
import type { LocationQueryRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import { useTagsViewStore } from '@/stores/tags-view'
import type { TagView } from '@/stores/tags-view'

export function useTagsActions() {
  const route = useRoute()
  const router = useRouter()
  const tagsView = useTagsViewStore()

  /** 跳到关闭动作返回的目标页签（null 表示无需跳转） */
  function navigateTo(target: TagView | null): void {
    if (!target) {
      return
    }
    router.push({ path: target.path, query: target.query as LocationQueryRaw })
  }

  /** 关闭指定页签（当前签被关时自动跳转相邻签） */
  function closeTab(view: TagView): void {
    navigateTo(tagsView.closeTab(view.fullPath, route.fullPath))
  }

  /** 关闭其他（保留锚点签与固定签） */
  function closeOthers(anchorFullPath: string = route.fullPath): void {
    navigateTo(tagsView.closeOthers(anchorFullPath, route.fullPath))
  }

  /** 关闭左侧 / 右侧（保留锚点签与固定签） */
  function closeSide(anchorFullPath: string, side: 'left' | 'right'): void {
    navigateTo(tagsView.closeSide(anchorFullPath, side, route.fullPath))
  }

  /** 全部关闭（固定签保留，当前签被关时回首页） */
  function closeAll(): void {
    navigateTo(tagsView.closeAll(route.fullPath))
  }

  /**
   * 刷新当前页：先把缓存名单摘掉目标 name（卸载不进缓存），经 redirect 中转路由返回原址强制重建实例
   */
  async function refreshCurrent(): Promise<void> {
    const view = tagsView.findView(route.fullPath)
    if (!view) {
      return
    }
    tagsView.beginRefresh(view)
    await router.replace({ path: `/redirect${view.path}`, query: view.query as LocationQueryRaw })
  }

  return {
    closeTab,
    closeOthers,
    closeSide,
    closeAll,
    refreshCurrent,
  }
}
