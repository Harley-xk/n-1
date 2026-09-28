/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 分段错误码值对象与全局通用段常量（错误码体系见 docs/指南/统一响应与异常处理设计.md）
 */

/**
 * 分段错误码值对象：code 与默认中文文案成对登记。
 * 错误码常量是唯一出处，业务抛错引用常量而非裸数字（与权限点注册表同一哲学，见 ADR-002）。
 */
export class ErrorCode {
  constructor(
    /** 九位分段错误码：模块 3 位 + 子域 3 位 + 序号 3 位（如 1001002003 = 001 模块 / 002 子域 / 003 序号） */
    readonly code: number,
    /** 默认中文文案：供异常过滤器映射等框架场景兜底；业务抛错时可覆写更具体的上下文消息 */
    readonly message: string,
  ) {}
}

/**
 * 全局通用段常量（模块 000、子域 000）。
 *
 * 分段规则：序号段借用 HTTP 语义码（400/401/403/404/405/500…），因模块段与子域段均为 0，
 * 通用段码在数值上恰等于序号段本身——框架级错误的 code 与 HTTP 状态码数值一致，便于排查对读。
 * 业务模块的错误码常量表落各自模块目录（如 modules/system/error-codes.ts），模块段位接入时登记；
 * 未分类业务错误统一落 999，业务模块就位后应逐步以模块常量替代。
 */
export const GlobalErrorCode = {
  /** 请求参数不合法（参数校验失败统一归一到本码，字段明细拼入 message） */
  INVALID_REQUEST_PARAM: new ErrorCode(400, '请求参数不合法'),
  /** 未登录 / token 无效（语义对齐 HTTP 401） */
  UNAUTHORIZED: new ErrorCode(401, '账号未登录'),
  /** 无访问权限（语义对齐 HTTP 403） */
  FORBIDDEN: new ErrorCode(403, '没有该操作权限'),
  /** 请求不存在（语义对齐 HTTP 404） */
  NOT_FOUND: new ErrorCode(404, '请求不存在'),
  /** 请求方法不支持（语义对齐 HTTP 405） */
  METHOD_NOT_ALLOWED: new ErrorCode(405, '请求方法不支持'),
  /** 服务端未知异常（兜底，不对外泄漏细节） */
  INTERNAL_SERVER_ERROR: new ErrorCode(500, '服务器内部错误'),
  /** 未分类业务错误：BusinessError 未指定错误码时的默认码 */
  BUSINESS_ERROR: new ErrorCode(999, '业务处理失败'),
} as const
