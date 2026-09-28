import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm'
import type { Server } from 'node:http'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { dataSourceStub } from './support/data-source-stub'
import type { ApiResponse } from '../src/common/interfaces/api-response.interface'
import type { PermissionInfoVo } from '../src/modules/system/auth/dto/permission-info.dto'
import { RolePermissionEntity } from '../src/modules/system/entities/role-permission.entity'
import { RoleEntity } from '../src/modules/system/entities/role.entity'
import { UserRoleEntity } from '../src/modules/system/entities/user-role.entity'
import { UserEntity } from '../src/modules/system/entities/user.entity'
import { SystemErrorCode } from '../src/modules/system/error-codes'
import { SYSTEM_PERMISSION_CODES } from '../src/modules/system/permissions'

// 环境变量须在 TestingModule 构建前设置（configuration 工厂在模块初始化时执行；
// Jest 按测试文件分进程运行，与其他套件的环境变量互不影响）
process.env.SIGNATURE_ENABLED = 'false'
process.env.JWT_SECRET = 'e2e-jwt-secret'

/** admin123 的 BCrypt 散列（与种子迁移同源，两个测试用户共用） */
const PASSWORD_HASH = '$2a$10$8yeFDSyUDUfl4SwuLGEah.XGaPS4uQLJb53EwXiCqXjUyxFKFAkLC'

const ADMIN_ID = '00000000-0000-0000-0000-000000000001'
const SUPER_ADMIN_ROLE_ID = '00000000-0000-0000-0000-000000000002'
const PLAIN_USER_ID = '00000000-0000-0000-0000-000000000003'

/** 内存数据：超管 admin + 无任何角色的普通用户 nobody（覆盖权限两极） */
const users: Partial<UserEntity>[] = [
  { id: ADMIN_ID, username: 'admin', nickname: '系统管理员', password: PASSWORD_HASH, status: true },
  { id: PLAIN_USER_ID, username: 'nobody', nickname: '无权限用户', password: PASSWORD_HASH, status: true },
]
const roles: Partial<RoleEntity>[] = [
  { id: SUPER_ADMIN_ROLE_ID, code: 'super_admin', name: '超级管理员', status: true },
]
const userRoles: Partial<UserRoleEntity>[] = [
  { userId: ADMIN_ID, roleId: SUPER_ADMIN_ROLE_ID },
]
const rolePermissions: Partial<RolePermissionEntity>[] = []

/** 内存仓库桩：仅实现 service 用到的查询形态（findOne 按字段等值、find 按调用方语义过滤） */
function makeUserRepository() {
  return {
    findOne: (criteria: { where: Record<string, string> }) =>
      Promise.resolve(
        users.find(user =>
          Object.entries(criteria.where).every(([key, value]) => user[key as keyof UserEntity] === value),
        ) ?? null,
      ),
  }
}

function makeRoleRepository() {
  return {
    // 调用方语义：按 id 集合查启用角色（status: true）——桩直接返回启用角色全集（数据集固定，语义等价）
    find: (criteria: { where?: { status?: boolean } }) =>
      Promise.resolve(roles.filter(role => role.status === criteria.where?.status)),
  }
}

function makeUserRoleRepository() {
  return {
    find: (criteria: { where: { userId: string } }) =>
      Promise.resolve(userRoles.filter(relation => relation.userId === criteria.where.userId)),
  }
}

function makeRolePermissionRepository() {
  return {
    find: () => Promise.resolve(rolePermissions),
  }
}

describe('Auth (e2e)', () => {
  let app: INestApplication
  let server: Server
  let adminToken: string

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSourceStub)
      .overrideProvider(getRepositoryToken(UserEntity))
      .useValue(makeUserRepository())
      .overrideProvider(getRepositoryToken(RoleEntity))
      .useValue(makeRoleRepository())
      .overrideProvider(getRepositoryToken(UserRoleEntity))
      .useValue(makeUserRoleRepository())
      .overrideProvider(getRepositoryToken(RolePermissionEntity))
      .useValue(makeRolePermissionRepository())
      .compile()

    app = moduleFixture.createNestApplication({ rawBody: true })
    // 与 main.ts 保持一致的前缀与管道；全局 Guard / 过滤器 / 拦截器经 AppModule 注册，自动生效
    app.setGlobalPrefix('api')
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    await app.init()
    server = app.getHttpServer() as Server
  })

  afterAll(async () => {
    await app.close()
  })

  it('登录成功应返回统一包装结构与 token', async () => {
    const res = await request(server)
      .post('/api/system/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200)
    const body = res.body as ApiResponse<{ token: string }>
    expect(body.code).toBe(0)
    expect(typeof body.data?.token).toBe('string')
    expect(body.data?.token.length).toBeGreaterThan(0)
    adminToken = body.data!.token
  })

  it('口令错误应返回 400 与同码业务错误（防账号枚举契约）', () => {
    return request(server)
      .post('/api/system/auth/login')
      .send({ username: 'admin', password: 'wrong-password' })
      .expect(400)
      .expect((res) => {
        const body = res.body as ApiResponse
        expect(body.code).toBe(SystemErrorCode.AUTH_LOGIN_FAILED.code)
      })
  })

  it('登录接口豁免签名校验（未携带签名头仍可到达业务逻辑）', () => {
    // SIGNATURE_ENABLED=false 下本用例语义由上一条承担，此处显式断言 POST 登录未被签名 Guard 拦截
    return request(server)
      .post('/api/system/auth/login')
      .send({ username: 'nobody', password: 'admin123' })
      .expect(200)
  })

  it('无 token 访问受保护接口应返回 401 统一错误结构', () => {
    return request(server)
      .get('/api/system/auth/get-permission-info')
      .expect(401)
      .expect((res) => {
        const body = res.body as ApiResponse
        expect(body.code).toBe(401)
      })
  })

  it('伪造 token 应返回 401', () => {
    return request(server)
      .get('/api/system/auth/get-permission-info')
      .set('Authorization', 'Bearer fake.token.value')
      .expect(401)
  })

  it('get-permission-info 应返回用户信息与 super_admin 收敛的权限全集', () => {
    return request(server)
      .get('/api/system/auth/get-permission-info')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<PermissionInfoVo>
        expect(body.code).toBe(0)
        expect(body.data?.user).toEqual({
          id: ADMIN_ID,
          username: 'admin',
          nickname: '系统管理员',
        })
        expect(body.data?.roles).toEqual(['super_admin'])
        // super_admin 收敛：返回注册表全集（批次五扩至 30 个权限串）
        expect(body.data?.permissions).toContain(SYSTEM_PERMISSION_CODES.USER_QUERY)
        expect(body.data?.permissions).toContain(SYSTEM_PERMISSION_CODES.DICT_QUERY)
        expect(body.data?.permissions?.length).toBe(30)
      })
  })

  it('登录后访问需权限接口但无权限应返回 403（Guard 链与注解装配）', async () => {
    const login = await request(server)
      .post('/api/system/auth/login')
      .send({ username: 'nobody', password: 'admin123' })
    const token = (login.body as ApiResponse<{ token: string }>).data!.token

    return request(server)
      .get('/api/system/user/page')
      .query({ pageNo: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect((res) => {
        const body = res.body as ApiResponse
        expect(body.code).toBe(403)
      })
  })

  it('logout 应返回 200 统一包装结构（无状态 JWT 占位接口）', () => {
    return request(server)
      .post('/api/system/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<unknown>
        expect(body.code).toBe(0)
      })
  })
})
