import { describe, expect, it } from '@jest/globals'
import type { Request } from 'express'

import { getClientInfo, getClientIp, getClientUserAgent } from './client-info'

/** 构造仅含 headers 与 socket 的伪请求（client-info 的全部依赖面） */
function makeRequest(headers: Record<string, unknown>, remoteAddress?: string): Request {
  return {
    headers,
    socket: remoteAddress === undefined ? undefined : { remoteAddress },
  } as unknown as Request
}

describe('getClientIp', () => {
  it('单级 XFF 应直接取值', () => {
    expect(getClientIp(makeRequest({ 'x-forwarded-for': '203.0.113.5' }))).toBe('203.0.113.5')
  })

  it('多级 XFF 应取最左一跳（真实客户端）', () => {
    expect(getClientIp(makeRequest({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1, 10.0.0.2' }))).toBe('203.0.113.5')
  })

  it('XFF 首跳为 unknown 应跳过取下一跳', () => {
    expect(getClientIp(makeRequest({ 'x-forwarded-for': 'unknown, 203.0.113.5' }))).toBe('203.0.113.5')
  })

  it('XFF 全部为 unknown 应回退 socket 地址', () => {
    expect(getClientIp(makeRequest({ 'x-forwarded-for': 'unknown' }, '192.168.1.10'))).toBe('192.168.1.10')
  })

  it('XFF 为数组形态应拼接后逐跳解析', () => {
    expect(getClientIp(makeRequest({ 'x-forwarded-for': ['203.0.113.5, 10.0.0.1'] }))).toBe('203.0.113.5')
  })

  it('无 XFF 应回退 socket.remoteAddress', () => {
    expect(getClientIp(makeRequest({}, '192.168.1.10'))).toBe('192.168.1.10')
  })

  it('无 XFF 且无 socket 应回退 null（可空契约）', () => {
    expect(getClientIp(makeRequest({}))).toBeNull()
  })
})

describe('getClientUserAgent', () => {
  it('应原样返回 user-agent 头', () => {
    expect(getClientUserAgent(makeRequest({ 'user-agent': 'Mozilla/5.0 jest' }))).toBe('Mozilla/5.0 jest')
  })

  it('缺失时应返回 null', () => {
    expect(getClientUserAgent(makeRequest({}))).toBeNull()
  })
})

describe('getClientInfo', () => {
  it('应一次组装 IP 与 UA 载荷', () => {
    expect(
      getClientInfo(
        makeRequest({ 'x-forwarded-for': '203.0.113.5', 'user-agent': 'jest-agent' }, '10.0.0.1'),
      ),
    ).toEqual({ ip: '203.0.113.5', userAgent: 'jest-agent' })
  })

  it('双缺失时应返回 { ip: null, userAgent: null }', () => {
    expect(getClientInfo(makeRequest({}))).toEqual({ ip: null, userAgent: null })
  })
})
