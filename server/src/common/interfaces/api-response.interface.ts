/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 统一响应结构契约：所有 HTTP 接口的最终响应体形态
 */

/** 统一响应结构：成功由响应拦截器包装，失败由全局异常过滤器归一化 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码：0 成功；非 0 为九位分段错误码（模块 3 位 + 子域 3 位 + 序号 3 位，通用段数值等于 HTTP 语义码） */
  code: number
  /** 提示信息：错误时必有；成功时为 undefined（JSON 序列化自动省略） */
  message?: string
  /** 业务数据：成功时为接口返回值；业务错误时可携带补充数据 */
  data?: T
}
