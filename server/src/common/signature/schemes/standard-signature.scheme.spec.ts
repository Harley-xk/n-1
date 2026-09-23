import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { Request } from 'express'

import { StandardSignatureScheme, buildSignString, hmacSha256Hex, safeHexEquals } from './standard-signature.scheme'
import type { NonceStore, SignatureContext } from '../interfaces/signature-scheme.interface'

/** 固定测试向量：与 web/src/api/signature.spec.ts 共用同一组（含期望 hex），守护两端签名串构造与 HMAC 不漂移 */
const VEC_SECRET = 'unit-test-secret'
const VEC_SIGN_STRING = 'POST\n/api/demo\n{"name":"CNY"}\n1760000000000\nnonce-abc'
const VEC_HMAC = 'be15296cc8b2e55473fb457b90ce222307c674dd5cc6168e0ffb2a1604b35511'
const VEC_EMPTY_BODY_HMAC = '7f2c56fbfa0b290748d9226137966f749beca132d5192d34417c03d6e7092b21'

const SECRET = 'test-secret'
const EXPIRE_MS = 300_000

/** 构造验签上下文：headers 与签名默认齐备且互相匹配，按需单因子覆写制造各失败分支（null 表示显式不设该字段） */
function build(options: Partial<{
  method: string
  path: string
  body: string
  timestamp: string | null
  nonce: string | null
  sign: string | string[] | null
  signSecret: string
  contentType: string | null
  contentLength: string | null
  transferEncoding: string
  rawBody: Buffer | null
  nonceUsed: boolean
  nonceStore?: NonceStore
}> = {}) {
  const method = options.method ?? 'POST'
  const path = options.path ?? '/api/demo'
  const body = options.body ?? '{"name":"CNY"}'
  // null 表示「显式不设该头」（制造缺头分支），须与「未传」区分，不能用 ?? 取默认
  const timestamp = options.timestamp === undefined ? String(Date.now()) : options.timestamp
  const nonce = options.nonce === undefined ? 'nonce-abc' : options.nonce
  const signSecret = options.signSecret ?? SECRET
  // 缺 timestamp/nonce 头的用例给占位签名（必然在缺头分支被拒，不会进入比对）
  const sign = options.sign === undefined
    ? (timestamp === null || nonce === null
        ? 'placeholder-sign'
        : hmacSha256Hex(buildSignString(method, path, body, timestamp, nonce), signSecret))
    : options.sign

  const headers: Record<string, string | string[] | undefined> = {}
  if (sign !== null)
    headers.sign = sign
  if (timestamp !== null)
    headers.timestamp = timestamp
  if (nonce !== null)
    headers.noncestr = nonce
  if (options.contentType !== null)
    headers['content-type'] = options.contentType ?? 'application/json'
  if (options.contentLength !== null)
    headers['content-length'] = options.contentLength ?? String(Buffer.byteLength(body, 'utf8'))
  if (options.transferEncoding !== undefined)
    headers['transfer-encoding'] = options.transferEncoding

  const request = { method, path, headers } as unknown as Request
  const rawBody = options.rawBody === null ? undefined : (options.rawBody ?? Buffer.from(body, 'utf8'))
  const nonceStore: NonceStore = options.nonceStore ?? { tryConsume: jest.fn(() => options.nonceUsed ?? false) }
  const ctx: SignatureContext = { request, rawBody, secret: SECRET, expireMs: EXPIRE_MS }
  const scheme = new StandardSignatureScheme(nonceStore)

  return { ctx, nonceStore, scheme }
}

describe('buildSignString（两端契约守护）', () => {
  it('固定向量：五段以 \\n 连接，空 body 段占位，段数恒为 5', () => {
    expect(buildSignString('POST', '/api/demo', '{"name":"CNY"}', '1760000000000', 'nonce-abc'))
      .toBe(VEC_SIGN_STRING)
    expect(buildSignString('POST', '/api/demo', '', '1760000000000', 'nonce-abc'))
      .toBe('POST\n/api/demo\n\n1760000000000\nnonce-abc')
  })
})

describe('hmacSha256Hex（两端契约守护）', () => {
  it('固定向量：期望值与 web 端单测共用，任何一端漂移即失败', () => {
    expect(hmacSha256Hex(VEC_SIGN_STRING, VEC_SECRET)).toBe(VEC_HMAC)
    expect(hmacSha256Hex('POST\n/api/demo\n\n1760000000000\nnonce-abc', VEC_SECRET))
      .toBe(VEC_EMPTY_BODY_HMAC)
  })
})

