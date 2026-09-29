/*
 * 作者: Harley-xk
 * 创建: 2026-09-29
 *
 * 描述: 示例商品接口封装：分页与 CRUD（业务模块样板，见 docs/指南/新模块接入指南.md）
 */
import type { PageParam, PageResult } from '@/api/http'
import { http } from '@/api/http'

/** 商品信息（后端 ProductVo；时间为毫秒时间戳） */
export interface ProductVO {
  id: string
  name: string
  /** 分类：字典 demo_product_category 的取值 */
  category: string
  price: number
  status: boolean
  description: string | null
  createTime: number
}

/** 商品创建请求 */
export interface ProductCreateData {
  name: string
  category: string
  price: number
  status?: boolean
  description?: string
}

/** 商品更新请求 */
export interface ProductUpdateData {
  id: string
  name: string
  category: string
  price: number
  status?: boolean
  description?: string
}

/** 商品分页查询条件 */
export interface ProductPageParam extends Partial<PageParam> {
  name?: string
  category?: string
  status?: boolean
}

export async function getProductPage(params: ProductPageParam): Promise<PageResult<ProductVO>> {
  const { data } = await http.get<PageResult<ProductVO>>('/demo/product/page', { params })
  return data
}

export async function getProduct(id: string): Promise<ProductVO> {
  const { data } = await http.get<ProductVO>('/demo/product/get', { params: { id } })
  return data!
}

/** 上架商品全量列表（下拉数据源示范；数量有限不分页） */
export async function getProductList(): Promise<ProductVO[]> {
  const { data } = await http.get<ProductVO[]>('/demo/product/list')
  return data!
}

export async function createProduct(payload: ProductCreateData): Promise<string> {
  const { data } = await http.post<string>('/demo/product/create', payload)
  return data!
}

export async function updateProduct(payload: ProductUpdateData): Promise<void> {
  await http.put<null>('/demo/product/update', payload)
}

export async function deleteProduct(id: string): Promise<void> {
  await http.delete<null>(`/demo/product/delete/${id}`)
}
