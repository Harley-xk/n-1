import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm'
import type { Server } from 'node:http'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { dataSourceStub } from './support/data-source-stub'
import { AsyncTaskQueue } from '../src/common/async/async-task-queue'
import type { ApiResponse } from '../src/common/interfaces/api-response.interface'
import type { PageResult } from '../src/common/interfaces/page-result.interface'
import { DemoProductEntity } from '../src/modules/demo/entities/product.entity'
import type { ProductVo } from '../src/modules/demo/product/dto/product.dto'
import { LoginLogEntity } from '../src/modules/system/entities/login-log.entity'
import { OperateLogEntity } from '../src/modules/system/entities/operate-log.entity'
import { RolePermissionEntity } from '../src/modules/system/entities/role-permission.entity'
import { RoleEntity } from '../src/modules/system/entities/role.entity'
import { UserRoleEntity } from '../src/modules/system/entities/user-role.entity'
import { UserEntity } from '../src/modules/system/entities/user.entity'

// 环境变量须在 TestingModule 构建前设置（Jest 按测试文件分进程运行，与其他套件互不影响）
process.env.SIGNATURE_ENABLED = 'false'
process.env.JWT_SECRET = 'e2e-jwt-secret'

/** admin123 的 BCrypt 散列（与种子迁移同源） */
const PASSWORD_HASH = '$2a$10$8yeFDSyUDUfl4SwuLGEah.XGaPS4uQLJb53EwXiCqXjUyxFKFAkLC'

const ADMIN_ID = '00000000-0000-4000-8000-000000000001'
const SUPER_ADMIN_ROLE_ID = '00000000-0000-4000-8000-000000000002'
const PLAIN_USER_ID = '00000000-0000-4000-8000-000000000003'

// ===== 内存数据（admin 挂 super_admin 全集 + 两条示例商品，价格为 string 形态模拟 PG numeric 出参） =====

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
const products: Partial<DemoProductEntity>[] = [
  { id: 'g1', name: '无线蓝牙耳机', category: 'digital', price: '299.00' as unknown as number, status: true },
  { id: 'g2', name: '深入浅出 Vue.js', category: 'book', price: '89.00' as unknown as number, status: false },
]

const operateLogs: Partial<OperateLogEntity>[] = []

/** 行匹配 where 等值条件（含 Not 操作符：唯一性校验排除自身用） */
function matches(row: unknown, where: Record<string, unknown> | undefined): boolean {
  if (!where)
    return true
  const record = row as Record<string, unknown>
  return Object.entries(where).every(([key, value]) => {
    if (value !== null && typeof value === 'object' && 'type' in (value as Record<string, unknown>)) {
      const operator = value as { type: string, value: unknown }
      if (operator.type === 'not')
        return record[key] !== operator.value
    }
    return record[key] === value
  })
}

