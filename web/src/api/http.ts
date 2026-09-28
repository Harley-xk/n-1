/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 全局 HTTP 客户端：基于 axios 封装，统一承载超时、鉴权注入、写方法请求签名、响应解包与错误提示等横切逻辑
 */

import axios, { type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

import { removeToken } from '@/utils/auth'

import { SIGNATURE_WRITE_METHODS, isSignableData, resolveSignPath, serializeBody, signRequest } from './signature'

/** 统一响应结构（与 server/src/common/interfaces/api-response.interface.ts 保持同步维护） */
export interface ApiResponse<T = unknown> {
  /** 业务状态码：0 成功；非 0 为九位分段错误码（模块 3 位 + 子域 3 位 + 序号 3 位） */
  code: number
  /** 提示信息：错误时必有 */
  message?: string
  /** 业务数据 */
  data?: T
}

/** 业务错误：携带分段错误码，供调用方按 code 分支（如登录页区分失败原因） */
export class ApiError extends Error {
  /** 九位分段业务错误码（网络异常等无响应场景为 -1） */
  readonly code: number

  constructor(message: string, code: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** 分页请求参数（与 server/src/common/dto/page.dto.ts 的 PageParamDto 保持同步维护） */
export interface PageParam {
  pageNo: number
  pageSize: number
}

/** 分页返回结构（与 server/src/common/interfaces/page-result.interface.ts 保持同步维护） */
export interface PageResult<T> {
  list: T[]
  total: number
}

export const http = axios.create({
  // 基础路径来自环境变量（开发环境为 /api，由 Vite 代理转发到后端）
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

// 请求拦截器：token 注入 + 写方法自动注入签名头（算法与后端 SignatureGuard 对应，见 docs/指南/请求签名验证设计.md）
http.interceptors.request.use((config) => {
  // token 直读 localStorage（不经 auth store，避免拦截器与 store 的循环依赖）；
  // 401 整页跳转后 store 随页面重建，内存镜像无需在此同步清理
  const token = localStorage.getItem('N1_TOKEN')
  if (token)
    config.headers.set('Authorization', `Bearer ${token}`)

  const method = (config.method ?? 'get').toLowerCase()
  // FormData 等结构化类型不参与标准签名（后端标准方案亦不支持，此类接口应豁免或用自定义方案）
  if (SIGNATURE_WRITE_METHODS.includes(method) && isSignableData(config.data)) {
    // 先序列化再签名：签的内容 = 发的内容（同一字符串本体作为请求体发送，不依赖 axios 内部序列化）
    const bodyText = serializeBody(config.data)
    const path = resolveSignPath(config.baseURL ?? '', config.url ?? '')
    const { headers } = signRequest(method, path, bodyText)

    config.data = bodyText === '' ? undefined : bodyText
    if (bodyText !== '') {
      // axios 对 string body 不会自动加 JSON 头，缺失会绕过服务端 JSON 解析导致验签必败，必须显式声明
      config.headers.set('Content-Type', 'application/json')
    }
    config.headers.set('sign', headers.sign)
    config.headers.set('timestamp', headers.timestamp)
    config.headers.set('noncestr', headers.noncestr)
  }
  return config
})

/**
 * 401 处理：清令牌后整页跳登录页并回带 redirect。
 * 用 window.location 而非 router：http 层与路由解耦，且整页刷新天然重置 store 内存态
 */
function redirectToLoginOnUnauthorized(): void {
  removeToken()
  if (window.location.pathname !== '/login') {
    const redirect = encodeURIComponent(
      window.location.pathname + window.location.search,
    )
    window.location.href = `/login?redirect=${redirect}`
  }
}

// 响应拦截器：统一解包与错误提示
http.interceptors.response.use(
  (response) => {
    // 文件流（blob）不做统一解包
    if (response.config.responseType === 'blob')
      return response

    const body = response.data as ApiResponse
    // HTTP 2xx 但 code 非 0 的防御性兜底（分段错误码全为正整数，成功码 0 是唯一成功值）
    if (body.code !== 0) {
      const message = body.message || '请求失败'
      ElMessage.error(message)
      return Promise.reject(new ApiError(message, body.code))
    }

    // 字段同名对齐约定：返回包装结构本身（ApiResponse.data 与 AxiosResponse.data 同名），
    // 调用方沿用「const { data } = await http.get<业务数据类型>()」即可直接拿到业务数据，
    // 泛型 T 的语义即业务数据类型（详见 docs/指南/统一响应与异常处理设计.md）
    return body as unknown as AxiosResponse
  },
  (error) => {
    // HTTP 401：token 缺失 / 无效 / 过期 / 用户已失效（后端全局异常过滤器保证响应体为 { code, message }）
    if (error?.response?.status === 401) {
      redirectToLoginOnUnauthorized()
      return Promise.reject(new ApiError('登录已失效，请重新登录', 401))
    }
    // 其余 HTTP 非 2xx：响应体同为 { code, message } 结构；
    // 无响应（网络中断/超时）时给统一兜底提示
    const code: number = error?.response?.data?.code ?? -1
    const message = error?.response?.data?.message || '网络异常，请稍后重试'
    ElMessage.error(message)
    return Promise.reject(new ApiError(message, code))
  },
)
