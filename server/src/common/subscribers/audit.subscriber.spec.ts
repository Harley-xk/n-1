import { describe, expect, it } from '@jest/globals'
import type { InsertEvent, UpdateEvent } from 'typeorm'

import { AuditSubscriber } from './audit.subscriber'
import { requestContext } from '../context/request-context'
import { BaseEntity } from '../orm/base.entity'

describe('AuditSubscriber 审计填充', () => {
  const subscriber = new AuditSubscriber()

  it('监听目标应为 BaseEntity（所有继承它的业务实体均触发）', () => {
    expect(subscriber.listenTo()).toBe(BaseEntity)
  })

  it('插入时应同时填充 creator 与 updater 为当前操作人', () => {
    const entity = { creator: null, updater: null } as BaseEntity
    requestContext.run({ userId: 'u-1' }, () => {
      subscriber.beforeInsert({ entity } as InsertEvent<BaseEntity>)
    })
    expect(entity.creator).toBe('u-1')
    expect(entity.updater).toBe('u-1')
  })

  it('无操作人时应填充 null（系统级操作语义）', () => {
    const entity = {} as BaseEntity
    requestContext.run({}, () => {
      subscriber.beforeInsert({ entity } as InsertEvent<BaseEntity>)
    })
    expect(entity.creator).toBeNull()
    expect(entity.updater).toBeNull()
  })

  it('更新时应填充 updater 为当前操作人', () => {
    const entity = { updater: null } as Partial<BaseEntity> as BaseEntity
    requestContext.run({ userId: 'u-2' }, () => {
      subscriber.beforeUpdate({ entity } as unknown as UpdateEvent<BaseEntity>)
    })
    expect(entity.updater).toBe('u-2')
  })

  it('更新事件无实体时应安全跳过（批量 update 绕过实体路径的防御分支）', () => {
    expect(() => subscriber.beforeUpdate({} as unknown as UpdateEvent<BaseEntity>)).not.toThrow()
  })

  it('插入事件无实体时应安全跳过（防御分支）', () => {
    expect(() =>
      subscriber.beforeInsert({ entity: undefined } as unknown as InsertEvent<BaseEntity>),
    ).not.toThrow()
  })
})
