/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 权限点控制器：注册表清单出口（角色分配弹窗数据源，杜绝前端硬编码权限串）
 */
import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { PermissionRegistry, RequirePermissions, SYSTEM_PERMISSION_CODES } from '../permissions'
import type { PermissionPoint } from '../permissions'

@ApiTags('系统权限')
@Controller('system/permission')
export class PermissionController {
  constructor(private readonly registry: PermissionRegistry) {}

  @ApiOperation({ summary: '权限点全集清单（code + 中文名）' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.ROLE_ASSIGN_PERMISSION)
  @Get('list')
  list(): PermissionPoint[] {
    return this.registry.allPoints()
  }
}
