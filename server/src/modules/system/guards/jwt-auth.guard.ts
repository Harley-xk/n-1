/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 全局 JWT 认证守卫：@Public 豁免 → 解析 Bearer token → 用户存在性校验（ADR-003）→ 激活审计上下文
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

import { requestContext } from '../../../common/context/request-context'
import { REQUEST_USER_KEY, type AuthUser } from '../../../common/decorators/current-user.decorator'
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator'
import { AuthService } from '../auth/auth.service'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @Public 豁免（方法级优先于控制器级）：登录、健康检查等对外免登录接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic)
      return true

    const request = context.switchToHttp().getRequest<Request & Record<string, unknown>>()

    // 解析 Authorization: Bearer <token>（ADR-003 定稿形态）
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer '))
      throw new UnauthorizedException('账号未登录')
    const token = header.slice('Bearer '.length).trim()
    if (!token)
      throw new UnauthorizedException('账号未登录')

    // 验签与有效期：失败统一 401，不给探测者区分「签名错 / 过期 / 格式错」
    let payload: { sub?: string, username?: string }
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      })
    }
    catch {
      throw new UnauthorizedException('登录已过期，请重新登录')
    }
    if (!payload.sub || !payload.username)
      throw new UnauthorizedException('登录状态无效')

    // 用户存在性校验（ADR-003）：禁用 / 删除的已发 token 即时失效；逐请求查库，缓存留作后续优化后手
    const user = await this.authService.getActiveUserById(payload.sub)
    if (!user)
      throw new UnauthorizedException('登录状态已失效，请重新登录')

    // 一行激活审计填充（批次二预埋通路）：后续 Repository 写操作的 creator / updater 即此用户
    requestContext.setUserId(user.id)
    request[REQUEST_USER_KEY] = { id: user.id, username: user.username } satisfies AuthUser
    return true
  }
}
