/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: @CurrentUser 参数装饰器：从请求对象取 JwtAuthGuard 挂载的当前用户信息
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

/** 已认证请求上的用户信息（JwtAuthGuard 校验通过后挂载） */
export interface AuthUser {
  id: string
  username: string
}

/** 请求对象上的挂载键 */
export const REQUEST_USER_KEY = 'user'

/** 取当前登录用户：@CurrentUser() user: AuthUser */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<Request & Record<string, unknown>>()
    return request[REQUEST_USER_KEY] as AuthUser
  },
)
