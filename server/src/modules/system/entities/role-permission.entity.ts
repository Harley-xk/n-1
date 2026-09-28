/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 角色-权限关联实体：权限串必须已在代码注册表登记（写入侧校验），物理删除（同 user-role 理由）
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('system_role_permission')
@Index('uk_system_role_permission', ['roleId', 'permission'])
export class RolePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** 角色 id（逻辑外键，不加物理约束） */
  @Column({ type: 'uuid' })
  roleId: string

  /** 权限串（如 system:user:query），字面量唯一出处为代码注册表 */
  @Column({ type: 'varchar', length: 100 })
  permission: string

  /** 分配时间 */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
