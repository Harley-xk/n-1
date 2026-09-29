import { describe, expect, it } from '@jest/globals'

import type { DemoProductEntity } from '../entities/product.entity'
import { DemoErrorCode } from '../error-codes'
import { DemoProductService } from './product.service'

type ProductRow = Partial<DemoProductEntity> & { id: string }

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

function makeService(options: { products?: ProductRow[] } = {}) {
  const products: ProductRow[] = (options.products ?? []).map(row => ({ ...row }))
  const productRepository = {
    findOne: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(products.find(product => matches(product, where)) ?? null),
    find: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(products.filter(product => matches(product, where))),
    findAndCount: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve([products.filter(product => matches(product, where)), products.length] as [
        ProductRow[],
        number,
      ]),
    save: (entity: DemoProductEntity) => Promise.resolve(entity),
    create: (data: Partial<DemoProductEntity>) => Object.assign({ status: true }, data),
    softRemove: (entity: DemoProductEntity) => Promise.resolve(entity),
  }
  const service = new DemoProductService(productRepository as never)
  return { service }
}

const EARPHONES: ProductRow = { id: 'g1', name: '无线蓝牙耳机', category: 'digital', price: 299, status: true }

describe('DemoProductService', () => {
  it('创建商品时名称已存在应抛 PRODUCT_NAME_DUPLICATE', async () => {
    const { service } = makeService({ products: [EARPHONES] })
    await expect(
      service.create({ name: '无线蓝牙耳机', category: 'digital', price: 199 }),
    ).rejects.toMatchObject({ code: DemoErrorCode.PRODUCT_NAME_DUPLICATE.code })
  })

  it('更新自身保留原名称不应误判重复', async () => {
    const { service } = makeService({ products: [EARPHONES] })
    await expect(
      service.update({ id: 'g1', name: '无线蓝牙耳机', category: 'digital', price: 399 }),
    ).resolves.toBeUndefined()
  })

  it('商品不存在应抛 PRODUCT_NOT_EXISTS', async () => {
    const { service } = makeService()
    await expect(service.get('ghost')).rejects.toMatchObject({
      code: DemoErrorCode.PRODUCT_NOT_EXISTS.code,
    })
  })

  it('上架列表应过滤下架商品（下拉数据源契约）', async () => {
    const { service } = makeService({
      products: [EARPHONES, { id: 'g2', name: '旧款有线耳机', category: 'digital', price: 59, status: false }],
    })
    const list = await service.listEnabled()
    expect(list).toHaveLength(1)
    expect(list[0]?.name).toBe('无线蓝牙耳机')
  })

  it('出参金额应为数值出口（numeric 列读出为 string 的转换契约）', async () => {
    // PG 驱动对 numeric 列返回字符串，toVo 须统一 Number() 转换
    const { service } = makeService({
      products: [{ ...EARPHONES, price: '299.00' as unknown as number }],
    })
    const vo = await service.get('g1')
    expect(vo.price).toBe(299)
    expect(typeof vo.price).toBe('number')
  })
})
