import { describe, expect, it } from '@jest/globals'
import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { StreamableFile } from '@nestjs/common'
import { of } from 'rxjs'

import { TransformInterceptor } from './transform.interceptor'

/** 构造带可变状态码的执行上下文 mock */
function createContext(statusCode: number) {
  const response = { statusCode }
  const context = {
    switchToHttp: () => ({ getResponse: () => response }),
  }
  return { context: context as unknown as ExecutionContext, response }
}

/** 构造返回指定数据的 CallHandler mock */
function callHandlerWith<T>(data: T): CallHandler<T> {
  return { handle: () => of(data) }
}

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor()

  it('应将 200 响应的返回值包装为 { code: 0, data } 且不含 message 字段', () => {
    const { context } = createContext(200)
    const payload = { name: 'n-1 API', version: '0.1.0' }

    interceptor.intercept(context, callHandlerWith(payload)).subscribe((result) => {
      expect(result).toEqual({ code: 0, data: payload })
      expect('message' in result).toBe(false)
    })
  })

  it('应将 data 中的 Date 转换为毫秒 Unix 时间戳', () => {
    const { context } = createContext(200)
    const date = new Date('2026-09-10T08:30:00.000Z')

    interceptor
      .intercept(context, callHandlerWith({ status: 'ok', timestamp: date }))
      .subscribe((result) => {
        expect(result).toEqual({ code: 0, data: { status: 'ok', timestamp: date.getTime() } })
      })
  })

  it('StreamableFile（文件下载）应原样直通不包装', () => {
    const { context } = createContext(200)
    const file = new StreamableFile(Buffer.from('测试文件内容'))

    interceptor.intercept(context, callHandlerWith(file)).subscribe((result) => {
      expect(result).toBe(file)
    })
  })

  it('应将 201 状态码归一为 200（POST 创建统一 200）', () => {
    const { context, response } = createContext(201)

    interceptor.intercept(context, callHandlerWith({ id: 1 })).subscribe(() => {
      expect(response.statusCode).toBe(200)
    })
  })

  it('非 2xx 状态码时 code 应兜底为 -1', () => {
    const { context } = createContext(404)

    interceptor.intercept(context, callHandlerWith({})).subscribe((result) => {
      expect(result).toEqual({ code: -1, data: {} })
    })
  })
})
