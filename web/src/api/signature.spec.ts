import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  SIGNATURE_WRITE_METHODS,
  buildSignString,
  hmacSha256Hex,
  isSignableData,
  resolveSignPath,
  serializeBody,
  signRequest,
} from './signature'

/** 固定测试向量：与 server/src/common/signature/schemes/standard-signature.scheme.spec.ts 共用同一组（含期望 hex），守护两端不漂移 */
const VEC_SECRET = 'unit-test-secret'
const VEC_SIGN_STRING = 'POST\n/api/demo\n{"name":"CNY"}\n1760000000000\nnonce-abc'
const VEC_HMAC = 'be15296cc8b2e55473fb457b90ce222307c674dd5cc6168e0ffb2a1604b35511'
const VEC_EMPTY_BODY_HMAC = '7f2c56fbfa0b290748d9226137966f749beca132d5192d34417c03d6e7092b21'

describe('buildSignString（两端契约守护）', () => {
  it('固定向量：五段以 \\n 连接，空 body 段占位，段数恒为 5', () => {
    expect(buildSignString('POST', '/api/demo', '{"name":"CNY"}', '1760000000000', 'nonce-abc'))
      .toBe(VEC_SIGN_STRING)
    expect(buildSignString('POST', '/api/demo', '', '1760000000000', 'nonce-abc'))
      .toBe('POST\n/api/demo\n\n1760000000000\nnonce-abc')
  })
})

describe('hmacSha256Hex（两端契约守护）', () => {
  it('固定向量：期望值与 server 端单测共用，任何一端漂移即失败', () => {
    expect(hmacSha256Hex(VEC_SIGN_STRING, VEC_SECRET)).toBe(VEC_HMAC)
    expect(hmacSha256Hex('POST\n/api/demo\n\n1760000000000\nnonce-abc', VEC_SECRET))
      .toBe(VEC_EMPTY_BODY_HMAC)
  })
})

describe('resolveSignPath', () => {
  it.each([
    ['相对 baseURL + 带斜杠 url', '/api', '/users', '/api/users'],
    ['相对 baseURL + 不带斜杠 url', '/api', 'users', '/api/users'],
    ['完整 baseURL 应剥离 origin', 'http://localhost:3000/api', '/users', '/api/users'],
    ['url 带内联 query 应去除', '/api', '/users?page=1&size=10', '/api/users'],
    ['url 本身是完整 URL 时直接取 pathname', '/api', 'http://localhost:3000/api/users', '/api/users'],
    ['baseURL 尾斜杠应归一', '/api/', '/users', '/api/users'],
  ])('%s', (_name, baseURL, url, expected) => {
    expect(resolveSignPath(baseURL, url)).toBe(expected)
  })

  it('不可用 new URL(url, baseURL) 的基准解析语义（回归守护：/api 前缀不得丢失）', () => {
    // new URL('/users', 'http://host/api').pathname === '/users'（丢前缀），本实现必须拼出完整前缀
    expect(new URL('/users', 'http://host/api').pathname).not.toBe('/api/users')
    expect(resolveSignPath('http://host/api', '/users')).toBe('/api/users')
  })
})

describe('isSignableData / serializeBody', () => {
  it('JSON 可序列化数据应可签名', () => {
    expect(isSignableData(undefined)).toBe(true)
    expect(isSignableData(null)).toBe(true)
    expect(isSignableData('text')).toBe(true)
    expect(isSignableData({ name: 'CNY' })).toBe(true)
    expect(isSignableData([1, 2])).toBe(true)
  })

  it('结构化类型不可签名（强行序列化会破坏请求本身）', () => {
    expect(isSignableData(new FormData())).toBe(false)
    expect(isSignableData(new Blob(['x']))).toBe(false)
    expect(isSignableData(new ArrayBuffer(8))).toBe(false)
    expect(isSignableData(new URLSearchParams({ a: '1' }))).toBe(false)
  })

  it('serializeBody：空值空串、字符串原样、对象 JSON 序列化（与 axios transformRequest 行为对齐）', () => {
    expect(serializeBody(undefined)).toBe('')
    expect(serializeBody(null)).toBe('')
    expect(serializeBody('{"a":1}')).toBe('{"a":1}')
    expect(serializeBody({ name: 'CNY' })).toBe('{"name":"CNY"}')
    expect(serializeBody(1)).toBe('1')
  })
})

describe('signRequest', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('应返回自洽的三件套：sign 可由 (method, path, bodyText, timestamp, nonce) 与同一密钥重算得出', () => {
    vi.stubEnv('VITE_SIGN_SECRET', 'manual-secret')

    const { headers, bodyText } = signRequest('put', '/api/orders/1', { status: 'done' })

    expect(bodyText).toBe('{"status":"done"}')
    expect(headers.timestamp).toMatch(/^\d+$/)
    expect(headers.noncestr).toMatch(/^[0-9a-f]{32}$/)
    // 自洽校验：用相同材料重算必须得到同一 sign
    const recomputed = hmacSha256Hex(
      buildSignString('PUT', '/api/orders/1', bodyText, headers.timestamp, headers.noncestr),
      'manual-secret',
    )
    expect(headers.sign).toBe(recomputed)
  })

  it('无 body 的动作型请求应以空 body 段签名', () => {
    vi.stubEnv('VITE_SIGN_SECRET', 'manual-secret')

    const { headers, bodyText } = signRequest('POST', '/api/orders/1/submit')

    expect(bodyText).toBe('')
    const recomputed = hmacSha256Hex(
      buildSignString('POST', '/api/orders/1/submit', '', headers.timestamp, headers.noncestr),
      'manual-secret',
    )
    expect(headers.sign).toBe(recomputed)
  })
})

describe('SIGNATURE_WRITE_METHODS', () => {
  it('应与后端写方法集合一致（小写）', () => {
    expect(SIGNATURE_WRITE_METHODS).toEqual(['post', 'put', 'patch', 'delete'])
  })
})
