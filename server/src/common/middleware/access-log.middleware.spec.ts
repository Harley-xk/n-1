import { describe, expect, it, jest } from '@jest/globals'
import { Logger } from '@nestjs/common'
import { EventEmitter } from 'node:events'

import { AccessLogMiddleware } from './access-log.middleware'

/** 构造带状态码、可触发 finish 事件的 response mock */
function createResponse(statusCode = 200) {
  const response = new EventEmitter() as EventEmitter & { statusCode: number }
  response.statusCode = statusCode
  return response
}

/** 构造访问日志中间件的 request mock（originalUrl 与可选的业务响应码回填位） */
function createRequest(originalUrl: string, apiCode?: number) {
  return { method: 'GET', originalUrl, apiCode } as never
}

describe('AccessLogMiddleware', () => {
  const middleware = new AccessLogMiddleware()

  it('业务接口响应结束后应输出含方法/路径/状态码/业务码/耗时的一行日志', () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    const response = createResponse(200)

    middleware.use(createRequest('/api/health', 0), response as never, jest.fn())
    response.emit('finish')

    expect(loggerSpy).toHaveBeenCalledTimes(1)
    // 日志上下文（ApiAccessLog）由 Logger 实例携带，调用参数即消息本体
    const message = loggerSpy.mock.calls[0][0] as string
    expect(message).toMatch(/^GET \/api\/health -> 200\(code=0\), 耗时 \d+ms$/)

    loggerSpy.mockRestore()
  })

  it('/api 根接口应记录（/api-docs 文档与静态资源不记）', () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)

    const rootResponse = createResponse()
    middleware.use(createRequest('/api', 0), rootResponse as never, jest.fn())
    rootResponse.emit('finish')

    const docsResponse = createResponse()
    middleware.use(createRequest('/api-docs'), docsResponse as never, jest.fn())
    docsResponse.emit('finish')

    expect(loggerSpy).toHaveBeenCalledTimes(1)
    expect(loggerSpy.mock.calls[0][0]).toContain('GET /api -> ')

    loggerSpy.mockRestore()
  })

  it('未回填业务码的响应（如文件直通）应省略 code 段', () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    const response = createResponse(200)

    middleware.use(createRequest('/api/export'), response as never, jest.fn())
    response.emit('finish')

    expect(loggerSpy).toHaveBeenCalledTimes(1)
    expect(loggerSpy.mock.calls[0][0]).toMatch(/^GET \/api\/export -> 200, 耗时 \d+ms$/)

    loggerSpy.mockRestore()
  })

  it('非业务前缀请求应直接放行且不注册任何日志监听', () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    const next = jest.fn()
    const response = createResponse()

    middleware.use(createRequest('/some-static/app.js'), response as never, next)
    response.emit('finish')

    expect(next).toHaveBeenCalledTimes(1)
    expect(loggerSpy).not.toHaveBeenCalled()

    loggerSpy.mockRestore()
  })
})
