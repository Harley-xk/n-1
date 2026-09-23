import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { Reflector } from '@nestjs/core'

import { SIGNATURE_SKIP_METADATA } from './decorators/skip-signature.decorator'
import { SIGNATURE_SCHEME_METADATA } from './decorators/use-signature.decorator'
import type { SignatureContext, SignatureScheme } from './interfaces/signature-scheme.interface'
import { SignatureSchemeRegistry } from './signature-scheme.registry'
import { SignatureGuard } from './signature.guard'

/** 构造 Guard 测试件：依赖全部以 mock 注入，按用例覆写行为 */
function createFixture(options: Partial<{
  enabled: boolean
  skip: boolean
  schemeName: string | undefined
  scheme: SignatureScheme | undefined
  verifyResult: 'pass' | 'sync-throw' | 'async-reject'
}> = {}) {
  const configValues: Record<string, unknown> = {
    'signature.enabled': options.enabled ?? true,
    'signature.secret': 'test-secret',
    'signature.expireMs': 300_000,
  }
  const configService = { get: jest.fn((path: string) => configValues[path]) } as unknown as ConfigService

  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === SIGNATURE_SKIP_METADATA)
        return options.skip ?? false
      if (key === SIGNATURE_SCHEME_METADATA)
        return options.schemeName
      return undefined
    }),
  } as unknown as Reflector

  const scheme
    = options.scheme
      ?? {
        name: options.schemeName ?? 'standard',
        verify: options.verifyResult === 'sync-throw'
          ? () => { throw new Error('内部原因：签名不匹配') }
          : options.verifyResult === 'async-reject'
            ? () => Promise.reject(new Error('内部原因：nonce 重放'))
            : jest.fn(() => undefined),
      }

  const registryGet = jest.fn(() => (options.scheme === null ? undefined : scheme))
  const registry = { get: registryGet, has: jest.fn(() => true) } as unknown as SignatureSchemeRegistry

  const guard = new SignatureGuard(configService, reflector, registry)
  return { guard, registryGet, scheme }
}

/** 构造携带 mock 请求的 ExecutionContext */
function createContext(request: { method: string, rawBody?: Buffer }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => jest.fn(),
    getClass: () => class Demo {},
  } as unknown as ExecutionContext
}

/** 创建 Logger 方法 spy：经辅助函数让 ReturnType 推断出具体 Spied 类型（直接写 ReturnType<typeof jest.spyOn> 会退化为 any） */
function createLoggerSpy(method: 'warn' | 'error') {
  return jest.spyOn(Logger.prototype, method).mockImplementation(() => undefined)
}

describe('SignatureGuard', () => {
  let warnSpy: ReturnType<typeof createLoggerSpy>
  let errorSpy: ReturnType<typeof createLoggerSpy>

  beforeEach(() => {
    // 屏蔽日志输出并供断言（afterEach 统一还原）
    warnSpy = createLoggerSpy('warn')
    errorSpy = createLoggerSpy('error')
  })

  afterEach(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('总开关关闭时应直接放行，且不触碰豁免/方案解析（开关在最前）', async () => {
    const { guard, registryGet } = createFixture({ enabled: false })

    await expect(guard.canActivate(createContext({ method: 'POST' }))).resolves.toBe(true)
    expect(registryGet).not.toHaveBeenCalled()
  })

  it('@SkipSignature 豁免：写方法也应放行', async () => {
    const { guard } = createFixture({ skip: true })

    await expect(guard.canActivate(createContext({ method: 'POST' }))).resolves.toBe(true)
  })

  it.each(['GET', 'HEAD', 'OPTIONS'])('%s 请求应默认豁免且不解析方案', async (method) => {
    const { guard, registryGet } = createFixture()

    await expect(guard.canActivate(createContext({ method }))).resolves.toBe(true)
    expect(registryGet).not.toHaveBeenCalled()
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s 请求未显式指定方案时应分发到 standard 方案', async (method) => {
    const { guard, registryGet } = createFixture()

    await expect(guard.canActivate(createContext({ method }))).resolves.toBe(true)
    expect(registryGet).toHaveBeenCalledWith('standard')
  })

  it('@UseSignature 指定的方案名应透传给注册表分发', async () => {
    const { guard, registryGet } = createFixture({ schemeName: 'openapi-xml' })

    await expect(guard.canActivate(createContext({ method: 'POST' }))).resolves.toBe(true)
    expect(registryGet).toHaveBeenCalledWith('openapi-xml')
  })

  it('方案未注册应抛 500（编程错误）并记录日志，而非静默放行', async () => {
    const { guard } = createFixture({ scheme: null as unknown as SignatureScheme })

    await expect(guard.canActivate(createContext({ method: 'POST' })))
      .rejects.toThrow(InternalServerErrorException)
    expect(errorSpy).toHaveBeenCalled()
  })

  it('方案验签通过时应放行，并以完整上下文调用 verify（request/rawBody/secret/expireMs）', async () => {
    let captured: SignatureContext | undefined
    const scheme: SignatureScheme = {
      name: 'standard',
      verify: (ctx) => {
        captured = ctx
      },
    }
    const { guard } = createFixture({ scheme })
    const request = { method: 'POST', rawBody: Buffer.from('{}', 'utf8') }

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
    expect(captured?.request).toBe(request)
    expect(captured?.rawBody).toBe(request.rawBody)
    expect(captured?.secret).toBe('test-secret')
    expect(captured?.expireMs).toBe(300_000)
  })

  it('方案同步抛错应统一转为 401「签名校验失败」，原始原因不透出给客户端（防探测契约）', async () => {
    const { guard } = createFixture({ verifyResult: 'sync-throw' })

    await expect(guard.canActivate(createContext({ method: 'POST' })))
      .rejects.toThrow(new UnauthorizedException('签名校验失败'))
    expect(warnSpy).toHaveBeenCalled()
  })

  it('方案异步拒绝同样应统一转为 401（守护 await 语义）', async () => {
    const { guard } = createFixture({ verifyResult: 'async-reject' })

    await expect(guard.canActivate(createContext({ method: 'POST' })))
      .rejects.toThrow(new UnauthorizedException('签名校验失败'))
  })
})
