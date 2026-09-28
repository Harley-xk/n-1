/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 岗位控制器：分页与 CRUD 接口（写接口埋操作日志）
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { OperateLog } from '../../../common/decorators/operate-log.decorator'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { RequirePermissions, SYSTEM_PERMISSION_CODES } from '../permissions'
// 注意：作为 @Query()/@Body() 元类型的 DTO 类必须值导入（import type 会在运行时擦除，
// design:paramtypes 退化为 Object，ValidationPipe 的 whitelist 将拒绝全部字段）
import { PostCreateDto, PostPageDto, PostUpdateDto } from './dto/post.dto'
import type { PostVo } from './dto/post.dto'
import { PostService } from './post.service'

@ApiTags('系统岗位')
@Controller('system/post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @ApiOperation({ summary: '岗位分页列表' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.POST_QUERY)
  @Get('page')
  async getPage(@Query() dto: PostPageDto): Promise<PageResult<PostVo>> {
    return this.postService.getPage(dto)
  }

  @ApiOperation({ summary: '启用岗位全量列表（用户表单岗位多选数据源）' })
  @RequirePermissions(SYSTEM_PERMISSION_CODES.POST_QUERY)
  @Get('list')
  async listEnabled(): Promise<PostVo[]> {
    return this.postService.listEnabled()
  }

  @ApiOperation({ summary: '创建岗位' })
  @OperateLog('岗位管理', '新增岗位')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.POST_CREATE)
  @Post('create')
  async create(@Body() dto: PostCreateDto): Promise<string> {
    return this.postService.create(dto)
  }

  @ApiOperation({ summary: '更新岗位' })
  @OperateLog('岗位管理', '修改岗位')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.POST_UPDATE)
  @Put('update')
  async update(@Body() dto: PostUpdateDto): Promise<void> {
    await this.postService.update(dto)
  }

  @ApiOperation({ summary: '删除岗位（连带清理用户岗位关联）' })
  @OperateLog('岗位管理', '删除岗位')
  @RequirePermissions(SYSTEM_PERMISSION_CODES.POST_DELETE)
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.postService.remove(id)
  }
}
