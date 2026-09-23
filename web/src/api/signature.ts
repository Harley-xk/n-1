/*
 * 作者: Harley-xk
 * 创建: 2026-09-11
 *
 * 描述: 请求签名工具：签名串构造、签名路径解析与三件套头生成（axios 拦截器自动使用，非 axios 场景手动调用）
 */

import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'

/** 参与签名校验的写方法集合（小写；与后端 SignatureGuard 的校验范围保持同步维护） */
export const SIGNATURE_WRITE_METHODS = ['post', 'put', 'patch', 'delete']

/** 签名头三件套（与后端标准方案约定一致，见 docs/指南/请求签名验证设计.md） */
export interface SignatureHeaders {
  sign: string
  timestamp: string
  noncestr: string
}

/**
 * 签名串构造：与 server 端 buildSignString 严格对等（五段以 \n 连接，空 body 段占位），
 * 两端单测用同一组固定向量（含 HMAC hex 期望值）守护构造不漂移
 */
export function buildSignString(method: string, path: string, body: string, timestamp: string, nonce: string): string {
  return [method, path, body, timestamp, nonce].join('\n')
}

/** HMAC-SHA256 小写 hex（与后端 hmacSha256Hex 对等） */
export function hmacSha256Hex(text: string, secret: string): string {
  return bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(text)))
}

/**
 * 计算参与签名的 pathname：剥离完整 URL 的 origin、拼接 baseURL、去除 query、保留 URL 编码。
 * 不可用 new URL(url, baseURL) —— URL 构造是「基准解析」而非拼接，
 * new URL('/users', 'http://host/api') 会得到 /users（丢掉 /api 前缀）
 */
export function resolveSignPath(baseURL: string, url: string): string {
  // url 本身是完整 URL 时（axios 将忽略 baseURL），直接取其 pathname
  if (/^https?:\/\//i.test(url))
    return new URL(url).pathname

  const base = /^https?:\/\//i.test(baseURL) ? new URL(baseURL).pathname : (baseURL || '')
  const fullPath = `${base.replace(/\/+$/, '')}/${String(url).replace(/^\/+/, '').split('?')[0]}`
  return new URL(fullPath, 'http://sign.local').pathname
}

/** 浏览器原生安全随机数生成 32 位 hex nonce */
function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 请求体是否可参与标准签名：FormData/Blob/ArrayBuffer/URLSearchParams 等结构化类型
 * 不是 JSON 序列化对象（强行 stringify 会破坏请求本身），不参与标准签名——
 * 此类接口（如文件上传）应使用 @SkipSignature 豁免或自定义签名方案
 */
export function isSignableData(data: unknown): boolean {
  if (typeof data !== 'object' || data === null)
    return true
  return !(data instanceof FormData
    || (typeof Blob !== 'undefined' && data instanceof Blob)
    || data instanceof ArrayBuffer
    || (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams))
}

/** 请求体序列化为参与签名的文本：与 axios 默认 transformRequest 行为对齐 */
export function serializeBody(data: unknown): string {
  if (data === undefined || data === null)
    return ''
  if (typeof data === 'string')
    return data
  return JSON.stringify(data)
}

/**
 * 手动签名（非 axios 场景，如 Element Plus 上传控件自定义请求）：
 * 传入请求方法（大写，如 'POST'）、参与签名的 pathname（须与请求实际到达服务端的路径一致，含 /api 前缀）
 * 与请求体，返回可直接并入请求的三件套头。注意「签的 = 发的」：调用方须把同一 bodyText 作为请求体发送
 */
export function signRequest(method: string, path: string, body?: unknown): { headers: SignatureHeaders, bodyText: string } {
  const secret = import.meta.env.VITE_SIGN_SECRET
  const bodyText = serializeBody(body)
  const timestamp = String(Date.now())
  const nonce = generateNonce()
  const sign = hmacSha256Hex(buildSignString(method.toUpperCase(), path, bodyText, timestamp, nonce), secret)

  return {
    headers: { sign, timestamp, noncestr: nonce },
    bodyText,
  }
}
