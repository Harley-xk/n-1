/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 用户控制器：用户 CRUD 与角色分配接口（管理页面批次五交付，接口先行全量落地）
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { OperateLog } from '../../../common/decorators/operate-log.decorator'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { SYSTEM_PERMISSION_CODES } from '../permissions'
import { RequirePermissions } from '../permissions'
// 注意：作为 @Query()/@Body() 元类型的 DTO 类必须值导入（import type 会在运行时擦除，
// design:paramtypes 退化为 Object，ValidationPipe 的 whitelist 将拒绝全部字段）
import {
  UserAssignRoleDto,
  UserCreateDto,
  UserPageDto,
  UserResetPasswordDto,
  UserUpdateDto,
} from './dto/user.dto'
import type { UserVo } from './dto/user.dto'
import { UserService } from './user.service'

@ApiTags('系统用户')
@Controller('system/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: '用户分页列表' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.USER_QUERY)
  @Get('page')
  async getPage(@Query() dto: UserPageDto): Promise<PageResult<UserVo>> {
    return this.userService.getPage(dto)
  }

  @ApiOperation({ summary: '创建用户' })
  @OperateLog('用户管理', '创建用户')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.USER_CREATE)
  @Post('create')
  async create(@Body() dto: UserCreateDto): Promise<string> {
    return this.userService.create(dto)
  }

  @ApiOperation({ summary: '更新用户' })
  @OperateLog('用户管理', '更新用户')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.USER_UPDATE)
  @Put('update')
  async update(@Body() dto: UserUpdateDto): Promise<void> {
    await this.userService.update(dto)
  }

  @ApiOperation({ summary: '删除用户' })
  @OperateLog('用户管理', '删除用户')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.USER_DELETE)
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.userService.remove(id)
  }

  @ApiOperation({ summary: '重置密码（恢复默认初始口令）' })
  @OperateLog('用户管理', '重置密码')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.USER_RESET_PASSWORD)
  @Put('reset-password')
  async resetPassword(@Body() dto: UserResetPasswordDto): Promise<void> {
    await this.userService.resetPassword(dto.id)
  }

  @ApiOperation({ summary: '分配角色（差集增量绑定）' })
  @OperateLog('用户管理', '分配角色')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.USER_UPDATE)
  @Put('assign-role')
  async assignRoles(@Body() dto: UserAssignRoleDto): Promise<void> {
    await this.userService.assignRoles(dto)
  }
}
