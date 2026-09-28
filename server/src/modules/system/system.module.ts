/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 系统管理模块：装配认证 / 用户 / 角色 / 字典 / 部门 / 岗位 / 参数 / 日志域与权限注册表，导出 Guard 依赖的全局服务
 */
import { Global, Logger, Module, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import type { JwtModuleOptions } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'

/** 从 JwtModuleOptions 提取签发参数类型（避免直接依赖传递包 jsonwebtoken，pnpm 严格隔离） */
type JwtSignOptions = NonNullable<JwtModuleOptions['signOptions']>

import { AuthController } from './auth/auth.controller'
import { AuthService } from './auth/auth.service'
import { SystemConfigController } from './config/config.controller'
import { SystemConfigService } from './config/config.service'
import { DeptController } from './dept/dept.controller'
import { DeptService } from './dept/dept.service'
import { DictController } from './dict/dict.controller'
import { DictService } from './dict/dict.service'
import { ConfigEntity } from './entities/config.entity'
import { DeptEntity } from './entities/dept.entity'
import { DictDataEntity } from './entities/dict-data.entity'
import { DictTypeEntity } from './entities/dict-type.entity'
import { LoginLogEntity } from './entities/login-log.entity'
import { OperateLogEntity } from './entities/operate-log.entity'
import { PostEntity } from './entities/post.entity'
import { RolePermissionEntity } from './entities/role-permission.entity'
import { RoleEntity } from './entities/role.entity'
import { UserPostEntity } from './entities/user-post.entity'
import { UserRoleEntity } from './entities/user-role.entity'
import { UserEntity } from './entities/user.entity'
import { LoginLogController } from './login-log/login-log.controller'
import { LoginLogService } from './login-log/login-log.service'
import { OperateLogController } from './operate-log/operate-log.controller'
import { OperateLogService } from './operate-log/operate-log.service'
import { PermissionController } from './permission/permission.controller'
import { PermissionService } from './permission.service'
import { PermissionRegistry } from './permissions'
import { PostController } from './post/post.controller'
import { PostService } from './post/post.service'
import { RoleController } from './role/role.controller'
import { RoleService } from './role/role.service'
import { UserController } from './user/user.controller'
import { UserService } from './user/user.service'
import { AsyncTaskQueue } from '../../common/async/async-task-queue'
import { DEFAULT_JWT_SECRET } from '../../config/configuration'

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      RolePermissionEntity,
      DeptEntity,
      PostEntity,
      UserPostEntity,
      DictTypeEntity,
      DictDataEntity,
      ConfigEntity,
      OperateLogEntity,
      LoginLogEntity,
    ]),
    // JWT 签发与验签：global: true 使 JwtService 在任意模块可注入（JwtAuthGuard 经 APP_GUARD 在根模块解析依赖）
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        // 配置值为运行期字符串（如 '8h'），断言到 jsonwebtoken 的 ms 模板字面量类型；取值合法性由 .env.example 约束
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [
    AuthController,
    UserController,
    RoleController,
    DictController,
    DeptController,
    PostController,
    SystemConfigController,
    PermissionController,
    OperateLogController,
    LoginLogController,
  ],
  providers: [
    AuthService,
    UserService,
    RoleService,
    DictService,
    DeptService,
    PostService,
    SystemConfigService,
    PermissionService,
    PermissionRegistry,
    // 异步任务队列：日志异步入库的消费通道（@Global 导出，供认证服务与根作用域的操作日志拦截器注入）
    AsyncTaskQueue,
    OperateLogService,
    LoginLogService,
  ],
  // 导出供全局 Guard / 拦截器（APP_GUARD / APP_INTERCEPTOR 在根模块实例化）解析依赖，形态同 SignatureModule 先例
  exports: [AuthService, PermissionService, PermissionRegistry, AsyncTaskQueue, OperateLogService],
})
export class SystemModule implements OnModuleInit {
  private readonly logger = new Logger(SystemModule.name)

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    // 生产 fail-fast：JWT 密钥不得为空或沿用开发默认值（安全机制不得静默降级，同签名密钥纪律）
    const secret = this.configService.get<string>('jwt.secret') ?? ''
    if (this.configService.get<string>('env') === 'production' && secret === DEFAULT_JWT_SECRET) {
      this.logger.error('生产环境必须配置独立的 JWT_SECRET（不得使用开发默认密钥）')
      throw new Error('JWT_SECRET 未配置为生产独立密钥，服务拒绝启动')
    }
  }
}
