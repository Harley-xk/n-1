/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 登录日志控制器：只读查询 + 删除（「在线用户」最近活跃视角的入口，ADR-003）
 */
import { Controller, Delete, Get, Param, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { SYSTEM_PERMISSION_CODES, RequirePermissions } from '../permissions'
// 注意：作为 @Query() 元类型的 DTO 类必须值导入（import type 会在运行时擦除，ValidationPipe whitelist 将失效）
import { LoginLogPageDto } from './dto/login-log.dto'
import type { LoginLogVo } from './dto/login-log.dto'
import { LoginLogService } from './login-log.service'

@ApiTags('登录日志')
@Controller('system/login-log')
export class LoginLogController {
  constructor(private readonly loginLogService: LoginLogService) {}

  @ApiOperation({ summary: '登录日志分页列表（最近活跃倒序）' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.LOGIN_LOG_QUERY)
  @Get('page')
  async getPage(@Query() dto: LoginLogPageDto): Promise<PageResult<LoginLogVo>> {
    return this.loginLogService.getPage(dto)
  }

  @ApiOperation({ summary: '删除登录日志' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.LOGIN_LOG_DELETE)
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.loginLogService.remove(id)
  }
}
