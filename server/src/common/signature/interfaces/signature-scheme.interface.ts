/*
 * 作者: Harley-xk
 * 创建: 2026-09-11
 *
 * 描述: 请求签名方案模型契约：签名方案接口、验签上下文与防重放存储抽象
 */

import type { Request } from 'express'

declare module 'express' {
  interface Request {
    /** 原始请求体字节（应用以 rawBody: true 装配时，仅 JSON / urlencoded 请求存在） */
    rawBody?: Buffer
  }
}

/** 传给签名方案 verify 的完整上下文：方案自包含全部验签所需信息，不依赖 ConfigService（可测性优先） */
export interface SignatureContext {
  /** 原始 HTTP 请求：方案可自行取 headers / query / body（自定义方案的签名材料可不在标准位置） */
  request: Request
  /** 原始请求体字节（仅 JSON / urlencoded 请求且应用以 rawBody: true 装配时有值） */
  rawBody?: Buffer
  /** 签名密钥（signature.secret 配置） */
  secret: string
  /** 签名有效时间窗（毫秒，signature.expireMs 配置），自定义方案可自行决定是否使用 */
  expireMs: number
}

/**
 * 签名方案：完整负责一个/一组接口的验签流程 —— 对外接口独特参数格式的扩展点。
 * 通过 @UseSignature('方案名') 绑定到控制器/方法，在 SignatureSchemeRegistry 注册
 */
export interface SignatureScheme {
  /** 方案唯一名，@UseSignature('名称') 引用 */
  readonly name: string
  /**
   * 执行验签：通过时正常返回；失败时 throw 任意异常
   * （Guard 统一转为 401「签名校验失败」，不向客户端透出原因）
   */
  verify(context: SignatureContext): void | Promise<void>
}

/** 防重放 nonce 存储抽象：接口化注入，为未来替换集中式存储（如 Redis）预留 */
export interface NonceStore {
  /**
   * 记录 nonce 并查询窗口内是否已使用
   * @returns true 表示 ttl 窗口内重复出现（重放），false 表示首次出现并已记录
   */
  tryConsume(nonce: string, ttlMs: number): boolean
}
