/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 字典数据实体：挂靠字典类型（dict_type 逻辑外键），同类型下取值唯一由服务层校验
 */
import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/orm/base.entity'

@Entity('system_dict_data')
@Index('idx_system_dict_data_dict_type', ['dictType'])
export class DictDataEntity extends BaseEntity {
  /** 所属字典类型标识（逻辑外键指向 system_dict_type.type） */
  @Column({ type: 'varchar', length: 100 })
  dictType: string

  /** 显示排序，越小越靠前 */
  @Column({ type: 'int', default: 0 })
  sort: number

  /** 标签（展示文案） */
  @Column({ type: 'varchar', length: 100 })
  label: string

  /** 取值（同类型下唯一由服务层校验；boolean 语义的字典用 'true' / 'false'） */
  @Column({ type: 'varchar', length: 100 })
  dictValue: string

  /** 启用状态：停用后不出现在 list-all-simple 折叠出口 */
  @Column({ type: 'boolean', default: true })
  status: boolean

  /** 标签配色（对应 el-tag 的 type，如 success / danger），可空 */
  @Column({ type: 'varchar', length: 20, nullable: true })
  colorType: string | null

  /** 备注 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  remark: string | null
}
