import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { Body, Controller, Get, INestApplication, Post, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getDataSourceToken } from '@nestjs/typeorm'
import { IsNotEmpty, IsString } from 'class-validator'
import type { Server } from 'node:http'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { dataSourceStub } from './support/data-source-stub'
import { businessError } from '../src/common/exceptions/business-error'
import type { ApiResponse } from '../src/common/interfaces/api-response.interface'

/** 校验用 DTO：触发 ValidationPipe 失败路径 */
class DemoDto {
  @IsString()
  @IsNotEmpty()
  name!: string
}

/** 临时演示控制器：仅在测试内注册，验证异常真链路（业务代码零污染） */
@Controller('exception-demo')
class ExceptionDemoController {
  @Get('business')
  throwBusinessError(): never {
    throw businessError('演示业务错误：未找到该货币的汇率信息')
  }

  @Post('validate')
  create(@Body() dto: DemoDto) {
    return { ok: true, received: dto.name }
  }
}

describe('ExceptionFilter (e2e)', () => {
  let app: INestApplication
  let server: Server

  beforeAll(async () => {
    // 显式关闭签名校验：本套件聚焦异常过滤器链路（POST 用例不携带签名头），
    // 也避免本地 .env 开启签名导致用例结果不确定（Jest 按文件分进程，不影响其他套件）
    process.env.SIGNATURE_ENABLED = 'false'

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ExceptionDemoController],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSourceStub)
      .compile()

    app = moduleFixture.createNestApplication({ rawBody: true })
    // 与 main.ts 保持一致的管道与前缀；全局过滤器/拦截器经 AppModule 注册，自动生效
    app.setGlobalPrefix('api')
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    await app.init()
    server = app.getHttpServer() as Server
  })

  afterAll(async () => {
    await app.close()
  })

  it('BusinessError 应转为 HTTP 400 与统一错误结构（code < 0）', () => {
    return request(server)
      .get('/api/exception-demo/business')
      .expect(400)
      .expect((res) => {
        const body = res.body as ApiResponse
        expect(body.code).toBeLessThan(0)
        expect(body.message).toBe('演示业务错误：未找到该货币的汇率信息')
      })
  })

  it('DTO 校验失败应转为 HTTP 400，code 为状态码，message 为校验消息', () => {
    return request(server)
      .post('/api/exception-demo/validate')
      .send({ name: 123 })
      .expect(400)
      .expect((res) => {
        const body = res.body as ApiResponse
        expect(body.code).toBe(400)
        expect(typeof body.message).toBe('string')
        expect(body.message?.length).toBeGreaterThan(0)
      })
  })

  it('DTO 校验通过时应返回统一包装结构（POST 201 已归一为 200）', () => {
    return request(server)
      .post('/api/exception-demo/validate')
      .send({ name: 'CNY' })
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<{ ok: boolean }>
        expect(body.code).toBe(0)
        expect(body.data?.ok).toBe(true)
      })
  })
})
