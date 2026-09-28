/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 部门实体：parent_id 自关联组树（null 为根），防环与删除约束在服务层校验
 */
import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/orm/base.entity'

@Entity('system_dept')
@Index('idx_system_dept_parent_id', ['parentId'])
export class DeptEntity extends BaseEntity {
  /** 部门名称 */
  @Column({ type: 'varchar', length: 50 })
  name: string

  /** 上级部门 id（逻辑外键），null 表示根部门 */
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null

  /** 显示排序，越小越靠前 */
  @Column({ type: 'int', default: 0 })
  sort: number

  /** 联系电话 */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null

  /** 联系邮箱 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  email: string | null

  /** 启用状态：true 启用 / false 停用 */
  @Column({ type: 'boolean', default: true })
  status: boolean
}
