/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 字典控制器：类型与数据两层 CRUD 接口与折叠出口（一页管两层，权限点不拆 type / data）
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { OperateLog } from '../../../common/decorators/operate-log.decorator'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { RequirePermissions, SYSTEM_PERMISSION_CODES } from '../permissions'
// 注意：作为 @Query()/@Body() 元类型的 DTO 类必须值导入（import type 会在运行时擦除，
// design:paramtypes 退化为 Object，ValidationPipe 的 whitelist 将拒绝全部字段）
import { DictService } from './dict.service'
import {
  DictDataCreateDto,
  DictDataPageDto,
  DictDataUpdateDto,
  DictTypeCreateDto,
  DictTypePageDto,
  DictTypeUpdateDto,
} from './dto/dict.dto'
import type { DictDataVo, DictTypeSimpleVo, DictTypeVo } from './dto/dict.dto'

@ApiTags('系统字典')
@Controller('system/dict')
export class DictController {
  constructor(private readonly dictService: DictService) {}

  // ===== 字典类型 =====

  @ApiOperation({ summary: '字典类型分页列表' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DICT_QUERY)
  @Get('type/page')
  async getTypePage(@Query() dto: DictTypePageDto): Promise<PageResult<DictTypeVo>> {
    return this.dictService.getTypePage(dto)
  }

  @ApiOperation({ summary: '创建字典类型' })
  @OperateLog('字典管理', '新增字典类型')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DICT_CREATE)
  @Post('type/create')
  async createType(@Body() dto: DictTypeCreateDto): Promise<string> {
    return this.dictService.createType(dto)
  }

  @ApiOperation({ summary: '更新字典类型（标识变更级联改数据归属）' })
  @OperateLog('字典管理', '修改字典类型')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DICT_UPDATE)
  @Put('type/update')
  async updateType(@Body() dto: DictTypeUpdateDto): Promise<void> {
    await this.dictService.updateType(dto)
  }

  @ApiOperation({ summary: '删除字典类型（连带物理删除类型下全部数据）' })
  @OperateLog('字典管理', '删除字典类型')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DICT_DELETE)
  @Delete('type/delete/:id')
  async removeType(@Param('id') id: string): Promise<void> {
    await this.dictService.removeType(id)
  }

  // ===== 字典数据 =====

  @ApiOperation({ summary: '字典数据分页列表（固定类型上下文）' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DICT_QUERY)
  @Get('data/page')
  async getDataPage(@Query() dto: DictDataPageDto): Promise<PageResult<DictDataVo>> {
    return this.dictService.getDataPage(dto)
  }

  @ApiOperation({ summary: '创建字典数据' })
  @OperateLog('字典管理', '新增字典数据')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DICT_CREATE)
  @Post('data/create')
  async createData(@Body() dto: DictDataCreateDto): Promise<string> {
    return this.dictService.createData(dto)
  }

  @ApiOperation({ summary: '更新字典数据' })
  @OperateLog('字典管理', '修改字典数据')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DICT_UPDATE)
  @Put('data/update')
  async updateData(@Body() dto: DictDataUpdateDto): Promise<void> {
    await this.dictService.updateData(dto)
  }

  @ApiOperation({ summary: '删除字典数据' })
  @OperateLog('字典管理', '删除字典数据')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DICT_DELETE)
  @Delete('data/delete/:id')
  async removeData(@Param('id') id: string): Promise<void> {
    await this.dictService.removeData(id)
  }

  // ===== 折叠出口 =====

  @ApiOperation({ summary: '启用字典折叠清单（前端 dict store 唯一数据源）' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.DICT_QUERY)
  @Get('list-all-simple')
  async listAllSimple(): Promise<DictTypeSimpleVo[]> {
    return this.dictService.listAllSimple()
  }
}
