import { describe, expect, it, jest } from '@jest/globals'

import { DictDataEntity } from '../entities/dict-data.entity'
import { DictTypeEntity } from '../entities/dict-type.entity'
import { SystemErrorCode } from '../error-codes'
import { DictService } from './dict.service'

type TypeRow = Partial<DictTypeEntity> & { type: string }
type DataRow = Partial<DictDataEntity> & { dictType: string, dictValue: string }

/** 内存行匹配 where 等值条件（含 Not 操作符：唯一性校验排除自身用） */
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

function makeService(options: { types?: TypeRow[], datas?: DataRow[] } = {}) {
  // 逐行浅拷贝：service 会就地修改实体字段，防跨用例污染共享常量
  const types: TypeRow[] = (options.types ?? []).map(row => ({ ...row }))
  const datas: DataRow[] = (options.datas ?? []).map(row => ({ ...row }))
  const dataCalls = { deleted: [] as Record<string, unknown>[] }
  const manager = { save: jest.fn(), update: jest.fn() }
  const typeRepository = {
    findOne: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(types.find(type => matches(type, where)) ?? null),
    find: ({ where }: { where?: Record<string, unknown> }) =>
      Promise.resolve(types.filter(type => matches(type, where))),
    save: (entity: DictTypeEntity) => Promise.resolve(entity),
    create: (data: Partial<DictTypeEntity>) => Object.assign(new DictTypeEntity(), { id: 'generated-type-id' }, data),
    softRemove: (entity: DictTypeEntity) => Promise.resolve(entity),
  }
  const dataRepository = {
    findOne: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(datas.find(data => matches(data, where)) ?? null),
    find: ({ where }: { where?: Record<string, unknown> }) =>
      Promise.resolve(datas.filter(data => matches(data, where))),
    save: (entity: DictDataEntity) => Promise.resolve(entity),
    create: (data: Partial<DictDataEntity>) => Object.assign(new DictDataEntity(), { id: 'generated-data-id' }, data),
    softRemove: (entity: DictDataEntity) => Promise.resolve(entity),
    delete: (criteria: Record<string, unknown>) => {
      dataCalls.deleted.push(criteria)
      return Promise.resolve({})
    },
  }
  const service = new DictService(typeRepository as never, dataRepository as never, {
    // 事务桩：直接以 manager 执行回调，捕获级联改写调用
    transaction: (fn: (manager: unknown) => Promise<void>) => fn(manager),
  } as never)
  return { service, typeRepository, dataRepository, dataCalls, manager }
}

const STATUS_TYPE: TypeRow = { id: 't1', name: '通用状态', type: 'common_status', status: true }

describe('DictService 类型层', () => {
  it('创建类型时标识已存在应抛 DICT_TYPE_DUPLICATE', async () => {
    const { service } = makeService({ types: [STATUS_TYPE] })
    await expect(
      service.createType({ name: '通用状态', type: 'common_status' }),
    ).rejects.toMatchObject({ code: SystemErrorCode.DICT_TYPE_DUPLICATE.code })
  })

  it('更新类型变更标识应在事务中级联改写数据归属', async () => {
    const { service, manager } = makeService({
      types: [{ ...STATUS_TYPE }],
      datas: [{ dictType: 'common_status', label: '启用', dictValue: 'true' }],
    })
    await service.updateType({ id: 't1', name: '通用状态', type: 'renamed_status' })
    expect(manager.update).toHaveBeenCalledWith(
      DictDataEntity,
      { dictType: 'common_status' },
      { dictType: 'renamed_status' },
    )
  })

  it('更新类型标识未变时不得触发级联改写', async () => {
    const { service, manager } = makeService({ types: [{ ...STATUS_TYPE }] })
    await service.updateType({ id: 't1', name: '状态', type: 'common_status' })
    expect(manager.update).not.toHaveBeenCalled()
  })

  it('删除类型应连带物理删除该类型下全部数据（防悬空契约）', async () => {
    const { service, dataCalls } = makeService({ types: [{ ...STATUS_TYPE }] })
    await service.removeType('t1')
    expect(dataCalls.deleted).toEqual([{ dictType: 'common_status' }])
  })
})

describe('DictService 数据层', () => {
  it('创建数据时所属类型不存在应抛 DICT_TYPE_NOT_EXISTS', async () => {
    const { service } = makeService()
    await expect(
      service.createData({ dictType: 'ghost', label: '启用', dictValue: 'true' }),
    ).rejects.toMatchObject({ code: SystemErrorCode.DICT_TYPE_NOT_EXISTS.code })
  })

  it('创建数据时同类型取值已存在应抛 DICT_DATA_VALUE_DUPLICATE', async () => {
    const { service } = makeService({
      types: [STATUS_TYPE],
      datas: [{ dictType: 'common_status', label: '启用', dictValue: 'true' }],
    })
    await expect(
      service.createData({ dictType: 'common_status', label: '可用', dictValue: 'true' }),
    ).rejects.toMatchObject({ code: SystemErrorCode.DICT_DATA_VALUE_DUPLICATE.code })
  })

  it('更新数据时取值唯一校验应排除自身', async () => {
    const { service } = makeService({
      types: [STATUS_TYPE],
      datas: [{ id: 'd1', dictType: 'common_status', label: '启用', dictValue: 'true' }],
    })
    // 与自身取值相同（label 变更场景）不应误判重复
    await expect(
      service.updateData({ id: 'd1', label: '已启用', dictValue: 'true' }),
    ).resolves.toBeUndefined()
  })

  it('其他类型下同取值不构成冲突（唯一性限定在同类型内）', async () => {
    const { service } = makeService({
      types: [STATUS_TYPE, { id: 't2', name: '性别', type: 'gender', status: true }],
      datas: [{ dictType: 'gender', label: '男', dictValue: 'true' }],
    })
    await expect(
      service.createData({ dictType: 'common_status', label: '启用', dictValue: 'true' }),
    ).resolves.toEqual(expect.any(String))
  })
})

describe('DictService 折叠出口', () => {
  it('listAllSimple 应只折叠启用类型与启用数据', async () => {
    const { service } = makeService({
      types: [
        STATUS_TYPE,
        { id: 't2', name: '停用类型', type: 'disabled_type', status: false },
      ],
      datas: [
        { dictType: 'common_status', label: '启用', dictValue: 'true', colorType: 'success', status: true, sort: 1 },
        { dictType: 'common_status', label: '停用数据', dictValue: 'off', status: false, sort: 2 },
        // 挂在停用类型上的数据应被读取侧兜底丢弃
        { dictType: 'disabled_type', label: '孤立', dictValue: 'orphan' },
      ],
    })
    const result = await service.listAllSimple()
    expect(result).toEqual([
      {
        id: 't1',
        name: '通用状态',
        type: 'common_status',
        datas: [{ label: '启用', value: 'true', colorType: 'success' }],
      },
    ])
  })
})
