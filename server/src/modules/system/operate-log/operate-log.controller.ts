/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 操作日志控制器：只读查询 + 删除（入库走 @OperateLog 拦截器，不经接口）
 */
import { Controller, Delete, Get, Param, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { SYSTEM_PERMISSION_CODES, RequirePermissions } from '../permissions'
// 注意：作为 @Query() 元类型的 DTO 类必须值导入（import type 会在运行时擦除，ValidationPipe whitelist 将失效）
import { OperateLogPageDto } from './dto/operate-log.dto'
import type { OperateLogVo } from './dto/operate-log.dto'
import { OperateLogService } from './operate-log.service'

@ApiTags('操作日志')
@Controller('system/operate-log')
export class OperateLogController {
  constructor(private readonly operateLogService: OperateLogService) {}

  @ApiOperation({ summary: '操作日志分页列表' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.OPERATE_LOG_QUERY)
  @Get('page')
  async getPage(@Query() dto: OperateLogPageDto): Promise<PageResult<OperateLogVo>> {
    return this.operateLogService.getPage(dto)
  }

  @ApiOperation({ summary: '删除操作日志' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.OPERATE_LOG_DELETE)
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.operateLogService.remove(id)
  }
}
