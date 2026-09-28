/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 分页结果公共契约（与 web 端 api/types.ts 的 PageResult 镜像同步维护）
 */

/** 分页结果：列表 + 总数 */
export interface PageResult<T> {
  /** 当前页数据 */
  list: T[]
  /** 总条数 */
  total: number
}
