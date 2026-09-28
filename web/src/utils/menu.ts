/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: Layout 子路由树 → 侧栏菜单树（ADR-001：菜单不落库，由静态路由生成；批次四在此层加权限过滤）
 */
import type { RouteRecordRaw } from 'vue-router'

/** 侧栏菜单节点（路由树转换后的渲染形态，与 vue-router 类型解耦） */
export interface MenuNode {
  /** 完整路径（顶级以 / 开头，子级拼接父级） */
  path: string
  /** 菜单标题（route.meta.title） */
  title: string
  /** 图标语义名（route.meta.icon，经 utils/menu-icon 映射为组件） */
  icon?: string
  /** 子菜单（空数组为叶子节点） */
  children: MenuNode[]
}

/** 相对 path 拼上父级绝对路径（顶级自带前导 / 时直接使用） */
function joinPath(base: string, path: string | undefined): string {
  if (!path) {
    return base
  }
  if (path.startsWith('/')) {
    return path
  }
  return `${base.replace(/\/$/, '')}/${path}`
}

function toTitle(route: RouteRecordRaw): string {
  const title = route.meta?.title
  return typeof title === 'string' && title !== '' ? title : '未命名'
}

/**
 * 路由树 → 菜单树：meta.hidden 的路由不进菜单（路由仍注册，供直链访问）
 *
 * @param routes Layout 的 children 路由数组
 * @param base   父级绝对路径（根为 /）
 */
export function buildMenuTree(routes: RouteRecordRaw[], base = '/'): MenuNode[] {
  const nodes: MenuNode[] = []
  for (const route of routes) {
    if (route.meta?.hidden === true) {
      continue
    }
    const path = joinPath(base, route.path)
    const icon = route.meta?.icon
    nodes.push({
      path,
      title: toTitle(route),
      icon: typeof icon === 'string' ? icon : undefined,
      children: buildMenuTree(route.children ?? [], path),
    })
  }
  return nodes
}
