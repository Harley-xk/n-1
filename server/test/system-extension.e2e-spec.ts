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
import type { DeptVo } from '../src/modules/system/dept/dto/dept.dto'
import type { DictTypeSimpleVo } from '../src/modules/system/dict/dto/dict.dto'
import { ConfigEntity } from '../src/modules/system/entities/config.entity'
import { DeptEntity } from '../src/modules/system/entities/dept.entity'
import { DictDataEntity } from '../src/modules/system/entities/dict-data.entity'
import { DictTypeEntity } from '../src/modules/system/entities/dict-type.entity'
import { LoginLogEntity } from '../src/modules/system/entities/login-log.entity'
import { OperateLogEntity } from '../src/modules/system/entities/operate-log.entity'
import { PostEntity } from '../src/modules/system/entities/post.entity'
import { RolePermissionEntity } from '../src/modules/system/entities/role-permission.entity'
import { RoleEntity } from '../src/modules/system/entities/role.entity'
import { UserPostEntity } from '../src/modules/system/entities/user-post.entity'
import { UserRoleEntity } from '../src/modules/system/entities/user-role.entity'
import { UserEntity } from '../src/modules/system/entities/user.entity'
import type { PermissionPoint } from '../src/modules/system/permissions'
import {
  CONFIG_INIT_PASSWORD_ID,
  DEPT_DEV_ID,
  DEPT_ROOT_ID,
  DICT_DATA_DISABLE_ID,
  DICT_DATA_ENABLE_ID,
  DICT_TYPE_STATUS_ID,
  POST_CEO_ID,
  POST_SE_ID,
} from '../src/modules/system/system.constants'
import type { UserVo } from '../src/modules/system/user/dto/user.dto'

// 环境变量须在 TestingModule 构建前设置（Jest 按测试文件分进程运行，与其他套件互不影响）
process.env.SIGNATURE_ENABLED = 'false'
process.env.JWT_SECRET = 'e2e-jwt-secret'

/** admin123 的 BCrypt 散列（与种子迁移同源） */
const PASSWORD_HASH = '$2a$10$8yeFDSyUDUfl4SwuLGEah.XGaPS4uQLJb53EwXiCqXjUyxFKFAkLC'

const ADMIN_ID = '00000000-0000-4000-8000-000000000001'
const SUPER_ADMIN_ROLE_ID = '00000000-0000-4000-8000-000000000002'
const PLAIN_USER_ID = '00000000-0000-4000-8000-000000000003'
const NEW_USER_ID = '00000000-0000-4000-8000-000000000004'

// ===== 内存数据（admin 挂根部门 + 研发部 + 通用状态字典 + 初始口令参数） =====

const users: Partial<UserEntity>[] = [
  { id: ADMIN_ID, username: 'admin', nickname: '系统管理员', password: PASSWORD_HASH, status: true, deptId: DEPT_ROOT_ID },
  { id: PLAIN_USER_ID, username: 'nobody', nickname: '无权限用户', password: PASSWORD_HASH, status: true, deptId: null },
]
const roles: Partial<RoleEntity>[] = [
  { id: SUPER_ADMIN_ROLE_ID, code: 'super_admin', name: '超级管理员', status: true },
]
const userRoles: Partial<UserRoleEntity>[] = [
  { userId: ADMIN_ID, roleId: SUPER_ADMIN_ROLE_ID },
]
const rolePermissions: Partial<RolePermissionEntity>[] = []
const depts: Partial<DeptEntity>[] = [
  { id: DEPT_ROOT_ID, name: 'n-1 科技有限公司', parentId: null, sort: 0, status: true },
  { id: DEPT_DEV_ID, name: '研发部', parentId: DEPT_ROOT_ID, sort: 1, status: true },
]
const posts: Partial<PostEntity>[] = [
  { id: POST_CEO_ID, code: 'ceo', name: '董事长', sort: 1, status: true },
  { id: POST_SE_ID, code: 'se', name: '研发工程师', sort: 2, status: true },
]
const dictTypes: Partial<DictTypeEntity>[] = [
  { id: DICT_TYPE_STATUS_ID, name: '通用状态', type: 'common_status', status: true, remark: null },
  { id: '00000000-0000-4000-8000-000000000034', name: '停用演示', type: 'demo_disabled', status: false, remark: null },
]
const dictDatas: Partial<DictDataEntity>[] = [
  { id: DICT_DATA_ENABLE_ID, dictType: 'common_status', sort: 1, label: '启用', dictValue: 'true', status: true, colorType: 'success', remark: null },
  { id: DICT_DATA_DISABLE_ID, dictType: 'common_status', sort: 2, label: '停用', dictValue: 'false', status: true, colorType: 'danger', remark: null },
]
const configs: Partial<ConfigEntity>[] = [
  { id: CONFIG_INIT_PASSWORD_ID, category: 'system', name: '新建用户初始口令', configKey: 'system.user.init-password', configValue: 'admin123', visible: false, remark: null },
]

