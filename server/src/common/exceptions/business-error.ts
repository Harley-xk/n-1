/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 业务异常：业务流程中可预期的失败，经全局异常过滤器转为统一错误响应
 */

/** 业务错误构造选项 */
export interface BusinessErrorOptions {
  /** HTTP 状态码，默认 400 */
  status?: number
  /** 业务错误码，默认 -1（错误码按符号分段：<0 表示业务错误，预留负数扩展位） */
  code?: number
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
  /** 业务错误码，默认 -1 */
  readonly code: number
  /** 附带数据，可选 */
  readonly data?: unknown

  constructor(message: string, options: BusinessErrorOptions = {}) {
    super(message)
    this.status = options.status ?? 400
    this.code = options.code ?? -1
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
 * throw businessError('汇率必须为正数', { status: 422 })
 * ```
 */
export function businessError(message: string, options?: BusinessErrorOptions): BusinessError {
  return new BusinessError(message, options)
}
