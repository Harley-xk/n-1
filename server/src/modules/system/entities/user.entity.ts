/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 系统用户实体：登录账号 + BCrypt 口令散列 + 启用状态（数据模型见 docs/指南/权限设计.md）
 */
import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/orm/base.entity'

@Entity('system_users')
// 部分唯一索引：软删历史行不占位，删除用户后同名账号可重建
@Index('uk_system_users_username', ['username'], { where: 'deleted_at IS NULL' })
@Index('idx_system_users_dept_id', ['deptId'])
export class UserEntity extends BaseEntity {
  /** 登录账号，未删行内唯一 */
  @Column({ type: 'varchar', length: 30 })
  username: string

  /** BCrypt 散列（cost 10），任何日志与响应不得回传 */
  @Column({ type: 'varchar', length: 100 })
  password: string

  /** 用户昵称（展示名） */
  @Column({ type: 'varchar', length: 30 })
  nickname: string

  /** 所属部门 id（逻辑外键，可空 = 未挂部门） */
  @Column({ type: 'uuid', nullable: true })
  deptId: string | null

  /** 启用状态：true 启用 / false 停用（停用后登录被拒、已发 token 在 Guard 存在性校验处即时失效） */
  @Column({ type: 'boolean', default: true })
  status: boolean
}
