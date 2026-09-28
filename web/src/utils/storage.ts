/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: localStorage JSON 存取薄封装（解析失败静默清掉脏数据）
 */

/** 读取并解析 JSON，缺失或解析失败返回 null（脏数据顺带清除） */
export function readLocalJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

/** 序列化写入 JSON */
export function writeLocalJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/** 移除指定键 */
export function removeLocalKey(key: string): void {
  localStorage.removeItem(key)
}
