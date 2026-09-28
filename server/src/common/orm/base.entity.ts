/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 审计公共实体基类，业务实体继承即获得 uuid 主键、审计字段与软删能力（ADR-004）
 */
import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm'

export abstract class BaseEntity {
  /** 主键，PostgreSQL 原生 uuid，接口契约中为 string */
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** 创建人（用户 id；系统级操作为 null），逻辑外键不加物理约束 */
  @Column({ type: 'uuid', nullable: true })
  creator: string | null

  /** 创建时间（timestamptz，理由见批次二设计文档 §3.1） */
  @CreateDateColumn({ type: 'timestamptz' })
  createTime: Date

  /** 更新人（用户 id；系统级操作为 null） */
  @Column({ type: 'uuid', nullable: true })
  updater: string | null

  /** 更新时间 */
  @UpdateDateColumn({ type: 'timestamptz' })
  updateTime: Date

  /** 软删时间戳：非空即已删除，查询自动过滤（TypeORM 原生软删） */
  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null
}
