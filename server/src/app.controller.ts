/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 根控制器：提供欢迎信息与健康检查接口，用于验证服务与前后端链路连通性
 */

import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { AppService } from './app.service'

@ApiTags('应用')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: '欢迎信息' })
  @Get()
  getHello() {
    return this.appService.getHello()
  }

  @ApiOperation({ summary: '健康检查' })
  @Get('health')
  getHealth() {
    return this.appService.getHealth()
  }
}