// ===== 异步入库捕获桩（操作 / 登录日志经队列落桩，drain 后断言） =====

const operateLogs: Partial<OperateLogEntity>[] = []
const loginLogs: Partial<LoginLogEntity>[] = []
const userPostInserted: { userId: string, postId: string }[] = []

/** 行匹配 where 等值条件 */
function matches(row: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean {
  if (!where)
    return true
  return Object.entries(where).every(([key, value]) => row[key] === value)
}

describe('SystemExtension (e2e)', () => {
  let app: INestApplication
  let server: Server
  let adminToken: string

  /** 排空异步任务队列：日志异步入库断言前必须等待落桩 */
  async function drainLogQueue(): Promise<void> {
    await app.get(AsyncTaskQueue).drain()
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSourceStub)
      .overrideProvider(getRepositoryToken(UserEntity))
      .useValue({
        findOne: ({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve(users.find(user => matches(user as never, where)) ?? null),
        findAndCount: () => Promise.resolve([users, users.length]),
        save: (entity: Partial<UserEntity>) => Promise.resolve(Object.assign(entity, { id: entity.id ?? NEW_USER_ID })),
        create: (data: Partial<UserEntity>) => Object.assign({ status: true, deptId: null }, data),
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
        delete: () => Promise.resolve({}),
        insert: () => Promise.resolve({}),
      })
      .overrideProvider(getRepositoryToken(RolePermissionEntity))
      .useValue({ find: () => Promise.resolve(rolePermissions) })
      .overrideProvider(getRepositoryToken(DeptEntity))
      .useValue({
        find: () => Promise.resolve(depts),
        findOne: ({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve(depts.find(dept => matches(dept as never, where)) ?? null),
        save: (entity: DeptEntity) => Promise.resolve(entity),
        create: (data: Partial<DeptEntity>) => Object.assign({ sort: 0, status: true, parentId: null }, data),
        softRemove: () => Promise.resolve(),
      })
      .overrideProvider(getRepositoryToken(PostEntity))
      .useValue({
        // 存在性校验按 In 集合查（数量比对语义），桩按集合过滤返回
        find: ({ where }: { where: { id?: unknown } }) => {
          const wanted = (where.id as { value?: string[] } | undefined)?.value
          return Promise.resolve(wanted ? posts.filter(post => wanted.includes(post.id!)) : posts)
        },
        findOne: () => Promise.resolve(null),
        save: (entity: PostEntity) => Promise.resolve(entity),
        create: (data: Partial<PostEntity>) => Object.assign({ sort: 0, status: true }, data),
        softRemove: () => Promise.resolve(),
      })
      .overrideProvider(getRepositoryToken(UserPostEntity))
      .useValue({
        find: ({ where }: { where: { userId: string } }) =>
          Promise.resolve(userPostInserted.filter(relation => relation.userId === where.userId)),
        delete: () => Promise.resolve({}),
        insert: (rows: { userId: string, postId: string }[]) => {
          userPostInserted.push(...rows)
          return Promise.resolve({})
        },
      })
      .overrideProvider(getRepositoryToken(DictTypeEntity))
      .useValue({
        find: ({ where }: { where?: Record<string, unknown> }) =>
          Promise.resolve(dictTypes.filter(type => matches(type as never, where))),
        findOne: ({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve(dictTypes.find(type => matches(type as never, where)) ?? null),
        findAndCount: () => Promise.resolve([dictTypes, dictTypes.length]),
        save: (entity: DictTypeEntity) => Promise.resolve(entity),
        create: (data: Partial<DictTypeEntity>) => Object.assign({ status: true, remark: null }, data),
        softRemove: () => Promise.resolve(),
      })
      .overrideProvider(getRepositoryToken(DictDataEntity))
      .useValue({
        find: ({ where }: { where?: Record<string, unknown> }) =>
          Promise.resolve(dictDatas.filter(data => matches(data as never, where))),
        findOne: ({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve(dictDatas.find(data => matches(data as never, where)) ?? null),
        findAndCount: () => Promise.resolve([dictDatas, dictDatas.length]),
        save: (entity: DictDataEntity) => Promise.resolve(entity),
        create: (data: Partial<DictDataEntity>) => Object.assign({ sort: 0, status: true, colorType: null, remark: null }, data),
        softRemove: () => Promise.resolve(),
        delete: () => Promise.resolve({}),
      })
      .overrideProvider(getRepositoryToken(ConfigEntity))
      .useValue({
        findOne: ({ where }: { where: { configKey: string } }) =>
          Promise.resolve(configs.find(config => config.configKey === where.configKey) ?? null),
        findAndCount: () => Promise.resolve([configs, configs.length]),
        save: (entity: ConfigEntity) => Promise.resolve(entity),
        create: (data: Partial<ConfigEntity>) => Object.assign({ visible: true, remark: null }, data),
        softRemove: () => Promise.resolve(),
      })
      .overrideProvider(getRepositoryToken(OperateLogEntity))
      .useValue({
        insert: (entity: Partial<OperateLogEntity>) => {
          operateLogs.push(entity)
          return Promise.resolve({})
        },
      })
      .overrideProvider(getRepositoryToken(LoginLogEntity))
      .useValue({
        insert: (entity: Partial<LoginLogEntity>) => {
          loginLogs.push(entity)
          return Promise.resolve({})
        },
      })
      .compile()

    app = moduleFixture.createNestApplication({ rawBody: true })
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

  it('管理员登录换取 token（后续用例的认证前提）', async () => {
    const res = await request(server)
      .post('/api/system/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200)
    adminToken = (res.body as ApiResponse<{ token: string }>).data!.token
  })

  it('字典折叠出口应只含启用类型与启用数据', () => {
    return request(server)
      .get('/api/system/dict/list-all-simple')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<DictTypeSimpleVo[]>
        expect(body.code).toBe(0)
        expect(body.data).toEqual([
          {
            id: DICT_TYPE_STATUS_ID,
            name: '通用状态',
            type: 'common_status',
            datas: [
              { label: '启用', value: 'true', colorType: 'success' },
              { label: '停用', value: 'false', colorType: 'danger' },
            ],
          },
        ])
      })
  })

  it('参数按键取值应返回参数表值（初始口令链第一级）', () => {
    return request(server)
      .get('/api/system/config/get-by-key')
      .query({ key: 'system.user.init-password' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<string>
        expect(body.code).toBe(0)
        expect(body.data).toBe('admin123')
      })
  })

  it('部门平铺列表应返回全量行（前端组树）', () => {
    return request(server)
      .get('/api/system/dept/list')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<DeptVo[]>
        expect(body.code).toBe(0)
        expect(body.data).toHaveLength(2)
        expect(body.data?.find(dept => dept.id === DEPT_DEV_ID)?.parentId).toBe(DEPT_ROOT_ID)
      })
  })

  it('权限点清单应返回注册表全集（30 项，角色分配弹窗数据源）', () => {
    return request(server)
      .get('/api/system/permission/list')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<PermissionPoint[]>
        expect(body.code).toBe(0)
        expect(body.data?.length).toBe(30)
        expect(body.data?.map(point => point.code)).toContain('system:dict:query')
        expect(body.data?.every(point => typeof point.label === 'string' && point.label.length > 0)).toBe(true)
      })
  })

  it('用户分页应批量补全部门名与岗位集合', () => {
    return request(server)
      .get('/api/system/user/page')
      .query({ pageNo: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<PageResult<UserVo>>
        expect(body.code).toBe(0)
        const admin = body.data?.list.find(user => user.username === 'admin')
        expect(admin?.deptId).toBe(DEPT_ROOT_ID)
        expect(admin?.deptName).toBe('n-1 科技有限公司')
        expect(admin?.postIds).toEqual([])
      })
  })

  it('创建用户应走通全链并埋操作日志（@OperateLog 打样 + 口令掩敏）', async () => {
    const res = await request(server)
      .post('/api/system/user/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'newuser', nickname: '新用户', password: 'init-pass', deptId: DEPT_DEV_ID, postIds: [POST_SE_ID] })
      // POST 的 201 已被全局响应包装拦截器归一为 200（见 docs/指南/统一响应与异常处理设计.md）
      .expect(200)
    const body = res.body as ApiResponse<string>
    expect(body.code).toBe(0)
    // 岗位关联已绑定
    expect(userPostInserted).toEqual([{ userId: NEW_USER_ID, postId: POST_SE_ID }])
    // 操作日志异步入库：掩敏契约（password 键不得明文入库）
    await drainLogQueue()
    const log = operateLogs.find(entry => entry.name === '创建用户')
    expect(log).toMatchObject({
      module: '用户管理',
      userId: ADMIN_ID,
      userName: 'admin',
      requestMethod: 'POST',
      requestUrl: '/api/system/user/create',
      resultCode: 0,
    })
    expect(log?.requestParams).toContain('******')
    expect(log?.requestParams).not.toContain('init-pass')
  })

  it('无权限用户访问新接口应返回 403（Guard 链对新权限点自动生效）', async () => {
    const login = await request(server)
      .post('/api/system/auth/login')
      .send({ username: 'nobody', password: 'admin123' })
    const token = (login.body as ApiResponse<{ token: string }>).data!.token
    return request(server)
      .get('/api/system/dict/list-all-simple')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect((res) => {
        expect((res.body as ApiResponse).code).toBe(403)
      })
  })
})
