import { describe, expect, it, jest } from '@jest/globals'

import type { ClientInfo } from '../../../common/utils/client-info'
import type { UserEntity } from '../entities/user.entity'
import { SystemErrorCode } from '../error-codes'
import { LOGIN_LOG_TYPE_LOGIN, LOGIN_LOG_TYPE_LOGOUT } from '../system.constants'
import { AuthService } from './auth.service'

/** admin123 的 BCrypt 散列（与种子迁移同源） */
const ADMIN_PASSWORD_HASH = '$2a$10$8yeFDSyUDUfl4SwuLGEah.XGaPS4uQLJb53EwXiCqXjUyxFKFAkLC'

/** 登录日志桩：捕获 record 收到的实体形态（断言埋点字段用） */
function makeLoginLogService() {
  const recorded: unknown[] = []
  return {
    recorded,
    record: jest.fn((entity: unknown) => {
      recorded.push(entity)
    }),
  }
}

function makeService(options: { user?: Partial<UserEntity> | null }) {
  const userRepository = { findOne: jest.fn(() => Promise.resolve(options.user ?? null)) }
  const jwtService = { signAsync: jest.fn(() => Promise.resolve('signed-token')) }
  const permissionService = {
    getUserRoleCodes: jest.fn(() => Promise.resolve(['super_admin'])),
    getUserPermissionCodes: jest.fn(() => Promise.resolve(['system:user:query'])),
  }
  const loginLogService = makeLoginLogService()
  const service = new AuthService(
    userRepository as never,
    jwtService as never,
    permissionService as never,
    loginLogService as never,
  )
  return { service, userRepository, jwtService, permissionService, loginLogService }
}

const adminUser = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'admin',
  nickname: '系统管理员',
  password: ADMIN_PASSWORD_HASH,
  status: true,
}

const client: ClientInfo = { ip: '127.0.0.1', userAgent: 'jest-agent' }

describe('AuthService', () => {
  it('登录成功应返回签发的 token', async () => {
    const { service, jwtService } = makeService({ user: adminUser })
    await expect(service.login('admin', 'admin123', client)).resolves.toEqual({ token: 'signed-token' })
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: adminUser.id, username: 'admin' })
  })

  it('用户不存在与口令错误应抛同一错误码（防账号枚举契约）', async () => {
    // 用户不存在
    const noUser = makeService({ user: null })
    await expect(noUser.service.login('ghost', 'whatever', client)).rejects.toMatchObject({
      code: SystemErrorCode.AUTH_LOGIN_FAILED.code,
    })
    // 口令错误
    const wrongPassword = makeService({ user: adminUser })
    await expect(wrongPassword.service.login('admin', 'wrong-password', client)).rejects.toMatchObject({
      code: SystemErrorCode.AUTH_LOGIN_FAILED.code,
    })
  })

  it('停用账号登录应抛 AUTH_LOGIN_DISABLED', async () => {
    const { service } = makeService({ user: { ...adminUser, status: false } })
    await expect(service.login('admin', 'admin123', client)).rejects.toMatchObject({
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

describe('AuthService 登录日志埋点', () => {
  it('登录失败应记 logType 10、userId null 与尝试的账号名', async () => {
    const { service, loginLogService } = makeService({ user: null })
    await expect(service.login('ghost', 'whatever', client)).rejects.toThrow()
    expect(loginLogService.record).toHaveBeenCalledTimes(1)
    expect(loginLogService.recorded[0]).toMatchObject({
      logType: LOGIN_LOG_TYPE_LOGIN,
      userId: null,
      username: 'ghost',
      ip: client.ip,
      userAgent: client.userAgent,
      resultCode: SystemErrorCode.AUTH_LOGIN_FAILED.code,
    })
  })

  it('停用登录应记 userId 与 AUTH_LOGIN_DISABLED 业务码', async () => {
    const { service, loginLogService } = makeService({ user: { ...adminUser, status: false } })
    await expect(service.login('admin', 'admin123', client)).rejects.toThrow()
    expect(loginLogService.recorded[0]).toMatchObject({
      logType: LOGIN_LOG_TYPE_LOGIN,
      userId: adminUser.id,
      resultCode: SystemErrorCode.AUTH_LOGIN_DISABLED.code,
    })
  })

  it('登录成功应记 resultCode 0 与 resultMsg null', async () => {
    const { service, loginLogService } = makeService({ user: adminUser })
    await service.login('admin', 'admin123', client)
    expect(loginLogService.recorded[0]).toMatchObject({
      logType: LOGIN_LOG_TYPE_LOGIN,
      userId: adminUser.id,
      username: 'admin',
      resultCode: 0,
      resultMsg: null,
    })
  })

  it('登出应记 logType 20 与当前用户', () => {
    const { service, loginLogService } = makeService({ user: adminUser })
    service.logout({ id: adminUser.id, username: 'admin' }, client)
    expect(loginLogService.recorded[0]).toMatchObject({
      logType: LOGIN_LOG_TYPE_LOGOUT,
      userId: adminUser.id,
      username: 'admin',
      resultCode: 0,
    })
  })

  it('日志记录失败不得阻断登录主链路（埋点只告警契约）', async () => {
    const userRepository = { findOne: jest.fn(() => Promise.resolve(adminUser as Partial<UserEntity>)) }
    const loginLogService = {
      record: jest.fn(() => {
        throw new Error('队列提交失败')
      }),
    }
    const service = new AuthService(
      userRepository as never,
      { signAsync: jest.fn(() => Promise.resolve('signed-token')) } as never,
      {} as never,
      loginLogService as never,
    )
    await expect(service.login('admin', 'admin123', client)).resolves.toEqual({ token: 'signed-token' })
  })
})
