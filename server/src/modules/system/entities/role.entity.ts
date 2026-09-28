/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 系统角色实体：权限分配的载体，code 全表唯一（super_admin 为内置保留字）
 */
import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/orm/base.entity'

@Entity('system_roles')
// 部分唯一索引：软删历史行不占位，删除角色后同标识角色可重建
@Index('uk_system_roles_code', ['code'], { where: 'deleted_at IS NULL' })
export class RoleEntity extends BaseEntity {
  /** 角色名称（展示用） */
  @Column({ type: 'varchar', length: 50 })
  name: string

  /** 角色标识，全表唯一；super_admin 为内置保留字（权限全集语义见权限设计 §4.2） */
  @Column({ type: 'varchar', length: 50 })
  code: string

  /** 显示排序，越小越靠前 */
  @Column({ type: 'int', default: 0 })
  sort: number

  /** 启用状态：false 时该角色权限即时从用户权限集合中消失（查询侧仅计入启用角色） */
  @Column({ type: 'boolean', default: true })
  status: boolean

  /** 备注 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  remark: string | null
}
