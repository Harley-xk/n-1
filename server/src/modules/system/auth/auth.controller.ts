/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 认证控制器：登录（免登录 + 豁免签名）、登出、权限信息下发
 */
import { Body, Controller, Get, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import type { PermissionInfoVo } from './dto/permission-info.dto'
import { CurrentUser, type AuthUser } from '../../../common/decorators/current-user.decorator'
import { Public } from '../../../common/decorators/public.decorator'
import { SkipSignature } from '../../../common/signature/decorators/skip-signature.decorator'

@ApiTags('认证')
@Controller('system/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipSignature()
  @ApiOperation({ summary: '登录' })
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{ token: string }> {
    return this.authService.login(dto.username, dto.password)
  }

  @ApiOperation({ summary: '登出' })
  @Post('logout')
  async logout(): Promise<void> {
    // 无状态 JWT：登出由前端清令牌承担；接口保留供批次五登录日志埋点
    return this.authService.logout()
  }

  @ApiOperation({ summary: '获取权限信息' })
  @Get('get-permission-info')
  async getPermissionInfo(@CurrentUser() user: AuthUser): Promise<PermissionInfoVo> {
    return this.authService.getPermissionInfo(user.id)
  }
}
