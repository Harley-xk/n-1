import { describe, expect, it, jest } from '@jest/globals'
import type { ExecutionContext } from '@nestjs/common'
import { UnauthorizedException } from '@nestjs/common'

import { JwtAuthGuard } from './jwt-auth.guard'
import { requestContext } from '../../../common/context/request-context'
import type { AuthUser } from '../../../common/decorators/current-user.decorator'
import type { AuthService } from '../auth/auth.service'

/** 构造 mock 执行上下文（handler/class 元数据 + 可控 request） */
function makeContext(metadata: { public?: boolean, request: Record<string, unknown> }): ExecutionContext {
  return {
    getHandler: () => ({ __meta: metadata }),
    getClass: () => ({ __meta: {} }),
    switchToHttp: () => ({ getRequest: () => metadata.request }),
  } as unknown as ExecutionContext
}

function makeGuard(options: {
  isPublic?: boolean
  token?: string | null
  verifyResult?: { sub?: string, username?: string } | null
  activeUser?: { id: string, username: string, status: boolean } | null
}) {
  const reflector = {
    getAllAndOverride: jest.fn((_key: string, [handler]: { __meta: Record<string, unknown> }[]) =>
      handler.__meta.public === true),
  }
  const jwtService = {
    verifyAsync: jest.fn(() => Promise.resolve(options.verifyResult ?? { sub: 'u1', username: 'admin' })),
  }
  const configService = { get: jest.fn(() => 'test-secret') }
  const authService = { getActiveUserById: jest.fn(() => Promise.resolve(options.activeUser ?? null)) }
  const guard = new JwtAuthGuard(
    reflector as never,
    jwtService as never,
    configService as never,
    authService as unknown as jest.Mocked<Pick<AuthService, 'getActiveUserById'>> as never,
  )
  const headers: Record<string, string> = {}
  if (options.token !== null)
    headers.authorization = options.token ?? 'Bearer test-token'
  const request: Record<string, unknown> = { headers }
  return { guard, jwtService, authService, request }
}

describe('JwtAuthGuard', () => {
  it('@Public 标记的接口应直接放行（不解析 token）', async () => {
    const { guard, jwtService } = makeGuard({ isPublic: true, token: null })
    const context = makeContext({ public: true, request: { headers: {} } })
    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(jwtService.verifyAsync).not.toHaveBeenCalled()
  })

  it('缺少 Authorization 头应抛 401', async () => {
    const { guard } = makeGuard({ token: null })
    const context = makeContext({ request: { headers: {} } })
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
  })

  it('非 Bearer 形态的 Authorization 头应抛 401', async () => {
    const { guard } = makeGuard({ token: 'Basic dXNlcjpwYXNz' })
    const context = makeContext({ request: { headers: { authorization: 'Basic dXNlcjpwYXNz' } } })
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
  })

  it('token 验签失败应统一抛 401（不区分过期与签名错误）', async () => {
    const { guard, jwtService } = makeGuard({})
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'))
    const context = makeContext({ request: { headers: { authorization: 'Bearer bad.token' } } })
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
  })

  it('验签通过但 payload 缺少身份字段应抛 401', async () => {
    const { guard } = makeGuard({ verifyResult: {} })
    const context = makeContext({ request: { headers: { authorization: 'Bearer t' } } })
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
  })

  it('用户不存在或已停用应抛 401（存在性校验的即时失效语义）', async () => {
    const { guard } = makeGuard({ activeUser: null })
    const context = makeContext({ request: { headers: { authorization: 'Bearer t' } } })
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
  })

  it('校验通过应挂载当前用户并激活审计上下文', async () => {
    const setUserIdSpy = jest.spyOn(requestContext, 'setUserId').mockImplementation(() => undefined)
    const { guard, request } = makeGuard({ activeUser: { id: 'u1', username: 'admin', status: true } })
    const context = makeContext({ public: false, request })
    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(request.user).toEqual({ id: 'u1', username: 'admin' } satisfies AuthUser)
    expect(setUserIdSpy).toHaveBeenCalledWith('u1')
    setUserIdSpy.mockRestore()
  })
})
