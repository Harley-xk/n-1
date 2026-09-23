/*
 * 作者: Harley-xk
 * 创建: 2026-09-11
 *
 * 描述: 标准签名方案：写方法 JSON 请求的 HMAC-SHA256 验签（取头 → 双向时间窗 → 防重放 → body 判定 → 常量时间比对）
 */

import { Inject, Injectable } from '@nestjs/common'
import type { Request } from 'express'
import { createHmac, timingSafeEqual } from 'node:crypto'

import type { NonceStore, SignatureContext, SignatureScheme } from '../interfaces/signature-scheme.interface'
import { NONCE_STORE } from '../nonce-store/in-memory-nonce-store'
import { STANDARD_SCHEME_NAME } from '../signature-scheme.registry'

/**
 * 签名串构造：[method, path, body, timestamp, nonce] 以 \n 连接，段数恒为 5。
 * 段内不会出现真实换行（method/timestamp/nonce 字符集不含，path 中为 %0A 字面量，
 * JSON.stringify 产物中控制字符已转义），\n 作分隔符无拼接歧义。
 * 前端 web/src/api/signature.ts 有对等实现，两端单测用同一组固定向量守护构造不漂移
 */
export function buildSignString(method: string, path: string, body: string, timestamp: string, nonce: string): string {
  return [method, path, body, timestamp, nonce].join('\n')
}

/** HMAC-SHA256 小写 hex（标准方案签名计算，e2e 签名辅助同样复用） */
export function hmacSha256Hex(text: string, secret: string): string {
  return createHmac('sha256', secret).update(text, 'utf8').digest('hex')
}

/** 常量时间比对：长度不等先短路（timingSafeEqual 对长度不等的输入会抛异常） */
export function safeHexEquals(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(actual, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

@Injectable()
export class StandardSignatureScheme implements SignatureScheme {
  readonly name = STANDARD_SCHEME_NAME

  constructor(@Inject(NONCE_STORE) private readonly nonceStore: NonceStore) {}

  verify(ctx: SignatureContext): void {
    const { request } = ctx
    const clientSign = request.headers.sign
    const timestamp = request.headers.timestamp
    const nonce = request.headers.noncestr

    // 1. 签名头三件套齐备（同名头重复出现为数组形态，按缺失处理）
    if (typeof clientSign !== 'string' || !clientSign
      || typeof timestamp !== 'string' || !timestamp
      || typeof nonce !== 'string' || !nonce)
      throw new Error('缺少签名头')

    // 2. 双向时间窗：过去与未来方向都校验（防把时间戳设到远未来绕过「只查过去」的校验）
    const ts = Number(timestamp)
    if (!Number.isFinite(ts))
      throw new Error('时间戳非法')
    if (Math.abs(Date.now() - ts) > ctx.expireMs)
      throw new Error('时间戳超出有效窗口')

    // 3. 防重放：nonce 在 2 倍时间窗内一次性消费（保证时间戳仍有效的请求，其 nonce 必然仍被记录）
    if (this.nonceStore.tryConsume(nonce, ctx.expireMs * 2))
      throw new Error('nonce 重放')

    // 4. body 段判定 + 签名串构造 + 比对
    const body = this.resolveBody(request, ctx.rawBody)
    const signString = buildSignString(request.method, request.path, body, timestamp, nonce)
    const expected = hmacSha256Hex(signString, ctx.secret)
    if (!safeHexEquals(expected, clientSign.toLowerCase()))
      throw new Error('签名不匹配')
  }

  /**
   * body 段判定（绑原始字节 + fail-closed，标准方案限定 JSON API）：
   * - JSON 带体 → rawBody 原文（签的 = 发的）
   * - 无 body 写请求（动作型 POST）→ 空串占位
   * - 非 JSON content-type 且实际带体 → 拒绝（防客户端按空串签 + 非 JSON 通道绕过 body 完整性校验，此类接口走自定义方案）
   * - JSON 带体但 rawBody 缺失 → 拒绝（必为 rawBody 装配缺失或异常链路）
   */
  private resolveBody(request: Request, rawBody?: Buffer): string {
    if (!requestHasBody(request))
      return ''

    const contentType = request.headers['content-type'] ?? ''
    if (!contentType.includes('application/json'))
      throw new Error('标准方案仅支持 JSON 请求体')
    if (!rawBody)
      throw new Error('JSON 请求体缺失 rawBody')

    return rawBody.toString('utf8')
  }
}

/** 是否实际携带请求体：Content-Length > 0 或 chunked 传输 */
function requestHasBody(request: Request): boolean {
  const contentLength = Number(request.headers['content-length'] ?? 0)
  if (Number.isFinite(contentLength) && contentLength > 0)
    return true
  return (request.headers['transfer-encoding'] ?? '').includes('chunked')
}
