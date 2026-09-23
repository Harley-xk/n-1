import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getDataSourceToken } from '@nestjs/typeorm'
import type { Server } from 'node:http'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { dataSourceStub } from './support/data-source-stub'
import type { ApiResponse } from '../src/common/interfaces/api-response.interface'

describe('App (e2e)', () => {
  let app: INestApplication
  let server: Server

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSourceStub)
      .compile()

    app = moduleFixture.createNestApplication({ rawBody: true })
    // 与 main.ts 保持一致的管道与前缀，保证测试环境贴近真实运行；
    // 全局异常过滤器与响应包装拦截器经 AppModule 的 APP_FILTER/APP_INTERCEPTOR 注册，自动生效
    app.setGlobalPrefix('api')
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    await app.init()
    // getHttpServer() 返回 any，显式断言为 http.Server 以通过类型安全检查
    server = app.getHttpServer() as Server
  })

  afterAll(async () => {
    await app.close()
  })

  it('/api (GET) 应返回欢迎信息（统一包装结构）', () => {
    return request(server)
      .get('/api')
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<{ name: string }>
        expect(body.code).toBe(0)
        expect(body.data?.name).toBe('n-1 API')
      })
  })

  it('/api/health (GET) 应返回健康状态，时间字段为毫秒 Unix 时间戳', () => {
    return request(server)
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<{ status: string, timestamp: number }>
        expect(body.code).toBe(0)
        expect(body.data?.status).toBe('ok')
        expect(typeof body.data?.timestamp).toBe('number')
      })
  })

  it('不存在的路由应返回 404 与统一错误结构', () => {
    return request(server)
      .get('/api/not-exist')
      .expect(404)
      .expect((res) => {
        const body = res.body as ApiResponse
        expect(body.code).toBe(404)
        expect(typeof body.message).toBe('string')
        expect(body.message?.length).toBeGreaterThan(0)
      })
  })
})
