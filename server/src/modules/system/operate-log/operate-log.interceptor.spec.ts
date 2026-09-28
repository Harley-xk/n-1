import { describe, expect, it, jest } from '@jest/globals'
import { BadRequestException, type CallHandler, type ExecutionContext } from '@nestjs/common'
import { of, throwError } from 'rxjs'
import { firstValueFrom } from 'rxjs'

import { OperateLogInterceptor } from './operate-log.interceptor'
import { REQUEST_USER_KEY } from '../../../common/decorators/current-user.decorator'
import type { OperateLogOptions } from '../../../common/decorators/operate-log.decorator'
import { businessError } from '../../../common/exceptions/business-error'
import type { OperateLogEntity } from '../entities/operate-log.entity'
import { SystemErrorCode } from '../error-codes'

/** 构造伪 ExecutionContext（拦截器的全部依赖面：handler / class / request；reflector 为 mock，键值不消费） */
function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => 'handler',
    getClass: () => 'controller',
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}

/** 构造拦截器 + record 桩（operateLogService.record 的形态） */
function makeInterceptor(options?: OperateLogOptions) {
  const record = jest.fn<(entity: OperateLogEntity) => void>()
  const interceptor = new OperateLogInterceptor(
    { getAllAndOverride: jest.fn(() => options) } as never,
    { record } as never,
  )
  return { interceptor, record }
}

/** 一条带认证用户与客户端头的完整请求 */
function makeRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    method: 'POST',
    originalUrl: '/api/system/user/create',
    body: { username: 'alice' },
    query: { from: 'admin' },
    params: {},
    headers: { 'x-forwarded-for': '203.0.113.5', 'user-agent': 'jest-agent' },
    [REQUEST_USER_KEY]: { id: '00000000-0000-0000-0000-000000000001', username: 'admin' },
    socket: { remoteAddress: '10.0.0.1' },
    ...overrides,
  }
}

const OPTIONS: OperateLogOptions = { module: '用户管理', name: '创建用户' }

describe('OperateLogInterceptor 无注解短路', () => {
  it('无 @OperateLog 注解的请求应直通且不触达日志服务', async () => {
    const { interceptor, record } = makeInterceptor(undefined)
    const next = { handle: jest.fn(() => of('ok')) }
    await expect(firstValueFrom(interceptor.intercept(makeContext(makeRequest()), next as unknown as CallHandler))).resolves.toBe('ok')
    expect(next.handle).toHaveBeenCalledTimes(1)
    expect(record).not.toHaveBeenCalled()
  })
})

