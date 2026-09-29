/*
 * 作者: Harley-xk
 * 创建: 2026-09-29
 *
 * 描述: 示例商品实体：name 未删行内唯一，category 存字典 demo_product_category 的取值（单表样板）
 */
import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/orm/base.entity'

@Entity('demo_product')
// 部分唯一索引：软删历史行不占位，删除商品后同名商品可重建
@Index('uk_demo_product_name', ['name'], { where: 'deleted_at IS NULL' })
export class DemoProductEntity extends BaseEntity {
  /** 商品名称，未删行内唯一 */
  @Column({ type: 'varchar', length: 100 })
  name: string

  /** 分类：存字典 demo_product_category 的 dictValue（英文语义串） */
  @Column({ type: 'varchar', length: 100 })
  category: string

  /** 金额（numeric 列 PG 驱动读出为 string，toVo 统一转数值出口） */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number

  /** 状态：true 上架 / false 下架（前端复用 common_status 字典） */
  @Column({ type: 'boolean', default: true })
  status: boolean

  /** 描述 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null
}
