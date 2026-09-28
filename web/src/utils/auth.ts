/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 登录令牌存取薄封装：N1_TOKEN 存纯字符串（头名与形态固定为 Authorization: Bearer，无需存对象）
 */

const TOKEN_KEY = 'N1_TOKEN'

/** 读取 token（未登录返回 null） */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/** 写入 token（登录成功时调用） */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/** 清除 token（登出 / 401 失效时调用） */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
