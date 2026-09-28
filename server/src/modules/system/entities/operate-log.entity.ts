/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 操作日志实体：流水只增不改，不继承 BaseEntity（无审计无软删，物理删除；异步入库不触发审计填充）
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('system_operate_log')
@Index('idx_system_operate_log_user_id', ['userId'])
@Index('idx_system_operate_log_create_time', ['createTime'])
export class OperateLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** 操作人用户 id（逻辑外键；理论上注解接口均需登录，防御性可空） */
  @Column({ type: 'uuid', nullable: true })
  userId: string | null

  /** 操作人登录账号 */
  @Column({ type: 'varchar', length: 30, nullable: true })
  userName: string | null

  /** 操作模块（如「用户管理」） */
  @Column({ type: 'varchar', length: 50 })
  module: string

  /** 操作名（如「创建用户」） */
  @Column({ type: 'varchar', length: 50 })
  name: string

  /** 请求方法（GET / POST / PUT / DELETE） */
  @Column({ type: 'varchar', length: 10 })
  requestMethod: string

  /** 请求路径 */
  @Column({ type: 'varchar', length: 255 })
  requestUrl: string

  /** 请求参数（body + query + params 序列化，password 键掩敏，截断 2000 对齐列宽） */
  @Column({ type: 'varchar', length: 2000, nullable: true })
  requestParams: string | null

  /** 客户端 IP（X-Forwarded-For 逐跳解析） */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ip: string | null

  /** 浏览器 User-Agent */
  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null

  /** 操作开始时间 */
  @Column({ type: 'timestamptz' })
  startTime: Date

  /** 耗时（毫秒） */
  @Column({ type: 'int' })
  durationMs: number

  /** 结果码：成功 0 / 业务码 / HTTP 语义码（通用段数值） */
  @Column({ type: 'int' })
  resultCode: number

  /** 结果消息（截断 500 对齐列宽） */
  @Column({ type: 'varchar', length: 500, nullable: true })
  resultMsg: string | null

  /** 落库时间（异步入库，晚于 startTime） */
  @CreateDateColumn({ type: 'timestamptz' })
  createTime: Date
}
