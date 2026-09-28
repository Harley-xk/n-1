/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 全局异常过滤器：将所有未捕获异常归一化为统一响应结构，未知异常不向客户端泄漏细节
 */

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { Catch, HttpException, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'

import { GlobalErrorCode } from '../errors/error-code'
import { BusinessError } from '../exceptions/business-error'
import type { ApiResponse } from '../interfaces/api-response.interface'
import { setResponseCode } from '../utils/response-code'

/** 全局异常过滤器：失败路径的统一出口 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const request = host.switchToHttp().getRequest<Request>()

    let status = 500
    let code = GlobalErrorCode.INTERNAL_SERVER_ERROR.code
    let message = '服务器内部错误'
    let data: unknown

    if (exception instanceof HttpException) {
      // Nest 内置异常（路由 404、鉴权 401、DTO 校验 400 等）：
      // code 取通用段分段码（模块/子域段为 0，数值上等于 HTTP 状态码本身，
      // 便于排查对读），仅为参考标识——此类响应必伴随 4xx/5xx，前端以 HTTP 状态码判定失败
      status = exception.getStatus()
      code = status
      const payload = exception.getResponse() as Record<string, unknown> | string
      // DTO 校验失败时 message 为字符串数组，拼接为一行便于前端直接展示
      message = typeof payload === 'object' && Array.isArray(payload.message)
        ? (payload.message as string[]).join(',')
        : exception.message
    }
    else if (exception instanceof BusinessError) {
      // 判断顺序约束：BusinessError 继承自 Error，必须先于 Error 兜底分支判断，
      // 否则业务错误会被吞成 500「服务器内部错误」（由单测与 e2e 共同守护）
      status = exception.status
      code = exception.code
      message = exception.message
      data = exception.data
    }
    else if (exception instanceof Error) {
      // 未知异常：原始消息与堆栈只写服务端日志，客户端仅收中文化兜底提示，不泄漏内部细节
      this.logger.error(exception.message, exception.stack)
    }

    // 回填业务响应码供访问日志读取（响应流式写出后无法再取响应体）
    setResponseCode(request, code)

    const body: ApiResponse<unknown> = { code, message, data }
    response.status(status).json(body)
  }
}
