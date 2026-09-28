/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 请求上下文中间件——为每个请求开启 AsyncLocalStorage 域，供审计填充等横切设施读取
 */
import type { NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

import { requestContext } from '../context/request-context'

export class RequestContextMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction): void {
    requestContext.run({}, () => next())
  }
}
