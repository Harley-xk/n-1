/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 安全响应头中间件：为所有响应（含 Swagger 文档页）注入基础 Web 攻击防御头
 */

import type { NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

/**
 * 安全响应头中间件：基础防御头的统一出口。
 *
 * 刻意不加的头（部署层策略，由网关按环境注入）：
 * - `X-XSS-Protection`：浏览器已废弃该机制
 * - CSP 与 HSTS：HSTS 仅 HTTPS 有意义，与 CSP 同属部署层策略，由 nginx / 前端服务按环境注入
 */
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_request: Request, response: Response, next: NextFunction): void {
    // 禁止浏览器 MIME 嗅探
    response.setHeader('X-Content-Type-Options', 'nosniff')
    // 禁止被嵌入 iframe（防点击劫持）
    response.setHeader('X-Frame-Options', 'DENY')
    // 响应内容不落缓存（防敏感信息残留，含 HTTP/1.0 兼容头）
    response.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate')
    response.setHeader('Pragma', 'no-cache')
    response.setHeader('Expires', '0')
    // 不泄漏来源地址
    response.setHeader('Referrer-Policy', 'no-referrer')
    next()
  }
}
