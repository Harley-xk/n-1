/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 全局 HTTP 客户端：基于 axios 封装，统一承载超时、鉴权注入、写方法请求签名、响应解包与错误提示等横切逻辑
 */

import axios, { type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

import { SIGNATURE_WRITE_METHODS, isSignableData, resolveSignPath, serializeBody, signRequest } from './signature'

/** 统一响应结构（与 server/src/common/interfaces/api-response.interface.ts 保持同步维护） */
export interface ApiResponse<T = unknown> {
  /** 业务状态码：>=0 成功（默认 0，预留正数扩展位）；<0 业务错误（默认 -1，预留负数扩展位） */
  code: number
  /** 提示信息：错误时必有 */
  message?: string
  /** 业务数据 */
  data?: T
}

export const http = axios.create({
  // 基础路径来自环境变量（开发环境为 /api，由 Vite 代理转发到后端）
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

// 请求拦截器：写方法自动注入签名头（算法与后端 SignatureGuard 对应，见 docs/指南/请求签名验证设计.md）
http.interceptors.request.use((config) => {
  // const token = useAuthStore().token
  // if (token) config.headers.Authorization = `Bearer ${token}`

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

// 响应拦截器：统一解包与错误提示
http.interceptors.response.use(
  (response) => {
    // 文件流（blob）不做统一解包
    if (response.config.responseType === 'blob')
      return response

    const body = response.data as ApiResponse
    // HTTP 2xx 但 code < 0 的防御性兜底（符号判定，不写死具体值）
    if (body.code < 0) {
      const message = body.message || '请求失败'
      ElMessage.error(message)
      return Promise.reject(new Error(message))
    }

    // 字段同名对齐约定：返回包装结构本身（ApiResponse.data 与 AxiosResponse.data 同名），
    // 调用方沿用「const { data } = await http.get<业务数据类型>()」即可直接拿到业务数据，
    // 泛型 T 的语义即业务数据类型（详见 docs/指南/统一响应与异常处理设计.md）
    return body as unknown as AxiosResponse
  },
  (error) => {
    // HTTP 非 2xx：后端全局异常过滤器已保证响应体为 { code, message } 结构；
    // 无响应（网络中断/超时）时给统一兜底提示
    const message = error?.response?.data?.message || '网络异常，请稍后重试'
    ElMessage.error(message)
    return Promise.reject(error)
  },
)
