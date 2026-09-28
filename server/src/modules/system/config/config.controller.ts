/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 参数配置控制器：分页 / 按键取值 / CRUD 接口（写接口埋操作日志）
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { OperateLog } from '../../../common/decorators/operate-log.decorator'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { RequirePermissions, SYSTEM_PERMISSION_CODES } from '../permissions'
// 注意：作为 @Query()/@Body() 元类型的 DTO 类必须值导入（import type 会在运行时擦除，
// design:paramtypes 退化为 Object，ValidationPipe 的 whitelist 将拒绝全部字段）
import { SystemConfigService } from './config.service'
import { ConfigCreateDto, ConfigPageDto, ConfigUpdateDto } from './dto/config.dto'
import type { ConfigVo } from './dto/config.dto'

@ApiTags('系统参数')
@Controller('system/config')
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @ApiOperation({ summary: '参数分页列表' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.CONFIG_QUERY)
  @Get('page')
  async getPage(@Query() dto: ConfigPageDto): Promise<PageResult<ConfigVo>> {
    return this.configService.getPage(dto)
  }

  @ApiOperation({ summary: '按键取值（业务表驱动配置的读取出口）' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.CONFIG_QUERY)
  @Get('get-by-key')
  async getValueByKey(@Query('key') key: string): Promise<string | null> {
    return this.configService.getValueByKey(key)
  }

  @ApiOperation({ summary: '创建参数' })
  @OperateLog('参数管理', '新增参数')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.CONFIG_CREATE)
  @Post('create')
  async create(@Body() dto: ConfigCreateDto): Promise<string> {
    return this.configService.create(dto)
  }

  @ApiOperation({ summary: '更新参数' })
  @OperateLog('参数管理', '修改参数')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.CONFIG_UPDATE)
  @Put('update')
  async update(@Body() dto: ConfigUpdateDto): Promise<void> {
    await this.configService.update(dto)
  }

  @ApiOperation({ summary: '删除参数' })
  @OperateLog('参数管理', '删除参数')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.CONFIG_DELETE)
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.configService.remove(id)
  }
}
