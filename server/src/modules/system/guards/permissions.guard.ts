/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 全局权限守卫：读 @RequirePermissions 注解，无注解仅需登录；有注解逐请求现查权限集合，任一命中放行（OR 语义）
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import { REQUEST_USER_KEY, type AuthUser } from '../../../common/decorators/current-user.decorator'
import { PermissionService } from '../permission.service'
import { REQUIRE_PERMISSIONS_METADATA } from '../permissions'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 无 @RequirePermissions = 仅需登录（JwtAuthGuard 已保证认证通过）
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS_METADATA, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0)
      return true

    const request = context.switchToHttp().getRequest<Request & Record<string, unknown>>()
    const user = request[REQUEST_USER_KEY] as AuthUser | undefined
    // 防御分支：能到达这里说明 JwtAuthGuard 已放行并挂载用户；缺失属 Guard 注册顺序错配的编程错误
    if (!user?.id)
      throw new InternalServerErrorException('权限校验前置条件缺失')

    // 逐请求现查（super_admin 全集在 PermissionService 内收敛）；角色与权限变更即时生效
    const owned = await this.permissionService.getUserPermissionCodes(user.id)
    if (required.some(code => owned.includes(code)))
      return true
    throw new ForbiddenException('没有该操作权限')
  }
}
