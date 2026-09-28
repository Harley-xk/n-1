/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 部门控制器：平铺列表与 CRUD 接口（写接口埋操作日志）
 */
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { OperateLog } from '../../../common/decorators/operate-log.decorator'
import { RequirePermissions, SYSTEM_PERMISSION_CODES } from '../permissions'
// 注意：作为 @Body() 元类型的 DTO 类必须值导入（import type 会在运行时擦除，
// design:paramtypes 退化为 Object，ValidationPipe 的 whitelist 将拒绝全部字段）
import { DeptService } from './dept.service'
import { DeptCreateDto, DeptUpdateDto } from './dto/dept.dto'
import type { DeptVo } from './dto/dept.dto'

@ApiTags('系统部门')
@Controller('system/dept')
export class DeptController {
  constructor(private readonly deptService: DeptService) {}

  @ApiOperation({ summary: '部门平铺全量列表（前端组树）' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DEPT_QUERY)
  @Get('list')
  async list(): Promise<DeptVo[]> {
    return this.deptService.list()
  }

  @ApiOperation({ summary: '创建部门' })
  @OperateLog('部门管理', '新增部门')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DEPT_CREATE)
  @Post('create')
  async create(@Body() dto: DeptCreateDto): Promise<string> {
    return this.deptService.create(dto)
  }

  @ApiOperation({ summary: '更新部门（防环校验）' })
  @OperateLog('部门管理', '修改部门')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DEPT_UPDATE)
  @Put('update')
  async update(@Body() dto: DeptUpdateDto): Promise<void> {
    await this.deptService.update(dto)
  }

  @ApiOperation({ summary: '删除部门（有子部门 / 挂用户禁删）' })
  @OperateLog('部门管理', '删除部门')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DEPT_DELETE)
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.deptService.remove(id)
  }
}
