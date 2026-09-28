/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 用户-岗位关联实体：纯关联值对象，物理删除（差集增量绑定，不走软删——否则唯一索引被历史行占位打穿）
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('system_user_post')
@Index('uk_system_user_post', ['userId', 'postId'])
export class UserPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** 用户 id（逻辑外键，不加物理约束） */
  @Column({ type: 'uuid' })
  userId: string

  /** 岗位 id（逻辑外键，不加物理约束） */
  @Column({ type: 'uuid' })
  postId: string

  /** 绑定时间 */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