describe('DemoModule (e2e)', () => {
  let app: INestApplication
  let server: Server
  let adminToken: string
  let plainToken: string

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSourceStub)
      .overrideProvider(getRepositoryToken(UserEntity))
      .useValue({
        findOne: ({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve(users.find(user => matches(user, where)) ?? null),
        find: () => Promise.resolve(users),
        findAndCount: () => Promise.resolve([users, users.length]),
        save: (entity: Partial<UserEntity>) => Promise.resolve(entity),
        create: (data: Partial<UserEntity>) => Object.assign({ status: true }, data),
        softRemove: () => Promise.resolve(),
      })
      .overrideProvider(getRepositoryToken(RoleEntity))
      .useValue({
        find: (criteria: { where?: { status?: boolean } }) =>
          Promise.resolve(roles.filter(role => role.status === criteria.where?.status)),
      })
      .overrideProvider(getRepositoryToken(UserRoleEntity))
      .useValue({
        find: (criteria: { where: { userId: string } }) =>
          Promise.resolve(userRoles.filter(relation => relation.userId === criteria.where.userId)),
      })
      .overrideProvider(getRepositoryToken(RolePermissionEntity))
      .useValue({ find: () => Promise.resolve(rolePermissions) })
      .overrideProvider(getRepositoryToken(DemoProductEntity))
      .useValue({
        findAndCount: ({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve([
            products.filter(product => matches(product, where)),
            products.filter(product => matches(product, where)).length,
          ]),
        find: ({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve(products.filter(product => matches(product, where))),
        findOne: ({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve(products.find(product => matches(product, where)) ?? null),
        save: (entity: Partial<DemoProductEntity>) => {
          // 新建行补 id：须为合法 v4 形态（update 的 @IsUUID 会拒绝非 UUID）
          entity.id ??= '00000000-0000-4000-8000-000000000071'
          if (!products.some(product => product.id === entity.id))
            products.push(entity)
          return Promise.resolve(entity)
        },
        create: (data: Partial<DemoProductEntity>) => Object.assign({ status: true }, data),
        softRemove: (entity: DemoProductEntity) => {
          const index = products.findIndex(product => product.id === entity.id)
          if (index >= 0)
            products.splice(index, 1)
          return Promise.resolve(entity)
        },
      })
      .overrideProvider(getRepositoryToken(OperateLogEntity))
      .useValue({
        insert: (entity: Partial<OperateLogEntity>) => {
          operateLogs.push(entity)
          return Promise.resolve()
        },
      })
      .overrideProvider(getRepositoryToken(LoginLogEntity))
      .useValue({ insert: () => Promise.resolve() })
      .compile()

    app = moduleFixture.createNestApplication({ rawBody: true })
    // 复刻 main.ts 装配（e2e 不经 bootstrap，全局管道须手动补齐）
    app.setGlobalPrefix('api')
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    await app.init()
    server = app.getHttpServer() as Server

    const login = async (username: string) => {
      const res = await request(server).post('/api/system/auth/login').send({ username, password: 'admin123' })
      return (res.body as ApiResponse<{ token: string }>).data!.token
    }
    adminToken = await login('admin')
    plainToken = await login('nobody')
  })

  afterAll(async () => {
    await app.close()
  })

  it('商品分页与上架列表应走通统一响应契约（numeric 转数值出口）', async () => {
    const page = await request(server)
      .get('/api/demo/product/page')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<PageResult<ProductVo>>
        expect(body.code).toBe(0)
        expect(body.data?.total).toBe(2)
        expect(body.data?.list[0]?.price).toBe(299)
        expect(typeof body.data?.list[0]?.price).toBe('number')
      })
    expect(page).toBeDefined()

    await request(server)
      .get('/api/demo/product/list')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<ProductVo[]>
        // 上架列表过滤停用商品（下拉数据源契约）
        expect(body.data?.map(product => product.name)).toEqual(['无线蓝牙耳机'])
      })
  })

  it('创建 → 更新 → 删除商品闭环（写接口经权限 Guard 与操作日志拦截器）', async () => {
    const created = await request(server)
      .post('/api/demo/product/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '纯棉 T 恤', category: 'clothing', price: 59.9, status: true, description: '样板商品' })
      .expect(200)
    const id = (created.body as ApiResponse<string>).data!
    expect(id).toBeDefined()

    await request(server)
      .put('/api/demo/product/update')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id, name: '纯棉 T 恤', category: 'clothing', price: 69.9, status: true, description: '调价' })
      .expect(200)
      .expect((res) => {
        expect((res.body as ApiResponse<unknown>).code).toBe(0)
      })

    const got = await request(server)
      .get('/api/demo/product/get')
      .query({ id })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
    expect((got.body as ApiResponse<ProductVo>).data?.price).toBe(69.9)

    await request(server)
      .delete(`/api/demo/product/delete/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    // 排空异步队列后：三处写操作应各落一条「商品管理」操作日志
    await app.get(AsyncTaskQueue).drain()
    const demoLogs = operateLogs.filter(log => log.module === '商品管理')
    expect(demoLogs.map(log => log.name)).toEqual(['新增商品', '修改商品', '删除商品'])
  })

  it('创建重名商品应返回 demo 模块段位业务码（002-001-001）', async () => {
    // BusinessError 默认 HTTP 400，body 携九位分段码（模块 002 / 子域 001 / 序号 001）
    await request(server)
      .post('/api/demo/product/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '无线蓝牙耳机', category: 'digital', price: 199 })
      .expect(400)
      .expect((res) => {
        expect((res.body as ApiResponse<unknown>).code).toBe(200100001)
      })
  })

  it('无 demo 权限用户访问商品接口应返回 403（Guard 链对样板模块生效）', async () => {
    await request(server)
      .get('/api/demo/product/page')
      .set('Authorization', `Bearer ${plainToken}`)
      .expect(403)
  })

  it('super_admin 全集应自动扩容含 demo 权限（注册表多模块聚合零维护）', async () => {
    const res = await request(server)
      .get('/api/system/auth/get-permission-info')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
    const permissions = (res.body as ApiResponse<{ permissions: string[] }>).data!.permissions
    expect(permissions).toContain('demo:product:query')
    expect(permissions).toContain('demo:product:delete')
  })
})
