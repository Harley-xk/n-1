import { describe, expect, it, jest } from '@jest/globals'
import type { ExecutionContext } from '@nestjs/common'
import { ForbiddenException, InternalServerErrorException } from '@nestjs/common'

import type { PermissionService } from '../permission.service'
import { PermissionsGuard } from './permissions.guard'

/** 构造 mock 执行上下文（required 元数据 + 可控 request.user） */
function makeContext(options: { required?: string[], user?: { id: string } | null }): ExecutionContext {
  return {
    getHandler: () => ({ __required: options.required }),
    getClass: () => ({ __required: undefined }),
    switchToHttp: () => ({ getRequest: () => ({ user: options.user }) }),
  } as unknown as ExecutionContext
}

function makeGuard(options: { required?: string[], owned?: string[] }) {
  const reflector = {
    getAllAndOverride: jest.fn((_key: string, [handler]: { __required?: string[] }[]) => handler.__required),
  }
  const permissionService = {
    getUserPermissionCodes: jest.fn(() => Promise.resolve(options.owned ?? [])),
  }
  const guard = new PermissionsGuard(
    reflector as never,
    permissionService as unknown as jest.Mocked<Pick<PermissionService, 'getUserPermissionCodes'>> as never,
  )
  return { guard, permissionService }
}

describe('PermissionsGuard', () => {
  it('无 @RequirePermissions 注解应直接放行（仅需登录）', async () => {
    const { guard, permissionService } = makeGuard({ required: undefined })
    const context = makeContext({ required: undefined, user: { id: 'u1' } })
    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(permissionService.getUserPermissionCodes).not.toHaveBeenCalled()
  })

  it('注解为空数组应直接放行', async () => {
    const { guard } = makeGuard({ required: [] })
    const context = makeContext({ required: [], user: { id: 'u1' } })
    await expect(guard.canActivate(context)).resolves.toBe(true)
  })

  it('request.user 缺失应抛 500（Guard 顺序错配的防御分支）', async () => {
    const { guard } = makeGuard({ required: ['system:user:query'] })
    const context = makeContext({ required: ['system:user:query'], user: null })
    await expect(guard.canActivate(context)).rejects.toThrow(InternalServerErrorException)
  })

  it('持有任一注解权限应放行（OR 语义）', async () => {
    const { guard } = makeGuard({ required: ['system:user:query'], owned: ['system:other:do', 'system:user:query'] })
    const context = makeContext({ required: ['system:user:query'], user: { id: 'u1' } })
    await expect(guard.canActivate(context)).resolves.toBe(true)
  })

  it('不持有任何注解权限应抛 403', async () => {
    const { guard } = makeGuard({ required: ['system:user:query'], owned: ['system:other:do'] })
    const context = makeContext({ required: ['system:user:query'], user: { id: 'u1' } })
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
  })
})
