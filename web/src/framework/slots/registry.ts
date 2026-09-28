/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 组件槽位注册表：业务注册组件覆盖框架指定槽位，未注册槽位渲染布局内置默认组件
 */
import { markRaw, shallowReactive } from 'vue'
import type { Component } from 'vue'

import { isSlotKey } from './keys'
import type { SlotKey } from './keys'

/** 槽位 → 覆盖组件（shallowReactive：支持挂载后注册，插入即触发 SlotRenderer 重渲染） */
const overrides = shallowReactive(new Map<SlotKey, Component>())

/**
 * 注册槽位覆盖组件（业务在 main.ts 挂载前调用；挂载后调用同样生效）
 *
 * 重复注册同一槽位：开发环境告警，后注册者生效（幂等覆盖）
 */
export function registerComponentOverride(key: SlotKey, component: Component): void {
  if (!isSlotKey(key)) {
    console.warn(`[slots] 未知的组件槽位 key：${key}，可用槽位见 SLOT_KEYS`)
    return
  }
  if (import.meta.env.DEV && overrides.has(key)) {
    console.warn(`[slots] 槽位 ${key} 已有覆盖组件，后注册者生效`)
  }
  overrides.set(key, markRaw(component))
}

/** 读取槽位覆盖组件（未注册返回 undefined，SlotRenderer 据此回退默认组件） */
export function getComponentOverride(key: SlotKey): Component | undefined {
  if (!isSlotKey(key)) {
    return undefined
  }
  return overrides.get(key)
}

/** 清空全部覆盖（单测隔离用） */
export function clearComponentOverrides(): void {
  overrides.clear()
}
