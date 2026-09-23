import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from './http'

// element-plus 的 ElMessage 依赖 DOM 渲染，node 环境下 mock 掉（本组用例只走成功路径，不触发提示）
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }))

/**
 * 以 WebCrypto（运行时为 Node 的 OpenSSL 实现，独立于拦截器所用 @noble/hashes）按契约重算签名：
 * 跨实现守护「拦截器产物可被服务端验签实现验过」——两端契约的可自动化联调等价物
 */
async function serverSideSign(config: InternalAxiosRequestConfig, path: string, body: string): Promise<string> {
  const signString = [
    String(config.method).toUpperCase(),
    path,
    body,
    String(config.headers.get('timestamp')),
    String(config.headers.get('noncestr')),
  ].join('\n')
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode('integration-test-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signString))
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('')
}

/** 以捕获型 adapter 接住最终发出的请求配置（经全部请求拦截器之后），并按统一结构返回成功响应 */
function captureAdapter() {
  const captured: InternalAxiosRequestConfig[] = []
  http.defaults.adapter = async (config) => {
    captured.push(config)
    return {
      data: { code: 0, data: { ok: true } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  return captured
}

describe('http 请求拦截器 · 签名注入', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('POST 对象：body 为序列化字符串本体 + 显式 JSON 头 + 三件套签名头，且签名可被服务端实现（node:crypto）验过', async () => {
    vi.stubEnv('VITE_SIGN_SECRET', 'integration-test-secret')
    const captured = captureAdapter()

    const result = await http.post('/demo', { name: 'CNY' })
    const config = captured[0]

    // 签的 = 发的：请求体即参与签名的同一字符串
    expect(config.data).toBe('{"name":"CNY"}')
    expect(config.headers.get('Content-Type')).toBe('application/json')
    expect(config.headers.get('sign')).toBe(await serverSideSign(config, '/api/demo', '{"name":"CNY"}'))
    expect(config.headers.get('timestamp')).toMatch(/^\d+$/)
    expect(config.headers.get('noncestr')).toMatch(/^[0-9a-f]{32}$/)

    // 响应拦截器同名对齐约定：调用方直接拿到统一包装结构
    expect(result).toEqual({ code: 0, data: { ok: true } })
  })

  it('无 body 的动作型 POST：按空 body 段签名且不发请求体、不设 JSON 头（axios 自带的默认头与签名无关）', async () => {
    vi.stubEnv('VITE_SIGN_SECRET', 'integration-test-secret')
    const captured = captureAdapter()

    await http.post('/demo/action')
    const config = captured[0]

    expect(config.data).toBeUndefined()
    expect(config.headers.get('Content-Type')).not.toBe('application/json')
    expect(config.headers.get('sign')).toBe(await serverSideSign(config, '/api/demo/action', ''))
  })

  it('FormData 上传请求不注入签名（此类接口走豁免或自定义方案）', async () => {
    const captured = captureAdapter()
    const form = new FormData()
    form.append('file', 'content')

    await http.post('/upload', form)
    const config = captured[0]

    expect(config.headers.get('sign')).toBeUndefined()
    expect(config.headers.get('timestamp')).toBeUndefined()
    expect(config.headers.get('noncestr')).toBeUndefined()
  })

  it('GET 请求不注入签名', async () => {
    const captured = captureAdapter()

    await http.get('/demo')
    const config = captured[0]

    expect(config.headers.get('sign')).toBeUndefined()
  })
})
