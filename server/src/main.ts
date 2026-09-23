/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 应用入口：装配全局路由前缀、校验管道、跨域与 Swagger 文档，并启动 HTTP 服务
 */

import 'reflect-metadata'

import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './app.module'

async function bootstrap() {
  // rawBody: true 缓存原始请求体字节（req.rawBody），是签名校验「签的 = 发的」的前提（见 docs/指南/请求签名验证设计.md）
  const app = await NestFactory.create(AppModule, { rawBody: true })
  const configService = app.get(ConfigService)

  // 全局路由前缀：所有接口统一挂在 /api 下
  app.setGlobalPrefix('api')

  // 全局校验管道：启用 DTO 类型转换与白名单校验
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )

  // 允许跨域（开发阶段前端 5173 端口访问后端 3000 端口）
  app.enableCors()

  // Swagger 接口文档，通过 SWAGGER_ENABLED 环境变量控制开关
  if (configService.get<boolean>('swaggerEnabled')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('n-1 API')
      .setDescription(
        'n-1 企业级框架底座（vibe coding first）—— 接口文档。'
        + '所有接口响应统一包装为 { code, message, data } 结构，时间字段为毫秒 Unix 时间戳'
        + '（Swagger 展示的是解包前的 data 字段类型，见 docs/指南/统一响应与异常处理设计.md）',
      )
      .setVersion('0.1.0')
      .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api-docs', app, document)
  }

  const port = configService.get<number>('port') ?? 3000
  await app.listen(port)

  const logger = new Logger('Bootstrap')
  logger.log(`服务器已启动：http://localhost:${port}/api`)
  if (configService.get<boolean>('swaggerEnabled')) {
    logger.log(`Swagger 文档地址：http://localhost:${port}/api-docs`)
  }
}
void bootstrap()
