import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

import { MAX_ENTRIES, InMemoryNonceStore } from './in-memory-nonce-store'

describe('InMemoryNonceStore', () => {
  let store: InMemoryNonceStore

  beforeEach(() => {
    jest.useFakeTimers()
    store = new InMemoryNonceStore()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('首次消费应返回 false 并记录 nonce', () => {
    expect(store.tryConsume('nonce-a', 60_000)).toBe(false)
  })

  it('ttl 窗口内重复消费同一 nonce 应返回 true（判定为重放）', () => {
    store.tryConsume('nonce-a', 60_000)
    expect(store.tryConsume('nonce-a', 60_000)).toBe(true)
  })

  it('不同 nonce 互不影响', () => {
    store.tryConsume('nonce-a', 60_000)
    expect(store.tryConsume('nonce-b', 60_000)).toBe(false)
    expect(store.tryConsume('nonce-b', 60_000)).toBe(true)
  })

  it('过期后同一 nonce 可再次记录（惰性清理生效）', () => {
    jest.setSystemTime(1_000_000)
    store.tryConsume('nonce-a', 60_000)
    // 推进到过期之后：旧记录被惰性清理，nonce-a 视为首次出现
    jest.setSystemTime(1_000_000 + 60_001)
    expect(store.tryConsume('nonce-a', 60_000)).toBe(false)
  })

  it('恰在过期边界（未超过）仍应判定为重放', () => {
    jest.setSystemTime(1_000_000)
    store.tryConsume('nonce-a', 60_000)
    jest.setSystemTime(1_000_000 + 60_000)
    expect(store.tryConsume('nonce-a', 60_000)).toBe(true)
  })

  it('容量触顶时应驱逐最早写入的条目，保证新 nonce 仍可记录', () => {
    jest.setSystemTime(1_000_000)
    for (let i = 0; i < MAX_ENTRIES; i++)
      store.tryConsume(`nonce-${i}`, 60_000)

    // 容量已满：写入新 nonce 触发驱逐最早的 nonce-0
    expect(store.tryConsume('nonce-new', 60_000)).toBe(false)
    // 新 nonce 已记录：窗口内再次出现判定为重放
    expect(store.tryConsume('nonce-new', 60_000)).toBe(true)
    // nonce-1 仍在窗口内未被驱逐（nonce-0 的消费路径已提前 return，不再触发驱逐）
    expect(store.tryConsume('nonce-1', 60_000)).toBe(true)
    // nonce-0 已被驱逐：重新消费视为首次出现
    expect(store.tryConsume('nonce-0', 60_000)).toBe(false)
  })
})
