import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Component } from 'vue'

import { SLOT_KEYS } from '@/framework/slots/keys'
import {
  clearComponentOverrides,
  getComponentOverride,
  registerComponentOverride,
} from '@/framework/slots/registry'

/** 以普通对象模拟组件（避开 spec 文件内多组件告警） */
const stubA = { name: 'StubA' } as unknown as Component
const stubB = { name: 'StubB' } as unknown as Component

beforeEach(() => {
  vi.clearAllMocks()
  clearComponentOverrides()
})

describe('组件槽位注册表', () => {
  it('注册后可读取，未注册槽位返回 undefined（兜底默认组件）', () => {
    registerComponentOverride(SLOT_KEYS.layoutLogo, stubA)

    expect(getComponentOverride(SLOT_KEYS.layoutLogo)).toBe(stubA)
    expect(getComponentOverride(SLOT_KEYS.layoutHeaderTool)).toBeUndefined()
  })

  it('未知 key：告警且不注册（运行时兜底，防拼错）', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    registerComponentOverride('layout:not-exist' as never, stubA)

    expect(warnSpy).toHaveBeenCalledOnce()
    expect(getComponentOverride('layout:not-exist' as never)).toBeUndefined()
  })

  it('重复注册同一槽位：告警且后注册者生效', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    registerComponentOverride(SLOT_KEYS.layoutLogo, stubA)
    registerComponentOverride(SLOT_KEYS.layoutLogo, stubB)

    expect(getComponentOverride(SLOT_KEYS.layoutLogo)).toBe(stubB)
    // 开发环境告警（import.meta.env.DEV 在 vitest 下为 true）
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('clearComponentOverrides 清空后回到兜底', () => {
    registerComponentOverride(SLOT_KEYS.layoutLogo, stubA)
    clearComponentOverrides()

    expect(getComponentOverride(SLOT_KEYS.layoutLogo)).toBeUndefined()
  })
})
