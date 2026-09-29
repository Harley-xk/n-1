/*
 * 作者: Harley-xk
 * 创建: 2026-09-29
 *
 * 描述: 示例商品控制器：分页与 CRUD 接口（写接口埋操作日志；业务模块样板）
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { OperateLog } from '../../../common/decorators/operate-log.decorator'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { RequirePermissions } from '../../system/permissions'
import { DEMO_PERMISSION_CODES } from '../permissions'
// 注意：作为 @Query()/@Body() 元类型的 DTO 类必须值导入（import type 会在运行时擦除，
// design:paramtypes 退化为 Object，ValidationPipe 的 whitelist 将拒绝全部字段）
import { ProductCreateDto, ProductPageDto, ProductUpdateDto } from './dto/product.dto'
import type { ProductVo } from './dto/product.dto'
import { DemoProductService } from './product.service'

@ApiTags('示例商品')
@Controller('demo/product')
export class DemoProductController {
  constructor(private readonly productService: DemoProductService) {}

  @ApiOperation({ summary: '商品分页列表' })
  @RequirePermissions(DEMO_PERMISSION_CODES.PRODUCT_QUERY)
  @Get('page')
  async getPage(@Query() dto: ProductPageDto): Promise<PageResult<ProductVo>> {
    return this.productService.getPage(dto)
  }

  @ApiOperation({ summary: '商品单查' })
  @RequirePermissions(DEMO_PERMISSION_CODES.PRODUCT_QUERY)
  @Get('get')
  async get(@Query('id') id: string): Promise<ProductVo> {
    return this.productService.get(id)
  }

  @ApiOperation({ summary: '上架商品全量列表（下拉数据源示范）' })
  @RequirePermissions(DEMO_PERMISSION_CODES.PRODUCT_QUERY)
  @Get('list')
  async listEnabled(): Promise<ProductVo[]> {
    return this.productService.listEnabled()
  }

  @ApiOperation({ summary: '创建商品' })
  @OperateLog('商品管理', '新增商品')
  @RequirePermissions(DEMO_PERMISSION_CODES.PRODUCT_CREATE)
  @Post('create')
  async create(@Body() dto: ProductCreateDto): Promise<string> {
    return this.productService.create(dto)
  }

  @ApiOperation({ summary: '更新商品' })
  @OperateLog('商品管理', '修改商品')
  @RequirePermissions(DEMO_PERMISSION_CODES.PRODUCT_UPDATE)
  @Put('update')
  async update(@Body() dto: ProductUpdateDto): Promise<void> {
    await this.productService.update(dto)
  }

  @ApiOperation({ summary: '删除商品' })
  @OperateLog('商品管理', '删除商品')
  @RequirePermissions(DEMO_PERMISSION_CODES.PRODUCT_DELETE)
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.productService.remove(id)
  }
}
