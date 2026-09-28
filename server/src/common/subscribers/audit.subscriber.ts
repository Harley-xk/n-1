/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 审计字段订阅器——继承 BaseEntity 的实体在写入时自动填充 creator / updater（来源：请求上下文）
 */
import { type EntitySubscriberInterface, type InsertEvent, type UpdateEvent } from 'typeorm'

import { requestContext } from '../context/request-context'
import { BaseEntity } from '../orm/base.entity'

export class AuditSubscriber implements EntitySubscriberInterface<BaseEntity> {
  /** 以 BaseEntity 为监听目标，所有继承它的业务实体均触发 */
  listenTo(): typeof BaseEntity {
    return BaseEntity
  }

  beforeInsert(event: InsertEvent<BaseEntity>): void {
    if (!event.entity) {
      return
    }
    const userId = requestContext.userId ?? null
    event.entity.creator = userId
    event.entity.updater = userId
  }

  beforeUpdate(event: UpdateEvent<BaseEntity>): void {
    if (event.entity) {
      event.entity.updater = requestContext.userId ?? null
    }
  }
}
