import { describe, expect, it, jest } from '@jest/globals'
import type { ArgumentsHost } from '@nestjs/common'
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common'

import { HttpExceptionFilter } from './http-exception.filter'
import { businessError } from '../exceptions/business-error'

/** 构造带 status/json 双 mock 的 ArgumentsHost */
function createHost() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({}) }),
  }
  return { host: host as unknown as ArgumentsHost, response }
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter()

  it('HttpException：HTTP 状态码与 code 应一致，消息取异常描述', () => {
    const { host, response } = createHost()

    filter.catch(new NotFoundException('资源不存在'), host)

    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith({
      code: 404,
      message: '资源不存在',
      data: undefined,
    })
  })

  it('DTO 校验失败：message 字符串数组应拼接为一行', () => {
    const { host, response } = createHost()

    filter.catch(
      new BadRequestException(['name should not be empty', 'name must be a string']),
      host,
    )

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      code: 400,
      message: 'name should not be empty,name must be a string',
      data: undefined,
    })
  })

  it('BusinessError：应透传默认状态码（400）、业务错误码（-1）、消息与附带数据', () => {
    const { host, response } = createHost()

    filter.catch(businessError('未找到该货币的汇率信息', { data: { currency: 'USD' } }), host)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      code: -1,
      message: '未找到该货币的汇率信息',
      data: { currency: 'USD' },
    })
  })

  it('BusinessError：应支持自定义 HTTP 状态码', () => {
    const { host, response } = createHost()

    filter.catch(businessError('汇率必须为正数', { status: 422 }), host)

    expect(response.status).toHaveBeenCalledWith(422)
  })

  it('BusinessError 继承 Error 但不应落入未知异常兜底分支（守护判断顺序）', () => {
    const { host, response } = createHost()

    filter.catch(businessError('业务校验未通过'), host)

    expect(response.status).not.toHaveBeenCalledWith(500)
    expect(response.json).toHaveBeenCalledWith({
      code: -1,
      message: '业务校验未通过',
      data: undefined,
    })
  })

  it('未知异常：应返回 500 与中文化兜底提示，不泄漏原始消息，堆栈写入日志', () => {
    const { host, response } = createHost()
    const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)

    filter.catch(new Error('database connection failed with secret'), host)

    expect(response.status).toHaveBeenCalledWith(500)
    // 全量匹配：若原始消息（而非中文化兜底提示）泄漏到响应体会导致断言失败
    expect(response.json).toHaveBeenCalledWith({
      code: -1,
      message: '服务器内部错误',
      data: undefined,
    })
    expect(loggerSpy).toHaveBeenCalled()

    loggerSpy.mockRestore()
  })
})
