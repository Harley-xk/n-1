import { describe, expect, it } from '@jest/globals'

import type { SignatureScheme } from './interfaces/signature-scheme.interface'
import { SignatureSchemeRegistry } from './signature-scheme.registry'

function makeScheme(name: string): SignatureScheme {
  return { name, verify: () => undefined }
}

describe('SignatureSchemeRegistry', () => {
  it('register 后 get 应返回该方案，has 应为 true', () => {
    const registry = new SignatureSchemeRegistry()
    const scheme = makeScheme('custom')

    registry.register(scheme)

    expect(registry.get('custom')).toBe(scheme)
    expect(registry.has('custom')).toBe(true)
  })

  it('get 未注册的方案应返回 undefined', () => {
    const registry = new SignatureSchemeRegistry()

    expect(registry.get('not-exist')).toBeUndefined()
    expect(registry.has('not-exist')).toBe(false)
  })

  it('重复注册同名方案应抛错（启动期暴露命名冲突，消息含方案名）', () => {
    const registry = new SignatureSchemeRegistry()
    registry.register(makeScheme('custom'))

    expect(() => registry.register(makeScheme('custom')))
      .toThrow('签名方案「custom」重复注册')
  })
})
