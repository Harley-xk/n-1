/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 响应包装拦截器：将 Controller 返回值包装为统一结构，并转换时间字段为毫秒时间戳
 */

import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import { Injectable, StreamableFile } from '@nestjs/common'
import type { Response } from 'express'
import type { Observable } from 'rxjs'
import { map } from 'rxjs'

import type { ApiResponse } from '../interfaces/api-response.interface'
import { serializeDates } from '../utils/serialize-dates'

/** 响应包装拦截器：成功路径的统一出口，Controller 只需返回裸业务数据 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | StreamableFile> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | StreamableFile> {
    const response = context.switchToHttp().getResponse<Response>()

    // POST 创建默认 201，统一转 200，保证前端「HTTP 2xx 即成功」的判定简单一致
    if (response.statusCode === 201)
      response.statusCode = 200

    // Controller 手动设置了非 2xx 状态码但仍有返回值的防御性兜底
    let code = 0
    if (response.statusCode < 200 || response.statusCode >= 300)
      code = -1

    return next.handle().pipe(
      map((data) => {
        // 文件下载直通，不包装
        if (data instanceof StreamableFile)
          return data
        // 时间字段转毫秒时间戳 + 包装为统一结构（成功时 message 为 undefined，JSON 序列化自动省略）
        return { code, data: serializeDates(data) }
      }),
    )
  }
}
