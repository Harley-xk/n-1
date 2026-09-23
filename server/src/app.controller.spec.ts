import { beforeEach, describe, expect, it } from '@jest/globals'
import { Test } from '@nestjs/testing'

import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    // 构建仅包含控制器与服务的最小测试模块，不依赖数据库
    const appTestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile()

    appController = appTestingModule.get<AppController>(AppController)
  })

  describe('getHello', () => {
    it('应返回应用名称与版本信息', () => {
      const result = appController.getHello()
      expect(result.name).toBe('n-1 API')
      expect(result.docs).toBe('/api-docs')
    })
  })

  describe('getHealth', () => {
    it('应返回 ok 状态', () => {
      const result = appController.getHealth()
      expect(result.status).toBe('ok')
    })
  })
})
