import { describe, expect, it } from '@jest/globals'

import type { DeptEntity } from '../entities/dept.entity'
import { SystemErrorCode } from '../error-codes'
import { DeptService } from './dept.service'

type DeptRow = Partial<DeptEntity> & { id: string }

function makeService(options: { depts?: DeptRow[], hasUser?: boolean } = {}) {
  // 逐行浅拷贝：service 会就地修改实体字段（如 parentId 重挂），防跨用例污染共享常量
  const depts: DeptRow[] = (options.depts ?? []).map(row => ({ ...row }))
  const softRemoved: string[] = []
  const deptRepository = {
    findOne: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(
        depts.find(dept =>
          Object.entries(where).every(([key, value]) => (dept as Record<string, unknown>)[key] === value),
        ) ?? null,
      ),
    find: () => Promise.resolve(depts),
    save: (entity: DeptEntity) => Promise.resolve(entity),
    create: (data: Partial<DeptEntity>) => Object.assign({ status: true, sort: 0, parentId: null }, data),
    softRemove: (entity: DeptEntity) => {
      softRemoved.push(entity.id)
      return Promise.resolve()
    },
  }
  const userRepository = {
    findOne: ({ where }: { where: { deptId: string } }) =>
      Promise.resolve(options.hasUser && where.deptId ? { id: 'u1' } : null),
  }
  const service = new DeptService(deptRepository as never, userRepository as never)
  return { service, softRemoved }
}

// 组织：root(id=r) ← dev(id=d, parent=r)
const ROOT: DeptRow = { id: 'r', name: 'n-1 科技', parentId: null }
const DEV: DeptRow = { id: 'd', name: '研发部', parentId: 'r' }

describe('DeptService 防环三态', () => {
  it('parentId 为 null（改为根）应放行', async () => {
    const { service } = makeService({ depts: [ROOT, DEV] })
    await expect(service.update({ id: 'd', name: '研发部', parentId: undefined })).resolves.toBeUndefined()
  })

  it('自环（parent 指向自身）应抛 DEPT_PARENT_ERROR', async () => {
    const { service } = makeService({ depts: [ROOT, DEV] })
    await expect(service.update({ id: 'd', name: '研发部', parentId: 'd' })).rejects.toMatchObject({
      code: SystemErrorCode.DEPT_PARENT_ERROR.code,
    })
  })

  it('上级部门不存在应抛 DEPT_PARENT_ERROR', async () => {
    const { service } = makeService({ depts: [ROOT, DEV] })
    await expect(service.update({ id: 'd', name: '研发部', parentId: 'ghost' })).rejects.toMatchObject({
      code: SystemErrorCode.DEPT_PARENT_ERROR.code,
    })
    await expect(service.create({ name: '新部门', parentId: 'ghost' })).rejects.toMatchObject({
      code: SystemErrorCode.DEPT_PARENT_ERROR.code,
    })
  })

  it('上溯回到自身（父链成环）应抛 DEPT_PARENT_ERROR', async () => {
    // 把 root 挂到 dev 下：沿 dev → root 上溯即回到自身，成环
    const { service } = makeService({ depts: [ROOT, DEV] })
    await expect(service.update({ id: 'r', name: 'n-1 科技', parentId: 'd' })).rejects.toMatchObject({
      code: SystemErrorCode.DEPT_PARENT_ERROR.code,
    })
  })
})

describe('DeptService 删除约束', () => {
  it('存在子部门应抛 DEPT_HAS_CHILD', async () => {
    const { service } = makeService({ depts: [ROOT, DEV] })
    await expect(service.remove('r')).rejects.toMatchObject({
      code: SystemErrorCode.DEPT_HAS_CHILD.code,
    })
  })

  it('部门下挂用户应抛 DEPT_HAS_USER', async () => {
    const { service } = makeService({ depts: [DEV], hasUser: true })
    await expect(service.remove('d')).rejects.toMatchObject({
      code: SystemErrorCode.DEPT_HAS_USER.code,
    })
  })

  it('无子无用户应软删成功', async () => {
    const { service, softRemoved } = makeService({ depts: [DEV] })
    await service.remove('d')
    expect(softRemoved).toEqual(['d'])
  })

  it('部门不存在应抛 DEPT_NOT_EXISTS', async () => {
    const { service } = makeService()
    await expect(service.remove('ghost')).rejects.toMatchObject({
      code: SystemErrorCode.DEPT_NOT_EXISTS.code,
    })
  })
})
