import { describe, expect, it, jest } from '@jest/globals'

import { SecurityHeadersMiddleware } from './security-headers.middleware'

/** 构造带 setHeader 记录的 response mock（headers 收集实际写入值） */
function createResponse() {
  const headers: Record<string, string> = {}
  const setHeader = jest.fn((name: string, value: string) => {
    headers[name] = value
  })
  return { headers, setHeader }
}

describe('SecurityHeadersMiddleware', () => {
  const middleware = new SecurityHeadersMiddleware()

  it('应为响应注入全部六个安全响应头', () => {
    const { headers, setHeader } = createResponse()

    middleware.use({} as never, { setHeader } as never, jest.fn())

    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Cache-Control']).toBe('no-cache, no-store, max-age=0, must-revalidate')
    expect(headers.Pragma).toBe('no-cache')
    expect(headers.Expires).toBe('0')
    expect(headers['Referrer-Policy']).toBe('no-referrer')
  })

  it('响应头必须在放行（next）之前设置完毕，随后放行到下一环节', () => {
    const { headers, setHeader } = createResponse()
    const next = jest.fn()

    middleware.use({} as never, { setHeader } as never, next)
    expect(headers['X-Content-Type-Options']).toBeDefined()

    expect(setHeader).toHaveBeenCalledTimes(6)
    expect(next).toHaveBeenCalledTimes(1)
    // 头先于放行设置，才能覆盖后续所有响应（含错误路径）
    expect(setHeader.mock.invocationCallOrder[0]).toBeLessThan(next.mock.invocationCallOrder[0])
  })
})
