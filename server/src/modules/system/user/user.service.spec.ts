import { describe, expect, it } from '@jest/globals'
import * as bcrypt from 'bcryptjs'

import type { UserEntity } from '../entities/user.entity'
import { SystemErrorCode } from '../error-codes'
import { UserService } from './user.service'

/** 造 service：configTableValue 为参数表取值（null 表示未命中），envValue 为 env 兜底（undefined 表示未配置） */
function makeService(options: {
  configTableValue?: string | null
  envValue?: string
  users?: (Partial<UserEntity> & { id: string })[]
  posts?: { id: string }[]
  userPosts?: { userId: string, postId: string }[]
} = {}) {
  // 逐行浅拷贝：service 会就地修改实体字段，防跨用例污染共享常量
  const users = (options.users ?? []).map(row => ({ ...row }))
  const posts = options.posts ?? []
  const userPosts = options.userPosts ?? []
  const saved: Partial<UserEntity>[] = []
  const userPostInserted: { userId: string, postId: string }[] = []
  const userPostDeleted: Record<string, unknown>[] = []
  const userRoleDeleted: Record<string, unknown>[] = []

  const userRepository = {
    findOne: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(
        users.find(user =>
          Object.entries(where).every(([key, value]) => (user as Record<string, unknown>)[key] === value),
        ) ?? null,
      ),
    findAndCount: () => Promise.resolve([users, users.length]),
    save: (entity: Partial<UserEntity>) => {
      saved.push(entity)
      // 模拟数据库生成主键（创建路径的关联插入依赖返回行携带 id）
      return Promise.resolve(Object.assign(entity, { id: entity.id ?? 'generated-id' }))
    },
    create: (data: Partial<UserEntity>) => Object.assign({ status: true, deptId: null }, data),
    softRemove: () => Promise.resolve(),
  }
  const userRoleRepository = {
    find: () => Promise.resolve([]),
    delete: (criteria: Record<string, unknown>) => {
      userRoleDeleted.push(criteria)
      return Promise.resolve({})
    },
    insert: () => Promise.resolve({}),
  }
  const userPostRepository = {
    // where.userId 为 In 操作符（批量补全），桩直接返回全集由 service 分组
    find: () => Promise.resolve(userPosts),
    delete: (criteria: Record<string, unknown>) => {
      userPostDeleted.push(criteria)
      return Promise.resolve({})
    },
    insert: (rows: { userId: string, postId: string }[]) => {
      userPostInserted.push(...rows)
      return Promise.resolve({})
    },
  }
  const deptRepository = {
    findOne: () => Promise.resolve(null),
    // 补全批量查询：直接返回可用部门全集（映射语义等价）
    find: () => Promise.resolve([{ id: 'd1', name: '研发部' }]),
  }
  const postRepository = {
    // In(...) 的 FindOperator 经 .value 取原始数组（存在性数量比对）
    find: ({ where }: { where: { id?: unknown } }) => {
      const wanted = (where.id as { value?: string[] } | undefined)?.value ?? []
      return Promise.resolve(posts.filter(post => wanted.includes(post.id)))
    },
  }
  const service = new UserService(
    userRepository as never,
    userRoleRepository as never,
    userPostRepository as never,
    deptRepository as never,
    postRepository as never,
    { get: () => options.envValue } as never,
    { getValueByKey: () => Promise.resolve(options.configTableValue ?? null) } as never,
  )
  return { service, saved, userPostInserted, userPostDeleted, userRoleDeleted }
}

