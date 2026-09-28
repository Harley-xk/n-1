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

// Windows 下 __dirname 为反斜杠路径，而 glob 语法中反斜杠是转义符（会吞掉路径语义导致零匹配），
// 须统一为正斜杠；ts-node 跑 src、生产跑 dist 均相对自身定位
const baseDir = __dirname.replace(/\\/g, '/')

export default new DataSource({
  type: config.database.type ?? 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  // CLI 无法感知 autoLoadEntities（NestJS 特性），实体经 glob 登记 modules 目录
  entities: [`${baseDir}/modules/**/*.entity.{ts,js}`],
  migrations: [`${baseDir}/migrations/*{.ts,.js}`],
  namingStrategy: new SnakeNamingStrategy(),
  // 注意：CLI 永远不配 synchronize —— 迁移是唯一建表通道（ADR-005）
} as DataSourceOptions)
