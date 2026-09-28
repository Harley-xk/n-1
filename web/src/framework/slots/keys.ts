/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 组件槽位注册表——槽位 key 常量与类型（业务覆盖机制的唯一合法入口，见 docs/前端/布局与风格设计.md §5）
 */

/** 可覆盖槽位清单（新增槽位：此处加键 + 布局模板挂 SlotRenderer + 设计文档登记） */
export const SLOT_KEYS = {
  /** 顶栏左侧品牌区（默认：logo + 系统名） */
  layoutLogo: 'layout:logo',
  /** 顶栏右侧工具区，用户区左侧（默认：主题切换） */
  layoutHeaderTool: 'layout:header-tool',
  /** 顶栏最右用户区（默认：访客展示，批次四接认证升级为用户下拉） */
  layoutHeaderUser: 'layout:header-user',
  /** 侧栏底部附加区（默认：无） */
  layoutSidebarBottom: 'layout:sidebar-bottom',
  /** 标签栏左侧（默认：无） */
  layoutTagsbarLeft: 'layout:tagsbar-left',
  /** 标签栏右侧（默认：刷新 + 快捷关闭） */
  layoutTagsbarRight: 'layout:tagsbar-right',
} as const

/** 槽位 key 类型（字面量联合，编译期拦截未知槽位） */
export type SlotKey = (typeof SLOT_KEYS)[keyof typeof SLOT_KEYS]

/** 运行时校验（防 JS 调用方 / 拼错 key） */
export function isSlotKey(key: string): key is SlotKey {
  return Object.values(SLOT_KEYS).includes(key as SlotKey)
}
