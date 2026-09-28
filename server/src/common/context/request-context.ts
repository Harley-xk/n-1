/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 请求级异步上下文（AsyncLocalStorage）——为审计填充等横切设施提供「当前操作人」通路
 */
import { AsyncLocalStorage } from 'node:async_hooks'

interface RequestContextStore {
  /** 当前操作人（用户 id）；批次四接 JWT 后由 Guard 回填 */
  userId?: string
}

const storage = new AsyncLocalStorage<RequestContextStore>()

export const requestContext = {
  /** 请求中间件调用：开启请求级异步上下文域，域内所有异步链路共享 store */
  run<T>(store: RequestContextStore, callback: () => T): T {
    return storage.run(store, callback)
  },

  /** 当前操作人 id；域外调用或未设置时为 undefined */
  get userId(): string | undefined {
    return storage.getStore()?.userId
  },

  /** 回填操作人（store 为可变对象，Guard 解出 token 后写入即可） */
  setUserId(userId: string): void {
    const store = storage.getStore()
    if (store) {
      store.userId = userId
    }
  },
}
