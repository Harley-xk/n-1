/*
 * 作者: Harley-xk
 * 创建: 2026-09-11
 *
 * 描述: 全局签名守卫：按「开关 → 豁免 → 写方法判断 → 方案分发」顺序执行签名校验，方案异常统一转 401
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import { SIGNATURE_SKIP_METADATA } from './decorators/skip-signature.decorator'
import { SIGNATURE_SCHEME_METADATA } from './decorators/use-signature.decorator'
import type { SignatureContext } from './interfaces/signature-scheme.interface'
import { STANDARD_SCHEME_NAME, SignatureSchemeRegistry } from './signature-scheme.registry'

/** 默认参与签名校验的写方法；GET/HEAD/OPTIONS 默认豁免（OPTIONS 为防御性豁免，预检请求实际在 CORS 中间件层已短路） */
const SIGNED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

@Injectable()
export class SignatureGuard implements CanActivate {
  private readonly logger = new Logger(SignatureGuard.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
    private readonly registry: SignatureSchemeRegistry,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 总开关：关闭时全放行
    if (!this.configService.get<boolean>('signature.enabled'))
      return true

    // @SkipSignature 豁免（方法级/控制器级）
    const skip = this.reflector.getAllAndOverride<boolean>(SIGNATURE_SKIP_METADATA, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skip)
      return true

    const request = context.switchToHttp().getRequest<Request>()
    // 仅写方法参与签名校验
    if (!SIGNED_METHODS.has(request.method))
      return true

    // @UseSignature 指定方案（方法级优先于控制器级），默认标准方案
    const schemeName = this.reflector.getAllAndOverride<string>(SIGNATURE_SCHEME_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]) ?? STANDARD_SCHEME_NAME
    const scheme = this.registry.get(schemeName)
    if (!scheme) {
      // 方案名仅来自代码内装饰器，不受外部输入影响：缺失属编程错误（拼写错/漏注册），记日志并以 500 暴露
      this.logger.error(`签名方案「${schemeName}」未注册`)
      throw new InternalServerErrorException('签名校验失败')
    }

    const verifyContext: SignatureContext = {
      request,
      rawBody: request.rawBody,
      secret: this.configService.get<string>('signature.secret') ?? '',
      expireMs: this.configService.get<number>('signature.expireMs') ?? 0,
    }

    try {
      await scheme.verify(verifyContext)
      return true
    }
    catch (error: unknown) {
      // 失败原因仅入服务端日志；客户端统一 401 文案，不给探测者反馈「差哪一步」
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.warn(`签名校验失败（${request.method} ${request.path}）：${reason}`)
      throw new UnauthorizedException('签名校验失败')
    }
  }
}