describe('OperateLogInterceptor 成功路径', () => {
  it('应组装完整实体并以 resultCode 0 异步入库', async () => {
    const { interceptor, record } = makeInterceptor(OPTIONS)
    const result = await firstValueFrom(interceptor.intercept(makeContext(makeRequest()), { handle: () => of('ok') }))
    expect(result).toBe('ok')
    expect(record).toHaveBeenCalledTimes(1)
    const entity = record.mock.calls[0][0]
    expect(entity.userId).toBe('00000000-0000-0000-0000-000000000001')
    expect(entity.userName).toBe('admin')
    expect(entity.module).toBe('用户管理')
    expect(entity.name).toBe('创建用户')
    expect(entity.requestMethod).toBe('POST')
    expect(entity.requestUrl).toBe('/api/system/user/create')
    expect(entity.requestParams).toContain('"username":"alice"')
    expect(entity.ip).toBe('203.0.113.5')
    expect(entity.userAgent).toBe('jest-agent')
    expect(entity.startTime).toBeInstanceOf(Date)
    expect(entity.durationMs).toBeGreaterThanOrEqual(0)
    expect(entity.resultCode).toBe(0)
    expect(entity.resultMsg).toBeNull()
  })

  it('未登录上下文（无 request.user）应记 userId / userName 为 null', async () => {
    const { interceptor, record } = makeInterceptor(OPTIONS)
    const request = makeRequest({ [REQUEST_USER_KEY]: undefined })
    await firstValueFrom(interceptor.intercept(makeContext(request), { handle: () => of('ok') }))
    expect(record.mock.calls[0][0].userId).toBeNull()
    expect(record.mock.calls[0][0].userName).toBeNull()
  })

  it('password 键（含大小写变体）应掩敏后入库', async () => {
    const { interceptor, record } = makeInterceptor(OPTIONS)
    const request = makeRequest({ body: { username: 'alice', password: 'secret', newPassword: 'n3w-p4ss' } })
    await firstValueFrom(interceptor.intercept(makeContext(request), { handle: () => of('ok') }))
    const params = record.mock.calls[0][0].requestParams ?? ''
    expect(params).not.toContain('secret')
    expect(params).not.toContain('n3w-p4ss')
    expect(params).toContain('******')
  })

  it('超长参数应截断到 2000 字符（列宽契约）', async () => {
    const { interceptor, record } = makeInterceptor(OPTIONS)
    const request = makeRequest({ body: { remark: 'x'.repeat(3000) } })
    await firstValueFrom(interceptor.intercept(makeContext(request), { handle: () => of('ok') }))
    expect(record.mock.calls[0][0].requestParams).toHaveLength(2000)
  })

  it('循环引用参数应降级 inspect 而非中断', async () => {
    const { interceptor, record } = makeInterceptor(OPTIONS)
    const circular: Record<string, unknown> = { name: 'circle' }
    circular.self = circular
    const request = makeRequest({ body: circular })
    const result = await firstValueFrom(interceptor.intercept(makeContext(request), { handle: () => of('ok') }))
    expect(result).toBe('ok')
    const params = record.mock.calls[0][0].requestParams ?? ''
    expect(params).toContain('circle')
  })

  it('日志服务自身故障不得反噬业务响应（只告警契约）', async () => {
    const record = jest.fn<(entity: OperateLogEntity) => void>(() => {
      throw new Error('队列提交失败')
    })
    const interceptor = new OperateLogInterceptor(
      { getAllAndOverride: jest.fn(() => OPTIONS) } as never,
      { record } as never,
    )
    await expect(
      firstValueFrom(interceptor.intercept(makeContext(makeRequest()), { handle: () => of('ok') })),
    ).resolves.toBe('ok')
  })
})

describe('OperateLogInterceptor 失败路径', () => {
  it('BusinessError 应取分段业务码并透传异常', async () => {
    const { interceptor, record } = makeInterceptor(OPTIONS)
    const next = { handle: () => throwError(() => businessError('用户不存在', { code: SystemErrorCode.USER_NOT_EXISTS })) }
    await expect(firstValueFrom(interceptor.intercept(makeContext(makeRequest()), next as unknown as CallHandler))).rejects.toThrow('用户不存在')
    expect(record.mock.calls[0][0].resultCode).toBe(SystemErrorCode.USER_NOT_EXISTS.code)
    expect(record.mock.calls[0][0].resultMsg).toBe('用户不存在')
  })

  it('HttpException 应取 HTTP 状态码', async () => {
    const { interceptor, record } = makeInterceptor(OPTIONS)
    const next = { handle: () => throwError(() => new BadRequestException('参数不合法')) }
    await expect(firstValueFrom(interceptor.intercept(makeContext(makeRequest()), next as unknown as CallHandler))).rejects.toThrow('参数不合法')
    expect(record.mock.calls[0][0].resultCode).toBe(400)
    expect(record.mock.calls[0][0].resultMsg).toBe('参数不合法')
  })

  it('未知 Error 应取通用 500 码并带类名前缀', async () => {
    const { interceptor, record } = makeInterceptor(OPTIONS)
    const next = { handle: () => throwError(() => new Error('boom')) }
    await expect(firstValueFrom(interceptor.intercept(makeContext(makeRequest()), next as unknown as CallHandler))).rejects.toThrow('boom')
    expect(record.mock.calls[0][0].resultCode).toBe(500)
    expect(record.mock.calls[0][0].resultMsg).toBe('Error: boom')
  })

  it('失败也应记录完整实体（方法 / URL / 用户 / 参数）', async () => {
    const { interceptor, record } = makeInterceptor(OPTIONS)
    const next = { handle: () => throwError(() => new Error('boom')) }
    await expect(firstValueFrom(interceptor.intercept(makeContext(makeRequest()), next as unknown as CallHandler))).rejects.toThrow()
    const entity = record.mock.calls[0][0]
    expect(entity.userId).toBe('00000000-0000-0000-0000-000000000001')
    expect(entity.requestUrl).toBe('/api/system/user/create')
    expect(entity.requestParams).toContain('"username":"alice"')
  })
})
