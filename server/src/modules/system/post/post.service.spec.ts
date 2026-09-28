import { describe, expect, it } from '@jest/globals'

import type { PostEntity } from '../entities/post.entity'
import { SystemErrorCode } from '../error-codes'
import { PostService } from './post.service'

type PostRow = Partial<PostEntity> & { id: string }

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

function makeService(options: { posts?: PostRow[] } = {}) {
  const posts: PostRow[] = (options.posts ?? []).map(row => ({ ...row }))
  const userPostDeleted: Record<string, unknown>[] = []
  const postRepository = {
    findOne: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(posts.find(post => matches(post, where)) ?? null),
    save: (entity: PostEntity) => Promise.resolve(entity),
    create: (data: Partial<PostEntity>) => Object.assign({ status: true, sort: 0 }, data),
    softRemove: (entity: PostEntity) => Promise.resolve(entity),
  }
  const userPostRepository = {
    delete: (criteria: Record<string, unknown>) => {
      userPostDeleted.push(criteria)
      return Promise.resolve({})
    },
  }
  const service = new PostService(postRepository as never, userPostRepository as never)
  return { service, userPostDeleted }
}

const SE: PostRow = { id: 'p1', code: 'se', name: '研发工程师' }

describe('PostService', () => {
  it('创建岗位时 code 已存在应抛 POST_CODE_DUPLICATE', async () => {
    const { service } = makeService({ posts: [SE] })
    await expect(service.create({ code: 'se', name: '工程师' })).rejects.toMatchObject({
      code: SystemErrorCode.POST_CODE_DUPLICATE.code,
    })
  })

  it('更新自身保留原 code 不应误判重复', async () => {
    const { service } = makeService({ posts: [SE] })
    await expect(service.update({ id: 'p1', code: 'se', name: '资深研发' })).resolves.toBeUndefined()
  })

  it('更新为他人已占 code 应抛 POST_CODE_DUPLICATE', async () => {
    const { service } = makeService({
      posts: [SE, { id: 'p2', code: 'hr', name: '人力资源' }],
    })
    await expect(service.update({ id: 'p1', code: 'hr', name: '研发' })).rejects.toMatchObject({
      code: SystemErrorCode.POST_CODE_DUPLICATE.code,
    })
  })

  it('删除岗位应连带物理清理用户岗位关联（防悬空契约）', async () => {
    const { service, userPostDeleted } = makeService({ posts: [SE] })
    await service.remove('p1')
    expect(userPostDeleted).toEqual([{ postId: 'p1' }])
  })

  it('岗位不存在应抛 POST_NOT_EXISTS', async () => {
    const { service } = makeService()
    await expect(service.remove('ghost')).rejects.toMatchObject({
      code: SystemErrorCode.POST_NOT_EXISTS.code,
    })
  })
})
