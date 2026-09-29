/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 业务响应码回填工具：响应链路各环节把 code 写到 request 上，供访问日志在响应结束后读取
 */

// 经声明合并为 Express Request 扩展业务响应码回填位（全局唯一出处，避免各处散落断言）。
// 目标模块用 'express'：其类型在 pnpm 隔离下可稳定解析（express-serve-static-core 不能）。
declare module 'express' {
  // 声明合并的标准形态是空接口（继承成员全部来自 ResponseCodeCarrier），非冗余定义
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Request extends ResponseCodeCarrier {}
}

/** 携带业务响应码回填位的请求对象形态（Express Request 的结构化扩展） */
export interface ResponseCodeCarrier {
  /** 响应包装拦截器 / 异常过滤器回填的业务响应码，访问日志中间件在 finish 事件读取 */
  apiCode?: number
}

/**
 * 在 request 上回填业务响应码。
 * HTTP 响应流式写出后无法再取响应体，request 属性回填是访问日志拿到业务 code 的唯一通路。
 */
export function setResponseCode(request: ResponseCodeCarrier, code: number): void {
  request.apiCode = code
}
