// 环境类型声明：Vite 客户端类型与自定义 VITE_ 环境变量的类型补充
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 基础路径（开发环境经 Vite 代理转发到后端） */
  readonly VITE_API_BASE_URL: string
  /** 请求签名密钥（须与 server/.env 的 SIGNATURE_SECRET 一致，见 docs/指南/请求签名验证设计.md） */
  readonly VITE_SIGN_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
