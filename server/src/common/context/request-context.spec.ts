import { describe, expect, it } from '@jest/globals'

import { requestContext } from './request-context'

describe('requestContext 请求上下文', () => {
  it('应在上下文域内读取操作人', () => {
    requestContext.run({ userId: 'u-1' }, () => {
      expect(requestContext.userId).toBe('u-1')
    })
  })

  it('应跨异步链路传播（嵌套 Promise 回调内仍可读取）', async () => {
    await requestContext.run({ userId: 'u-2' }, async () => {
      await Promise.resolve()
      expect(requestContext.userId).toBe('u-2')
    })
  })

  it('域外调用返回 undefined（无上下文的系统级链路）', () => {
    expect(requestContext.userId).toBeUndefined()
  })

  it('setUserId 应在域内覆盖操作人（Guard 回填场景）', () => {
    requestContext.run({}, () => {
      requestContext.setUserId('u-3')
      expect(requestContext.userId).toBe('u-3')
    })
  })

  it('域外调用 setUserId 不应抛错（防御分支）', () => {
    expect(() => requestContext.setUserId('u-4')).not.toThrow()
  })

  it('并发请求的上下文互不串扰', async () => {
    const seen: (string | undefined)[] = []
    await Promise.all([
      requestContext.run({ userId: 'a' }, async () => {
        await new Promise(resolve => setTimeout(resolve, 5))
        seen.push(requestContext.userId)
      }),
      requestContext.run({ userId: 'b' }, async () => {
        await new Promise(resolve => setTimeout(resolve, 1))
        seen.push(requestContext.userId)
      }),
    ])
    expect(seen).toContain('a')
    expect(seen).toContain('b')
    expect(seen).not.toContain(undefined)
  })
})
