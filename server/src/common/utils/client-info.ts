/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 客户端信息提取工具：登录 / 操作日志记录 IP 与 User-Agent 的统一出处
 */
import type { Request } from 'express'

/** 客户端信息（日志埋点的固定载荷） */
export interface ClientInfo {
  /** 客户端 IP（经代理时为真实客户端 IP，取不到为 null） */
  ip: string | null
  /** 浏览器 User-Agent */
  userAgent: string | null
}

/** 从 X-Forwarded-For 头逐跳解析首个非 unknown 的 IP（多级代理时最左一跳为真实客户端） */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers['x-forwarded-for']
  const candidates = Array.isArray(forwarded)
    ? forwarded.join(',').split(',')
    : (forwarded?.split(',') ?? [])
  for (const candidate of candidates) {
    const ip = candidate.trim()
    if (ip !== '' && ip.toLowerCase() !== 'unknown')
      return ip
  }
  return request.socket?.remoteAddress ?? null
}

/** 取 User-Agent 头（缺失返回 null） */
export function getClientUserAgent(request: Request): string | null {
  return request.headers['user-agent'] ?? null
}

/** 一次性提取客户端信息（IP + UA） */
export function getClientInfo(request: Request): ClientInfo {
  return { ip: getClientIp(request), userAgent: getClientUserAgent(request) }
}
