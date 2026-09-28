/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 接口访问日志中间件：为业务接口输出含业务响应码与耗时的一行访问日志
 */

import { Logger } from '@nestjs/common'
import type { NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

import '../utils/response-code'

/**
 * 接口访问日志中间件：仅记录业务请求（`/api` 根与 `/api/**`），输出形如
 * `GET /api/health -> 200(code=0), 耗时 3ms` 的一行日志。
 *
 * - 业务 code 来自响应包装拦截器 / 异常过滤器经 `setResponseCode` 回填到 request 的值
 *   （HTTP 响应流式写出后无法再取响应体，request 属性回填是唯一通路）；
 *   文件直通等未回填的响应省略 code 段
 * - 异常堆栈不在本中间件输出（由全局异常过滤器统一记录）
 * - `/api-docs` 文档与静态资源不记（`/api/` 前缀匹配恰好将其排除）
 */
export class AccessLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger('ApiAccessLog')

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl } = request

    // 仅记录业务接口：/api 根与 /api/** 记录，/api-docs 文档与静态资源排除
    if (originalUrl !== '/api' && !originalUrl.startsWith('/api/')) {
      next()
      return
    }

    const start = Date.now()
    response.on('finish', () => {
      // apiCode 经声明合并直接挂在 Request 类型上（见 utils/response-code.ts）
      const code = request.apiCode
      const codeSegment = code === undefined ? '' : `(code=${code})`
      this.logger.log(
        `${method} ${originalUrl} -> ${response.statusCode}${codeSegment}, 耗时 ${Date.now() - start}ms`,
      )
    })
    next()
  }
}
