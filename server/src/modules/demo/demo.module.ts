/*
 * 作者: Harley-xk
 * 创建: 2026-09-29
 *
 * 描述: 开发示例模块：示例商品单表 CRUD（业务模块样板，接入清单见 docs/指南/新模块接入指南.md）
 */
import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PermissionRegistry } from '../system/permissions'
import { DemoProductEntity } from './entities/product.entity'
import { DEMO_MODULE_NAME, DEMO_PERMISSIONS } from './permissions'
import { DemoProductController } from './product/product.controller'
import { DemoProductService } from './product/product.service'

@Module({
  imports: [TypeOrmModule.forFeature([DemoProductEntity])],
  controllers: [DemoProductController],
  providers: [DemoProductService],
})
export class DemoModule implements OnModuleInit {
  // SystemModule 为 @Global 且导出 PermissionRegistry，业务模块直接注入（依赖方向：业务 → 系统）
  constructor(private readonly permissionRegistry: PermissionRegistry) {}

  /** 启动期接入权限注册表：即时校验（首段不符 / 串冲突 / 模块重名均拒绝启动） */
  onModuleInit(): void {
    this.permissionRegistry.registerModule({ module: DEMO_MODULE_NAME, points: DEMO_PERMISSIONS })
  }
}