describe('safeHexEquals', () => {
  it('等长相等应返回 true，大小写敏感', () => {
    expect(safeHexEquals(VEC_HMAC, VEC_HMAC)).toBe(true)
    expect(safeHexEquals(VEC_HMAC, VEC_HMAC.toUpperCase())).toBe(false)
  })

  it('等长不等应返回 false；长度不等应短路返回 false 而非抛异常（timingSafeEqual 对不等长输入抛错）', () => {
    expect(safeHexEquals(VEC_HMAC, '0'.repeat(64))).toBe(false)
    expect(safeHexEquals(VEC_HMAC, 'abc')).toBe(false)
  })
})

describe('StandardSignatureScheme.verify', () => {
  beforeEach(() => {
    // 冻结时间：窗口边界用例对 build（构造签名）与 verify 之间真实时钟的毫秒级流逝敏感，不冻结会偶发翻转
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('全部匹配的请求应通过，且 nonce 以 2 倍时间窗消费', () => {
    const tryConsume = jest.fn(() => false)
    const { ctx, scheme } = build({ nonceStore: { tryConsume } })

    expect(() => scheme.verify(ctx)).not.toThrow()
    expect(tryConsume).toHaveBeenCalledWith('nonce-abc', EXPIRE_MS * 2)
  })

  it('时间戳恰在窗口边界（等于 expireMs）应通过', () => {
    const { ctx, scheme } = build({ timestamp: String(Date.now() - EXPIRE_MS) })

    expect(() => scheme.verify(ctx)).not.toThrow()
  })

  it.each([
    ['缺 sign 头', { sign: null }],
    ['缺 timestamp 头', { timestamp: null }],
    ['缺 noncestr 头', { nonce: null }],
    ['sign 为同名头数组形态', { sign: ['abc'] }],
    ['sign 为空串', { sign: '' }],
  ])('%s 应拒绝（缺少签名头）', (_name, overrides) => {
    const { ctx, scheme } = build(overrides)

    expect(() => scheme.verify(ctx)).toThrow('缺少签名头')
  })

  it('时间戳非数字应拒绝（防御分支）', () => {
    const { ctx, scheme } = build({ timestamp: 'not-a-number' })

    expect(() => scheme.verify(ctx)).toThrow('时间戳非法')
  })

  it('时间戳在过去方向超出窗口应拒绝', () => {
    const { ctx, scheme } = build({ timestamp: String(Date.now() - EXPIRE_MS - 1) })

    expect(() => scheme.verify(ctx)).toThrow('时间戳超出有效窗口')
  })

  it('时间戳在未来方向超出窗口应拒绝（守护双向时间窗，防远未来时间戳绕过）', () => {
    const { ctx, scheme } = build({ timestamp: String(Date.now() + EXPIRE_MS + 1) })

    expect(() => scheme.verify(ctx)).toThrow('时间戳超出有效窗口')
  })

  it('nonce 在窗口内重复出现应拒绝（重放）', () => {
    const { ctx, scheme } = build({ nonceUsed: true })

    expect(() => scheme.verify(ctx)).toThrow('nonce 重放')
  })

  it('签名按 body A 生成、实际携带 body B 应拒绝（篡改检测）', () => {
    const { ctx, scheme } = build({ rawBody: Buffer.from('{"name":"TAMPERED"}', 'utf8') })

    expect(() => scheme.verify(ctx)).toThrow('签名不匹配')
  })

  it('签名使用错误密钥应拒绝', () => {
    const { ctx, scheme } = build({ signSecret: 'wrong-secret' })

    expect(() => scheme.verify(ctx)).toThrow('签名不匹配')
  })

  it('无 body 写请求（动作型 POST）应以空 body 段参与签名并放行', () => {
    const { ctx, scheme } = build({ body: '', contentType: null, contentLength: null, rawBody: null })

    expect(() => scheme.verify(ctx)).not.toThrow()
  })

  it('非 JSON content-type 且实际带体应拒绝（fail-closed，防非 JSON 通道绕过 body 完整性校验）', () => {
    const { ctx, scheme } = build({ contentType: 'text/plain', rawBody: null })

    expect(() => scheme.verify(ctx)).toThrow('标准方案仅支持 JSON 请求体')
  })

  it('JSON 带体但 rawBody 缺失应拒绝（装配异常 fail-closed）', () => {
    const { ctx, scheme } = build({ rawBody: null })

    expect(() => scheme.verify(ctx)).toThrow('JSON 请求体缺失 rawBody')
  })

  it('chunked 传输（无 Content-Length）应按实际带体处理', () => {
    const { ctx, scheme } = build({ contentLength: null, transferEncoding: 'chunked' })

    expect(() => scheme.verify(ctx)).not.toThrow()

    const { ctx: noRawBody } = build({ contentLength: null, transferEncoding: 'chunked', rawBody: null })
    expect(() => scheme.verify(noRawBody)).toThrow('JSON 请求体缺失 rawBody')
  })
})
