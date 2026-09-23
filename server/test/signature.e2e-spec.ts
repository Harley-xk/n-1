import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { Body, Controller, Get, INestApplication, Post, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getDataSourceToken } from '@nestjs/typeorm'
import type { Server } from 'node:http'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { dataSourceStub } from './support/data-source-stub'
import { E2E_SIGN_SECRET, signHeaders, signedRequest } from './support/signature.helper'
import type { ApiResponse } from '../src/common/interfaces/api-response.interface'
import { SkipSignature } from '../src/common/signature/decorators/skip-signature.decorator'
import { UseSignature } from '../src/common/signature/decorators/use-signature.decorator'
import type { SignatureContext, SignatureScheme } from '../src/common/signature/interfaces/signature-scheme.interface'
import { SignatureSchemeRegistry } from '../src/common/signature/signature-scheme.registry'

// 环境变量须在 TestingModule 构建前设置（configuration 工厂在模块初始化时执行；
// Jest 按测试文件分进程运行，与其他套件的环境变量互不影响）
process.env.SIGNATURE_ENABLED = 'true'
process.env.SIGNATURE_SECRET = E2E_SIGN_SECRET
process.env.SIGNATURE_EXPIRE_MS = '300000'

/** 测试内自定义方案：记录上下文供「方案接管」断言，可切换放行/拒绝行为 */
class DemoSignatureScheme implements SignatureScheme {
  readonly name = 'demo'
  lastContext?: SignatureContext
  behavior: 'pass' | 'fail' = 'pass'

  verify(context: SignatureContext): void {
    this.lastContext = context
    if (this.behavior === 'fail')
      throw new Error('演示方案拒绝')
  }
}

/** 临时演示控制器：仅在测试内注册，验证签名真链路（业务代码零污染） */
@Controller('signature-demo')
class SignatureDemoController {
  @Post('standard')
  create(@Body() body: { name: string }) {
    return { ok: true, received: body.name }
  }

  /** 无 body 的动作型 POST：验证空串签名规则 */
  @Post('action')
  submitAction() {
    return { ok: true }
  }

  @SkipSignature()
  @Post('open')
  createOpen() {
    return { ok: true }
  }

  @UseSignature('demo')
  @Post('custom')
  createCustom() {
    return { ok: true }
  }

  @Get('list')
  findAll() {
    return { ok: true }
  }
}

describe('Signature (e2e)', () => {
  let app: INestApplication
  let server: Server
  let demoScheme: DemoSignatureScheme

  beforeAll(async () => {
    demoScheme = new DemoSignatureScheme()
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [SignatureDemoController],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSourceStub)
      .compile()

    // 注册测试自定义方案（模拟业务模块 onModuleInit 中注册自定义方案的扩展路径）
    moduleFixture.get(SignatureSchemeRegistry).register(demoScheme)

    // rawBody: true 与 main.ts 保持一致，是签名校验的前提
    app = moduleFixture.createNestApplication({ rawBody: true })
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

  it('写请求无签名头应返回 401 统一错误结构', () => {
    return request(server)
      .post('/api/signature-demo/standard')
      .set('Content-Type', 'application/json')
      .send('{"name":"CNY"}')
      .expect(401)
      .expect((res) => {
        const body = res.body as ApiResponse
        expect(body.code).toBe(401)
        expect(body.message).toBe('签名校验失败')
      })
  })

  it('正确签名的写请求应通过并返回统一包装结构', () => {
    return signedRequest(server, 'post', '/api/signature-demo/standard', '{"name":"CNY"}')
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<{ ok: boolean, received: string }>
        expect(body.code).toBe(0)
        expect(body.data?.ok).toBe(true)
        expect(body.data?.received).toBe('CNY')
      })
  })

  it('无 body 的动作型 POST 应以空 body 段签名并放行', () => {
    return signedRequest(server, 'post', '/api/signature-demo/action', '')
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<{ ok: boolean }>
        expect(body.code).toBe(0)
        expect(body.data?.ok).toBe(true)
      })
  })

  it('签名按 body A 生成、实际发送 body B 应返回 401（篡改检测）', () => {
    // 以 body A 的签名头发送 body B
    return request(server)
      .post('/api/signature-demo/standard')
      .set('Content-Type', 'application/json')
      .set(signHeaders('POST', '/api/signature-demo/standard', '{"name":"A"}'))
      .send('{"name":"B"}')
      .expect(401)
  })

  it('使用错误密钥签名应返回 401', () => {
    return signedRequest(server, 'post', '/api/signature-demo/standard', '{"name":"CNY"}', {
      secret: 'wrong-secret',
    }).expect(401)
  })

  it('过去方向超出时间窗的时间戳应返回 401', () => {
    return signedRequest(server, 'post', '/api/signature-demo/standard', '{"name":"CNY"}', {
      timestamp: String(Date.now() - 300_001),
    }).expect(401)
  })

  it('未来方向超出时间窗的时间戳应返回 401（守护双向时间窗）', () => {
    // 偏移 100ms 余量：抵消请求构建与处理延迟对「未来方向窗口差值」的侵蚀
    return signedRequest(server, 'post', '/api/signature-demo/standard', '{"name":"CNY"}', {
      timestamp: String(Date.now() + 300_100),
    }).expect(401)
  })

  it('同一 nonce 原样重放：第一次通过，第二次返回 401（防重放）', async () => {
    const nonce = 'replay-test-nonce'
    const body = '{"name":"CNY"}'

    await signedRequest(server, 'post', '/api/signature-demo/standard', body, { nonce }).expect(200)
    await signedRequest(server, 'post', '/api/signature-demo/standard', body, { nonce }).expect(401)
  })

  it('非 JSON content-type 带体的写请求应返回 401（fail-closed，防非 JSON 通道绕过）', () => {
    // 按空 body 签名（multipart/text 等场景在标准方案中直接拒绝，签名头仅供到达判定分支）
    return request(server)
      .post('/api/signature-demo/standard')
      .set('Content-Type', 'text/plain')
      .set(signHeaders('POST', '/api/signature-demo/standard', ''))
      .send('plain-text-body')
      .expect(401)
  })

  it('@SkipSignature 接口无签名头应正常通过（豁免）', () => {
    return request(server)
      .post('/api/signature-demo/open')
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<{ ok: boolean }>
        expect(body.code).toBe(0)
      })
  })

  it('GET 请求无签名头应正常通过（默认豁免）', () => {
    return request(server)
      .get('/api/signature-demo/list')
      .expect(200)
      .expect((res) => {
        const body = res.body as ApiResponse<{ ok: boolean }>
        expect(body.code).toBe(0)
      })
  })

  it('@UseSignature 自定义方案：方案放行时通过且接管上下文正确；方案抛错时统一转 401', async () => {
    // 放行：自定义方案接管（可断言收到的上下文含正确密钥）
    demoScheme.behavior = 'pass'
    await request(server).post('/api/signature-demo/custom').expect(200)
    expect(demoScheme.lastContext?.secret).toBe(E2E_SIGN_SECRET)

    // 拒绝：方案任意异常统一转为 401「签名校验失败」
    demoScheme.behavior = 'fail'
    await request(server)
      .post('/api/signature-demo/custom')
      .expect(401)
      .expect((res) => {
        const body = res.body as ApiResponse
        expect(body.message).toBe('签名校验失败')
      })
  })
})
