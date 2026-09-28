/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 操作日志拦截器：环绕 @OperateLog 标注的接口，请求线程内取完上下文后异步入库（B3，n-2 AOP 切面的 NestJS 翻译）
 */
import { type CallHandler, type ExecutionContext, HttpException, Injectable, Logger, type NestInterceptor } from '@nestjs/common'
// Reflector 必须值导入：构造注入的参数类型在运行时须保留 design:paramtypes 元数据（import type 会退化为 Function 导致 DI 解析失败）
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { inspect } from 'node:util'
import type { Observable } from 'rxjs'
import { catchError, tap, throwError } from 'rxjs'

import { OperateLogService } from './operate-log.service'
import { REQUEST_USER_KEY, type AuthUser } from '../../../common/decorators/current-user.decorator'
import { OPERATE_LOG_METADATA, type OperateLogOptions } from '../../../common/decorators/operate-log.decorator'
import { GlobalErrorCode } from '../../../common/errors/error-code'
import { BusinessError } from '../../../common/exceptions/business-error'
import { getClientInfo } from '../../../common/utils/client-info'
import { OperateLogEntity } from '../entities/operate-log.entity'

/** requestParams 列宽（对齐表列 varchar(2000)） */
const REQUEST_PARAMS_MAX_LENGTH = 2000
/** resultMsg 列宽（对齐表列 varchar(500)） */
const RESULT_MSG_MAX_LENGTH = 500

/**
 * 操作日志拦截器：全局注册（APP_INTERCEPTOR），排在 TransformInterceptor **之后**
 * ——APP_INTERCEPTOR 数组顺序即洋葱外内序，后注册者为内层、更贴近 handler，
 * 等价 n-2 AOP 切面环绕 controller 方法的切点位置。
 *
 * - 无 @OperateLog 注解的请求**先于任何依赖触达短路放行**（存量接口零开销）
 * - 结果码取值不读 request.apiCode（该回填位只服务访问日志中间件）：
 *   成功路径 Controller 返回裸业务数据按契约 code 恒 0；失败路径从异常对象取
 *   （BusinessError 业务码 / HttpException 状态码 / 未知异常 500），两条路径同源、可单测
 */
@Injectable()
export class OperateLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OperateLogInterceptor.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly operateLogService: OperateLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // 方法级优先于控制器级（getAllAndOverride）
    const options = this.reflector.getAllAndOverride<OperateLogOptions | undefined>(
      OPERATE_LOG_METADATA,
      [context.getHandler(), context.getClass()],
    )
    if (!options)
      return next.handle()

    // 上下文在请求线程内同步取完，任务闭包只持纯数据（异步执行时已脱离请求的 AsyncLocalStorage 域）
    const request = context.switchToHttp().getRequest<Request & Record<string, unknown>>()
    const user = request[REQUEST_USER_KEY] as AuthUser | undefined
    const client = getClientInfo(request)
    const startTime = new Date()

    return next.handle().pipe(
      tap(() => this.record(options, request, user, client, startTime, 0, null)),
      catchError((err: unknown) => {
        const { code, message } = this.resolveError(err)
        this.record(options, request, user, client, startTime, code, message)
        return throwError(() => err)
      }),
    )
  }

  /** 从异常对象提取结果码与消息（与异常过滤器的映射口径一致：业务码 / HTTP 状态码 / 500） */
  private resolveError(err: unknown): { code: number, message: string | null } {
    if (err instanceof BusinessError)
      return { code: err.code, message: err.message }
    if (err instanceof HttpException) {
      const response = err.getResponse()
      const message = typeof response === 'string'
        ? response
        : ((response as { message?: unknown }).message ?? err.message)
      return { code: err.getStatus(), message: typeof message === 'string' ? message : err.message }
    }
    if (err instanceof Error)
      return { code: GlobalErrorCode.INTERNAL_SERVER_ERROR.code, message: `${err.constructor.name}: ${err.message}` }
    return { code: GlobalErrorCode.INTERNAL_SERVER_ERROR.code, message: String(err) }
  }

  /** 组装并异步入库；组装失败仅告警，绝不反噬业务响应 */
  private record(
    options: OperateLogOptions,
    request: Request,
    user: AuthUser | undefined,
    client: { ip: string | null, userAgent: string | null },
    startTime: Date,
    resultCode: number,
    resultMsg: string | null,
  ): void {
    try {
      const entity = new OperateLogEntity()
      entity.userId = user?.id ?? null
      entity.userName = user?.username ?? null
      entity.module = options.module
      entity.name = options.name
      entity.requestMethod = request.method
      entity.requestUrl = this.truncate(request.originalUrl, 255) ?? ''
      entity.requestParams = this.formatParams(request)
      entity.ip = client.ip
      entity.userAgent = this.truncate(client.userAgent, 500)
      entity.startTime = startTime
      entity.durationMs = Date.now() - startTime.getTime()
      entity.resultCode = resultCode
      entity.resultMsg = this.truncate(resultMsg, RESULT_MSG_MAX_LENGTH)
      this.operateLogService.record(entity)
    }
    catch (err) {
      this.logger.warn(`操作日志组装失败：${(err as Error)?.message ?? err}`)
    }
  }

  /**
   * 序列化请求参数：body + query + params 三合一（n-1 Controller 全部经三者取参）。
   * 序列化时 password 键掩敏（n-2 未掩敏，属安全改进）；JSON 失败（如循环引用）降级 util.inspect。
   */
  private formatParams(request: Request): string | null {
    // express 的 body/query/params 是 any：收敛到 unknown 后再序列化（避开 unsafe-any 检查）
    const raw = {
      body: request.body as unknown,
      query: request.query as unknown,
      params: request.params as unknown,
    }
    try {
      return this.truncate(
        JSON.stringify(raw, (key: string, value: unknown) =>
          key.toLowerCase().includes('password') ? '******' : value),
        REQUEST_PARAMS_MAX_LENGTH,
      )
    }
    catch {
      // 循环引用等无法 JSON 化的形态，降级 util.inspect
      return this.truncate(inspect(raw), REQUEST_PARAMS_MAX_LENGTH)
    }
  }

  /** 截断到列宽（null 直通） */
  private truncate(value: string | null | undefined, maxLength: number): string | null {
    if (value === null || value === undefined)
      return null
    return value.length > maxLength ? value.slice(0, maxLength) : value
  }
}
