import { describe, expect, it, jest } from '@jest/globals'

import type { UserEntity } from '../entities/user.entity'
import { SystemErrorCode } from '../error-codes'
import { AuthService } from './auth.service'

/** admin123 的 BCrypt 散列（与种子迁移同源） */
const ADMIN_PASSWORD_HASH = '$2a$10$8yeFDSyUDUfl4SwuLGEah.XGaPS4uQLJb53EwXiCqXjUyxFKFAkLC'

function makeService(options: { user?: Partial<UserEntity> | null }) {
  const userRepository = { findOne: jest.fn(() => Promise.resolve(options.user ?? null)) }
  const jwtService = { signAsync: jest.fn(() => Promise.resolve('signed-token')) }
  const permissionService = {
    getUserRoleCodes: jest.fn(() => Promise.resolve(['super_admin'])),
    getUserPermissionCodes: jest.fn(() => Promise.resolve(['system:user:query'])),
  }
  const service = new AuthService(
    userRepository as never,
    jwtService as never,
    permissionService as never,
  )
  return { service, userRepository, jwtService, permissionService }
}

const adminUser = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'admin',
  nickname: '系统管理员',
  password: ADMIN_PASSWORD_HASH,
  status: true,
}

describe('AuthService', () => {
  it('登录成功应返回签发的 token', async () => {
    const { service, jwtService } = makeService({ user: adminUser })
    await expect(service.login('admin', 'admin123')).resolves.toEqual({ token: 'signed-token' })
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: adminUser.id, username: 'admin' })
  })

  it('用户不存在与口令错误应抛同一错误码（防账号枚举契约）', async () => {
    // 用户不存在
    const noUser = makeService({ user: null })
    await expect(noUser.service.login('ghost', 'whatever')).rejects.toMatchObject({
      code: SystemErrorCode.AUTH_LOGIN_FAILED.code,
    })
    // 口令错误
    const wrongPassword = makeService({ user: adminUser })
    await expect(wrongPassword.service.login('admin', 'wrong-password')).rejects.toMatchObject({
      code: SystemErrorCode.AUTH_LOGIN_FAILED.code,
    })
  })

  it('停用账号登录应抛 AUTH_LOGIN_DISABLED', async () => {
    const { service } = makeService({ user: { ...adminUser, status: false } })
    await expect(service.login('admin', 'admin123')).rejects.toMatchObject({
      code: SystemErrorCode.AUTH_LOGIN_DISABLED.code,
    })
  })

  it('getActiveUserById 对停用用户应返回 null（存在性校验的即时失效语义）', async () => {
    const { service } = makeService({ user: { ...adminUser, status: false } })
    await expect(service.getActiveUserById(adminUser.id)).resolves.toBeNull()
  })

  it('getPermissionInfo 应一次拉齐用户、角色与权限集合', async () => {
    const { service } = makeService({ user: adminUser })
    await expect(service.getPermissionInfo(adminUser.id)).resolves.toEqual({
      user: { id: adminUser.id, username: 'admin', nickname: '系统管理员' },
      roles: ['super_admin'],
      permissions: ['system:user:query'],
    })
  })

  it('getPermissionInfo 对不存在用户应抛 USER_NOT_EXISTS', async () => {
    const { service } = makeService({ user: null })
    await expect(service.getPermissionInfo('ghost-id')).rejects.toMatchObject({
      code: SystemErrorCode.USER_NOT_EXISTS.code,
    })
  })

  it('散列格式契约：种子散列应可被 bcrypt 校验通过（迁移与登录互验）', async () => {
    // 直接验证 bcrypt.compareSync 对种子散列的行为，守护「种子可登录」这一关键链路
    const bcrypt = await import('bcryptjs')
    expect(bcrypt.compareSync('admin123', ADMIN_PASSWORD_HASH)).toBe(true)
    expect(bcrypt.compareSync('other', ADMIN_PASSWORD_HASH)).toBe(false)
  })
})
