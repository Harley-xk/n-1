/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 字典类型实体：type 为业务引用键（全表唯一），数据行经 dict_type 逻辑外键挂靠
 */
import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/orm/base.entity'

@Entity('system_dict_type')
// 部分唯一索引：软删历史行不占位，删除类型后同标识类型可重建
@Index('uk_system_dict_type_type', ['type'], { where: 'deleted_at IS NULL' })
export class DictTypeEntity extends BaseEntity {
  /** 字典名称（展示用） */
  @Column({ type: 'varchar', length: 50 })
  name: string

  /** 字典类型标识，业务引用键，未删行内唯一（如 common_status） */
  @Column({ type: 'varchar', length: 100 })
  type: string

  /** 启用状态：停用后不出现在 list-all-simple 折叠出口 */
  @Column({ type: 'boolean', default: true })
  status: boolean

  /** 备注 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  remark: string | null
}
