/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 参数配置实体：config_key 全表唯一，供业务取值（如初始口令表驱动），v1 直查库不加缓存
 */
import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/orm/base.entity'

@Entity('system_config')
// 部分唯一索引：软删历史行不占位，删除参数后同键参数可重建
@Index('uk_system_config_config_key', ['configKey'], { where: 'deleted_at IS NULL' })
export class ConfigEntity extends BaseEntity {
  /** 参数分类（如 system / business，纯展示分组） */
  @Column({ type: 'varchar', length: 50 })
  category: string

  /** 参数名称（展示用） */
  @Column({ type: 'varchar', length: 100 })
  name: string

  /** 参数键，业务取值索引，未删行内唯一（如 system.user.init-password） */
  @Column({ type: 'varchar', length: 100 })
  configKey: string

  /** 参数值 */
  @Column({ type: 'varchar', length: 500 })
  configValue: string

  /** 是否明文展示：false 时前端打码（敏感参数如口令） */
  @Column({ type: 'boolean', default: true })
  visible: boolean

  /** 备注 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  remark: string | null
}
