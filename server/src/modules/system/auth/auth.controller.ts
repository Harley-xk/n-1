/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 认证控制器：登录（免登录 + 豁免签名）、登出、权限信息下发（登录 / 登出埋登录日志，批次五）
 */
import { Body, Controller, Get, Post, Req } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'

import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import type { PermissionInfoVo } from './dto/permission-info.dto'
import { CurrentUser, type AuthUser } from '../../../common/decorators/current-user.decorator'
import { Public } from '../../../common/decorators/public.decorator'
import { SkipSignature } from '../../../common/signature/decorators/skip-signature.decorator'
import { getClientInfo } from '../../../common/utils/client-info'

@ApiTags('认证')
@Controller('system/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipSignature()
  @ApiOperation({ summary: '登录' })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request): Promise<{ token: string }> {
    return this.authService.login(dto.username, dto.password, getClientInfo(request))
  }

  @ApiOperation({ summary: '登出' })
  @Post('logout')
  logout(@CurrentUser() user: AuthUser, @Req() request: Request): void {
    // 无状态 JWT：登出的本质由前端清令牌承担；接口侧记录登出日志（ADR-003 最近活跃视角）
    this.authService.logout(user, getClientInfo(request))
  }

  @ApiOperation({ summary: '获取权限信息' })
  @Get('get-permission-info')
  async getPermissionInfo(@CurrentUser() user: AuthUser): Promise<PermissionInfoVo> {
    return this.authService.getPermissionInfo(user.id)
  }
}
