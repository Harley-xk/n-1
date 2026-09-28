/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 角色控制器：角色 CRUD 与权限分配接口（管理页面批次五交付，接口先行全量落地）
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { OperateLog } from '../../../common/decorators/operate-log.decorator'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { RequirePermissions, SYSTEM_PERMISSION_CODES } from '../permissions'
// 注意：作为 @Query()/@Body() 元类型的 DTO 类必须值导入（import type 会在运行时擦除，
// design:paramtypes 退化为 Object，ValidationPipe 的 whitelist 将拒绝全部字段）
import { RoleAssignPermissionsDto, RoleCreateDto, RolePageDto, RoleUpdateDto } from './dto/role.dto'
import type { RoleDetailVo, RoleVo } from './dto/role.dto'
import { RoleService } from './role.service'

@ApiTags('系统角色')
@Controller('system/role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ApiOperation({ summary: '角色分页列表' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.ROLE_QUERY)
  @Get('page')
  async getPage(@Query() dto: RolePageDto): Promise<PageResult<RoleVo>> {
    return this.roleService.getPage(dto)
  }

  @ApiOperation({ summary: '启用角色全量列表（分配角色下拉数据源）' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.ROLE_QUERY)
  @Get('list')
  async listEnabled(): Promise<RoleVo[]> {
    return this.roleService.listEnabled()
  }

  @ApiOperation({ summary: '角色详情（含权限串回显）' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.ROLE_QUERY)
  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<RoleDetailVo> {
    return this.roleService.getDetail(id)
  }

  @ApiOperation({ summary: '创建角色' })
  @OperateLog('角色管理', '新增角色')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.ROLE_CREATE)
  @Post('create')
  async create(@Body() dto: RoleCreateDto): Promise<string> {
    return this.roleService.create(dto)
  }

  @ApiOperation({ summary: '更新角色' })
  @OperateLog('角色管理', '修改角色')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.ROLE_UPDATE)
  @Put('update')
  async update(@Body() dto: RoleUpdateDto): Promise<void> {
    await this.roleService.update(dto)
  }

  @ApiOperation({ summary: '删除角色' })
  @OperateLog('角色管理', '删除角色')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.ROLE_DELETE)
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.roleService.remove(id)
  }

  @ApiOperation({ summary: '查询角色已分配权限串' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.ROLE_QUERY)
  @Get(':id/permissions')
  async getPermissions(@Param('id') id: string): Promise<string[]> {
    return this.roleService.getPermissions(id)
  }

  @ApiOperation({ summary: '分配权限（差集增量绑定，逐串校验注册表登记）' })
  @OperateLog('角色管理', '分配权限')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.ROLE_ASSIGN_PERMISSION)
  @Put(':id/permissions')
  async assignPermissions(
    @Param('id') id: string,
    @Body() dto: RoleAssignPermissionsDto,
  ): Promise<void> {
    await this.roleService.assignPermissions(id, dto.permissions)
  }
}
