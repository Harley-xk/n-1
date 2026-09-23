/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 环境配置工厂：统一从环境变量读取配置项，未设置时使用默认值，供 ConfigModule 加载
 */

import type { DataSourceOptions } from 'typeorm'

export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  signature: {
    // 写方法签名校验开关：默认关闭（存量环境零影响），.env.example 模板值为 true 引导新项目启用
    enabled: process.env.SIGNATURE_ENABLED === 'true',
    // HMAC 密钥：enabled 且为空时 SignatureModule 启动 fail-fast（安全机制不得静默失效）
    secret: process.env.SIGNATURE_SECRET ?? '',
    // 签名有效时间窗（毫秒），默认 5 分钟；同时决定 nonce 防重放窗口（2 倍时间窗）
    expireMs: parseInt(process.env.SIGNATURE_EXPIRE_MS ?? String(5 * 60 * 1000), 10),
  },
  database: {
    // 数据库类型：默认 postgres（首选），经 DB_TYPE 按项目需要切换（TypeORM 支持主流与国产化数据库）
    type: (process.env.DB_TYPE ?? 'postgres') as DataSourceOptions['type'],
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'n_1',
    synchronize: process.env.DB_SYNC === 'true',
  },
})
