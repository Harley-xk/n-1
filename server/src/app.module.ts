/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 应用根模块：装配全局配置模块与 TypeORM 数据库连接，并注册根控制器/服务
 */

import { Logger, Module, NestModule, RequestMethod } from '@nestjs/common'
import type { MiddlewareConsumer } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import type { DataSourceOptions } from 'typeorm'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { AccessLogMiddleware } from './common/middleware/access-log.middleware'
import { RequestContextMiddleware } from './common/middleware/request-context.middleware'
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware'
import { SnakeNamingStrategy } from './common/orm/snake-naming.strategy'
import { SignatureGuard } from './common/signature/signature.guard'
import { SignatureModule } from './common/signature/signature.module'
import { AuditSubscriber } from './common/subscribers/audit.subscriber'
import configuration from './config/configuration'

@Module({
  imports: [
    // 全局配置模块：加载 .env 与 config/configuration.ts，全应用可直接注入 ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
    }),
    // 数据库连接：默认与首选 PostgreSQL（仅承诺主流数据库，切换见 docs/架构设计.md），配置统一来自 ConfigService
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // 生产环境强制关闭 DB_SYNC（表结构变更只允许 migration:run，见 ADR-005），显式误配时告警不静默
        const isProduction = configService.get<string>('env') === 'production'
        const synchronizeRequested = configService.get<boolean>('database.synchronize')
        if (isProduction && synchronizeRequested) {
          new Logger('AppModule').warn(
            '生产环境已强制关闭 DB_SYNC（synchronize），表结构变更请使用 pnpm --filter server migration:run',
          )
        }
        // TypeORM 连接选项是按数据库类型区分的联合类型，而 DB_TYPE 运行时可切换，
        // 故统一断言为 DataSourceOptions，取值合法性由 .env.example 与架构文档约束
        return {
          // 数据库类型默认 postgres，可经 .env 的 DB_TYPE 切换（见 .env.example 与 docs/架构设计.md）
          type: configService.get<DataSourceOptions['type']>('database.type') ?? 'postgres',
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.database'),
          // 实体在业务模块中通过 forFeature([...]) 注册后自动加载
          autoLoadEntities: true,
          // 仅开发便利（快速迭代实体）；生产强制关闭（上方告警分支）
          synchronize: !isProduction && (synchronizeRequested ?? false),
          // 表 / 列名统一蛇形小写，须与迁移 CLI 的 data-source.ts 保持一致（否则生成迁移与运行时列名漂移）
          namingStrategy: new SnakeNamingStrategy(),
          // 审计字段订阅器：creator / updater 自动填充（操作人来源为请求上下文，见批次二设计文档 §3.3）
          subscribers: [AuditSubscriber],
        } as DataSourceOptions
      },
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      // 请求上下文最先执行：开启请求级 AsyncLocalStorage 域，后续处理链路（含审计填充）可读取当前操作人
      .apply(RequestContextMiddleware)
      .forRoutes({ path: '{*splat}', method: RequestMethod.ALL })
      // 安全响应头次之：对后续一切响应（含文档页、404）生效
      .apply(SecurityHeadersMiddleware)
      .forRoutes({ path: '{*splat}', method: RequestMethod.ALL })
      // 访问日志最后：覆盖业务接口的完整处理耗时（路径过滤由中间件内部判断）
      .apply(AccessLogMiddleware)
      .forRoutes({ path: '{*splat}', method: RequestMethod.ALL })
  }
}
