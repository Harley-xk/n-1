import { randomBytes } from 'node:crypto'
import type { Server } from 'node:http'
import request from 'supertest'

import { buildSignString, hmacSha256Hex } from '../../src/common/signature/schemes/standard-signature.scheme'

/** e2e 套件使用的签名密钥（与 signature.e2e-spec.ts 中的 SIGNATURE_SECRET 保持一致） */
export const E2E_SIGN_SECRET = 'e2e-sign-secret'

export interface SignOptions {
  /** 时间戳（毫秒字符串），默认当前时间；测试过期/未来方向时显式传入 */
  timestamp?: string
  /** nonce，默认随机生成；测试重放时显式传入固定值 */
  nonce?: string
  /** 签名密钥，默认 e2e 密钥；测试错误密钥时显式传入 */
  secret?: string
}

/**
 * 生成签名头三件套：直接复用服务端源码的签名串构造与 HMAC 计算，
 * 保证「测试签的 = 服务端验的」，契约天然一致（不对测试独立实现第二份算法）
 */
export function signHeaders(method: string, path: string, body: string, options: SignOptions = {}) {
  const timestamp = options.timestamp ?? String(Date.now())
  const nonce = options.nonce ?? randomBytes(16).toString('hex')
  const sign = hmacSha256Hex(
    buildSignString(method, path, body, timestamp, nonce),
    options.secret ?? E2E_SIGN_SECRET,
  )
  return { sign, timestamp, noncestr: nonce }
}

/** 发送带签名的 JSON 请求：签名与请求体共用同一字符串（与前端拦截器「签的 = 发的」技巧一致） */
export function signedRequest(
  server: Server,
  method: 'post' | 'put' | 'patch' | 'delete',
  path: string,
  body: string,
  options: SignOptions = {},
) {
  return request(server)[method](path)
    .set('Content-Type', 'application/json')
    .set(signHeaders(method.toUpperCase(), path, body, options))
    .send(body)
}
