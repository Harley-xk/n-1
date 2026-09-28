/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 字典接口封装：类型 / 数据两域 CRUD 与折叠精简出口（DictTag / DictSelect 的数据源）
 */
import type { PageParam, PageResult } from '@/api/http'
import { http } from '@/api/http'

/** 字典类型信息（后端 DictTypeVo） */
export interface DictTypeVO {
  id: string
  name: string
  type: string
  status: boolean
  remark: string | null
  createTime: string
}

/** 字典数据信息（后端 DictDataVo；dictValue 统一字符串形态） */
export interface DictDataVO {
  id: string
  dictType: string
  sort: number
  label: string
  dictValue: string
  status: boolean
  colorType: string | null
  remark: string | null
  createTime: string
}

/** 字典数据精简项（折叠出口；colorType 为 el-tag 语义色） */
export interface DictSimpleVO {
  label: string
  value: string
  colorType: string | null
}

/** 字典类型精简项（折叠出口：类型 + 其启用数据列表） */
export interface DictTypeSimpleVO {
  id: string
  name: string
  type: string
  datas: DictSimpleVO[]
}

/** 字典类型创建请求（type 创建后变更会级联数据归属） */
export interface DictTypeCreateData {
  name: string
  type: string
  status?: boolean
  remark?: string
}

/** 字典类型更新请求 */
export interface DictTypeUpdateData {
  id: string
  name: string
  type: string
  status?: boolean
  remark?: string
}

/** 字典数据创建请求（同类型下 dictValue 唯一） */
export interface DictDataCreateData {
  dictType: string
  label: string
  dictValue: string
  sort?: number
  status?: boolean
  colorType?: string
  remark?: string
}

/** 字典数据更新请求 */
export interface DictDataUpdateData {
  id: string
  label: string
  dictValue: string
  sort?: number
  status?: boolean
  colorType?: string
  remark?: string
}

/** 字典类型分页查询条件 */
export interface DictTypePageParam extends Partial<PageParam> {
  name?: string
  type?: string
  status?: boolean
}

/** 字典数据分页查询条件（dictType 必填：数据页固定在某类型下） */
export interface DictDataPageParam extends Partial<PageParam> {
  dictType: string
  label?: string
}

export async function getDictTypePage(params: DictTypePageParam): Promise<PageResult<DictTypeVO>> {
  const { data } = await http.get<PageResult<DictTypeVO>>('/system/dict/type/page', { params })
  return data
}

export async function createDictType(payload: DictTypeCreateData): Promise<void> {
  await http.post<null>('/system/dict/type/create', payload)
}

export async function updateDictType(payload: DictTypeUpdateData): Promise<void> {
  await http.put<null>('/system/dict/type/update', payload)
}

/** 删除类型（连带物理清理其下数据，后端约束） */
export async function deleteDictType(id: string): Promise<void> {
  await http.delete<null>(`/system/dict/type/delete/${id}`)
}

export async function getDictDataPage(params: DictDataPageParam): Promise<PageResult<DictDataVO>> {
  const { data } = await http.get<PageResult<DictDataVO>>('/system/dict/data/page', { params })
  return data
}

export async function createDictData(payload: DictDataCreateData): Promise<void> {
  await http.post<null>('/system/dict/data/create', payload)
}

export async function updateDictData(payload: DictDataUpdateData): Promise<void> {
  await http.put<null>('/system/dict/data/update', payload)
}

export async function deleteDictData(id: string): Promise<void> {
  await http.delete<null>(`/system/dict/data/delete/${id}`)
}

/** 折叠精简出口：启用类型 + 启用数据（dict store 一次拉取常驻） */
export async function listAllSimpleDict(): Promise<DictTypeSimpleVO[]> {
  const { data } = await http.get<DictTypeSimpleVO[]>('/system/dict/list-all-simple')
  return data!
}
