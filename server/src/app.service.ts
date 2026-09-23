/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 根服务：提供应用欢迎信息与健康状态数据
 */

import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getHello(): { name: string, version: string, docs: string } {
    return {
      name: 'n-1 API',
      version: '0.1.0',
      docs: '/api-docs',
    }
  }

  /** 时间字段直接返回 Date 实例，序列化为毫秒时间戳由全局响应拦截器统一完成 */
  getHealth(): { status: string, timestamp: Date } {
    return {
      status: 'ok',
      timestamp: new Date(),
    }
  }
}
