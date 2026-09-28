/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 迁移 CLI 专用数据源（migration:generate / run / revert），与 app.module.ts 共用配置与命名策略
 */
import 'dotenv/config'

import { DataSource } from 'typeorm'
import type { DataSourceOptions } from 'typeorm'

import { SnakeNamingStrategy } from './common/orm/snake-naming.strategy'
import configuration from './config/configuration'

const config = configuration()

export default new DataSource({
  type: config.database.type ?? 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  // CLI 无法感知 autoLoadEntities（NestJS 特性），实体经 glob 登记 modules 目录；
  // __dirname 相对自身定位，ts-node 跑 src、生产跑 dist 均可命中
  entities: [__dirname + '/modules/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  namingStrategy: new SnakeNamingStrategy(),
  // 注意：CLI 永远不配 synchronize —— 迁移是唯一建表通道（ADR-005）
} as DataSourceOptions)
