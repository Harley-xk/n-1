/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 登录日志实体：流水只增不改，不继承 BaseEntity（无审计无软删，物理删除）；「在线用户」最近活跃视角的数据源（ADR-003）
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('system_login_log')
@Index('idx_system_login_log_username', ['username'])
@Index('idx_system_login_log_login_time', ['loginTime'])
export class LoginLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** 日志类型：10 登录 / 20 登出（常量见 system.constants.ts） */
  @Column({ type: 'smallint' })
  logType: number

  /** 用户 id（逻辑外键；登录失败时无法确定用户，为 null） */
  @Column({ type: 'uuid', nullable: true })
  userId: string | null

  /** 登录账号（失败时记尝试的账号名） */
  @Column({ type: 'varchar', length: 30 })
  username: string

  /** 客户端 IP */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ip: string | null

  /** 浏览器 User-Agent */
  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null

  /** 结果码：成功 0 / 业务码 */
  @Column({ type: 'int' })
  resultCode: number

  /** 结果消息 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  resultMsg: string | null

  /** 事件时间（登录 / 登出发生时刻） */
  @Column({ type: 'timestamptz' })
  loginTime: Date

  /** 落库时间（异步入库，晚于 loginTime） */
  @CreateDateColumn({ type: 'timestamptz' })
  createTime: Date
}
