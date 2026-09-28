/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 菜单图标语义名 → Element Plus 图标组件映射（路由 meta.icon 的值为语义名，未命中兜底 Menu）
 */
import {
  Collection,
  Document,
  HomeFilled,
  Key,
  Menu,
  Monitor,
  OfficeBuilding,
  Setting,
  Suitcase,
  Tools,
  User,
  UserFilled,
} from '@element-plus/icons-vue'
import type { Component } from 'vue'

/** 语义图标名映射（路由 meta.icon 的取值域；新增菜单时在此登记） */
const ICON_MAP: Record<string, Component> = {
  home: HomeFilled,
  system: Setting,
  user: User,
  peoples: UserFilled,
  dept: OfficeBuilding,
  post: Suitcase,
  dict: Collection,
  config: Tools,
  'operate-log': Document,
  'login-log': Key,
  online: Monitor,
  demo: Collection,
}

export function resolveMenuIcon(icon: string | null | undefined): Component {
  if (icon && ICON_MAP[icon]) {
    return ICON_MAP[icon]
  }
  return Menu
}
