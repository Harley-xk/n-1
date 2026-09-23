/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 应用根模块：装配全局配置模块与 TypeORM 数据库连接，并注册根控制器/服务
 */

import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import type { DataSourceOptions } from 'typeorm'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { SignatureGuard } from './common/signature/signature.guard'
import { SignatureModule } from './common/signature/signature.module'
import configuration from './config/configuration'

@Module({
  imports: [
    // 全局配置模块：加载 .env 与 config/configuration.ts，全应用可直接注入 ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
    }),
    // 数据库连接：默认 PostgreSQL + TypeORM（支持主流与国产化数据库，切换见 docs/架构设计.md），配置统一来自 ConfigService
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        // TypeORM 连接选项是按数据库类型区分的联合类型，而 DB_TYPE 运行时可切换，
        // 故统一断言为 DataSourceOptions，取值合法性由 .env.example 与架构文档约束
        ({
          // 数据库类型默认 postgres，可经 .env 的 DB_TYPE 切换（见 .env.example 与 docs/架构设计.md）
          type: configService.get<DataSourceOptions['type']>('database.type') ?? 'postgres',
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.database'),
          // 实体在业务模块中通过 forFeature([...]) 注册后自动加载
          autoLoadEntities: true,
          // 仅开发环境允许自动同步表结构，生产环境必须关闭并使用迁移
          synchronize: configService.get<boolean>('database.synchronize'),
        }) as DataSourceOptions,
    }),
    // 签名机制：全局模块，提供方案注册表 / nonce 存储，并在启动期做密钥 fail-fast 校验
    SignatureModule,
  ],
  controllers: [AppController],
  providers: [
    // 全局异常过滤器：经 APP_FILTER 令牌注册（而非 main.ts 实例注册），
    // e2e 测试（Test.createTestingModule({ imports: [AppModule] })）自动继承，无需手动复制装配
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // 全局响应包装拦截器：统一包装为 { code, message, data } 并转换时间字段，同上注册
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // 全局签名守卫：写方法请求签名校验（开关/豁免/自定义方案见 docs/指南/请求签名验证设计.md），同上注册
    { provide: APP_GUARD, useClass: SignatureGuard },
    AppService,
  ],
})
export class AppModule {}
