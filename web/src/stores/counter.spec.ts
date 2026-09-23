// 示例单元测试：验证 counter store 的 state / getters / actions 基本行为
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCounterStore } from './counter'

describe('useCounterStore', () => {
  beforeEach(() => {
    // 每个用例独立 Pinia 实例，避免状态串扰
    setActivePinia(createPinia())
  })

  it('初始 count 为 0', () => {
    const counter = useCounterStore()
    expect(counter.count).toBe(0)
    expect(counter.doubleCount).toBe(0)
  })

  it('increment 使 count 自增', () => {
    const counter = useCounterStore()
    counter.increment()
    expect(counter.count).toBe(1)
  })

  it('doubleCount 始终为 count 的两倍', () => {
    const counter = useCounterStore()
    counter.increment()
    counter.increment()
    expect(counter.count).toBe(2)
    expect(counter.doubleCount).toBe(4)
  })
})
