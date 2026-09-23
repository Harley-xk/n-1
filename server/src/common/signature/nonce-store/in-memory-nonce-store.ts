/*
 * 作者: Harley-xk
 * 创建: 2026-09-11
 *
 * 描述: 内存 nonce 防重放存储：TTL 惰性清理 + 容量上限驱逐，单实例部署适用（多实例需替换为集中式存储）
 */

import { Injectable } from '@nestjs/common'

import type { NonceStore } from '../interfaces/signature-scheme.interface'

/** nonce 存储注入 token：以 useClass/useValue 覆盖即可替换实现（如 Redis） */
export const NONCE_STORE = Symbol('NONCE_STORE')

/** 存储容量上限：正常流量远达不到（时间窗内 1 万个写请求/实例），触顶即异常流量，触发驱逐保护（导出供单测构造触顶场景） */
export const MAX_ENTRIES = 10_000

@Injectable()
export class InMemoryNonceStore implements NonceStore {
  /** nonce → 过期时刻（毫秒时间戳） */
  private readonly used = new Map<string, number>()

  tryConsume(nonce: string, ttlMs: number): boolean {
    const now = Date.now()
    // 惰性清理：消费时顺带清除已过期条目（严格小于：存活恰满 ttl 的条目仍视为窗口内，判定重放）
    for (const [key, expireAt] of this.used) {
      if (expireAt < now)
        this.used.delete(key)
    }

    if (this.used.has(nonce))
      return true

    // 容量触顶：驱逐最早写入的条目（Map 迭代序即插入序，最早条目的过期时刻通常也最早）
    if (this.used.size >= MAX_ENTRIES) {
      const oldest = this.used.keys().next().value as string | undefined
      if (oldest !== undefined)
        this.used.delete(oldest)
    }

    this.used.set(nonce, now + ttlMs)
    return false
  }
}
