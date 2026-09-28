/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 岗位实体：code 全表唯一，经 system_user_post 与用户多对多关联
 */
import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/orm/base.entity'

@Entity('system_post')
// 部分唯一索引：软删历史行不占位，删除岗位后同标识岗位可重建
@Index('uk_system_post_code', ['code'], { where: 'deleted_at IS NULL' })
export class PostEntity extends BaseEntity {
  /** 岗位标识，未删行内唯一 */
  @Column({ type: 'varchar', length: 50 })
  code: string

  /** 岗位名称（展示用） */
  @Column({ type: 'varchar', length: 50 })
  name: string

  /** 显示排序，越小越靠前 */
  @Column({ type: 'int', default: 0 })
  sort: number

  /** 启用状态：true 启用 / false 停用 */
  @Column({ type: 'boolean', default: true })
  status: boolean
}
