/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 业务异常：业务流程中可预期的失败，经全局异常过滤器转为统一错误响应
 */

import { ErrorCode, GlobalErrorCode } from '../errors/error-code'

/** 业务错误构造选项 */
export interface BusinessErrorOptions {
  /** HTTP 状态码，默认 400 */
  status?: number
  /** 分段错误码常量（模块段位登记见 docs/指南/统一响应与异常处理设计.md），默认通用段未分类业务错误 999 */
  code?: ErrorCode
  /** 附带数据：如表单校验的逐行错误明细，随错误一起返回给前端 */
  data?: unknown
}

/**
 * 业务错误：业务规则不满足等可预期失败的标准表达方式。
 * 继承 Error 以保留真实堆栈供服务端日志定位抛出点。
 */
export class BusinessError extends Error {
  /** HTTP 状态码 */
  override name = 'BusinessError'
  /** HTTP 状态码，默认 400 */
  readonly status: number
  /** 分段错误码（九位整数 = 模块 3 位 + 子域 3 位 + 序号 3 位），默认通用段 999 */
  readonly code: number
  /** 附带数据，可选 */
  readonly data?: unknown

  constructor(message: string, options: BusinessErrorOptions = {}) {
    super(message)
    this.status = options.status ?? 400
    this.code = options.code?.code ?? GlobalErrorCode.BUSINESS_ERROR.code
    this.data = options.data
  }
}

/**
 * 业务错误工厂：业务代码表达失败的标准方式。
 *
 * @example
 * ```ts
 * throw businessError('未找到该货币的汇率信息')
 * throw businessError('上传失败', { data: errors })
 * throw businessError('汇率必须为正数', { status: 422, code: ExchangeErrorCode.RATE_NOT_POSITIVE })
 * ```
 */
export function businessError(message: string, options?: BusinessErrorOptions): BusinessError {
  return new BusinessError(message, options)
}