describe('UserService 初始口令三级兜底链', () => {
  it('参数表命中时应使用参数表口令（改参数即刻生效契约）', async () => {
    const { service, saved } = makeService({ configTableValue: 'table-pass' })
    await service.create({ username: 'alice', nickname: '爱丽丝' })
    expect(bcrypt.compareSync('table-pass', String(saved[0].password))).toBe(true)
  })

  it('参数表未命中应回退 env 配置', async () => {
    const { service, saved } = makeService({ configTableValue: null, envValue: 'env-pass' })
    await service.create({ username: 'alice', nickname: '爱丽丝' })
    expect(bcrypt.compareSync('env-pass', String(saved[0].password))).toBe(true)
  })

  it('参数表与 env 皆未配置应硬兜底 admin123', async () => {
    const { service, saved } = makeService({ configTableValue: null, envValue: undefined })
    await service.create({ username: 'alice', nickname: '爱丽丝' })
    expect(bcrypt.compareSync('admin123', String(saved[0].password))).toBe(true)
  })

  it('显式传入口令优先于三级链', async () => {
    const { service, saved } = makeService({ configTableValue: 'table-pass' })
    await service.create({ username: 'alice', nickname: '爱丽丝', password: 'custom-pass' })
    expect(bcrypt.compareSync('custom-pass', String(saved[0].password))).toBe(true)
  })
})

describe('UserService 部门与岗位', () => {
  it('创建时 postIds 含不存在的岗位应抛 POST_NOT_EXISTS', async () => {
    const { service } = makeService({ posts: [{ id: 'p1' }] })
    await expect(
      service.create({ username: 'alice', nickname: '爱丽丝', postIds: ['p1', 'ghost'] }),
    ).rejects.toMatchObject({ code: SystemErrorCode.POST_NOT_EXISTS.code })
  })

  it('创建时岗位齐全应插入全部岗位关联', async () => {
    const { service, userPostInserted } = makeService({ posts: [{ id: 'p1' }, { id: 'p2' }] })
    await service.create({ username: 'alice', nickname: '爱丽丝', postIds: ['p1', 'p2'] })
    expect(userPostInserted).toEqual([
      { userId: 'generated-id', postId: 'p1' },
      { userId: 'generated-id', postId: 'p2' },
    ])
  })

  it('更新岗位应为差集增量绑定（删旧缺增新缺）', async () => {
    const { service, userPostInserted, userPostDeleted } = makeService({
      users: [{ id: 'u1', username: 'alice', nickname: '爱丽丝', status: true }],
      posts: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
      userPosts: [
        { userId: 'u1', postId: 'p1' },
        { userId: 'u1', postId: 'p2' },
      ],
    })
    await service.update({ id: 'u1', nickname: '爱丽丝', status: true, postIds: ['p2', 'p3'] })
    // 现有 [p1, p2] → 目标 [p2, p3]：删 p1、增 p3
    expect(userPostDeleted).toHaveLength(1)
    expect((userPostDeleted[0].postId as { value: string[] }).value).toEqual(['p1'])
    expect(userPostInserted).toEqual([{ userId: 'u1', postId: 'p3' }])
  })

  it('删除用户应物理清理角色与岗位两类关联', async () => {
    const { service, userPostDeleted, userRoleDeleted } = makeService({
      users: [{ id: 'u1', username: 'alice', nickname: '爱丽丝', status: true }],
    })
    await service.remove('u1')
    expect(userRoleDeleted).toEqual([{ userId: 'u1' }])
    expect(userPostDeleted).toEqual([{ userId: 'u1' }])
  })

  it('分页列表应批量补全部门名与岗位 id 集合', async () => {
    const { service } = makeService({
      users: [
        { id: 'u1', username: 'alice', nickname: '爱丽丝', status: true, deptId: 'd1' },
        { id: 'u2', username: 'bob', nickname: '鲍勃', status: true, deptId: null },
      ],
      userPosts: [
        { userId: 'u1', postId: 'p1' },
        { userId: 'u1', postId: 'p2' },
      ],
    })
    const page = await service.getPage({ pageNo: 1, pageSize: 10 })
    expect(page.total).toBe(2)
    expect(page.list[0]).toMatchObject({ username: 'alice', deptId: 'd1', deptName: '研发部', postIds: ['p1', 'p2'] })
    expect(page.list[1]).toMatchObject({ username: 'bob', deptId: null, deptName: null, postIds: [] })
  })
})
