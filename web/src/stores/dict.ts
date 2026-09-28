/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 字典状态：折叠精简字典的一次拉取与常驻缓存，字典下拉 / 标签翻译的统一数据源
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { DictSimpleVO } from '@/api/system/dict'
import { listAllSimpleDict } from '@/api/system/dict'

/** 字典类型 → 启用数据列表 */
type DictDatas = DictSimpleVO[]

/** 进行中的加载承诺（模块级：并发调用共享同一次请求，失败后可重试） */
let loading: Promise<void> | null = null

export const useDictStore = defineStore('dict', () => {
  /** 类型 → 数据列表的索引 */
  const dictMap = ref<Map<string, DictDatas>>(new Map())

  /** 是否已完成一次全量加载 */
  const isLoaded = ref(false)

  /** 确保字典已加载（已加载直接返回；并发调用共享同一次请求） */
  async function ensureLoaded(): Promise<void> {
    if (isLoaded.value) {
      return
    }
    if (!loading) {
      loading = listAllSimpleDict()
        .then((list) => {
          dictMap.value = new Map(list.map(dict => [dict.type, dict.datas]))
          isLoaded.value = true
        })
        .finally(() => {
          loading = null
        })
    }
    await loading
  }

  /** 取类型下的启用数据列表（未加载或类型不存在返回空数组） */
  function getDictDatas(type: string): DictDatas {
    return dictMap.value.get(type) ?? []
  }

  /** 按取值找字典项（value 统一字符串比较，boolean 直传天然命中 'true' / 'false'） */
  function findDictData(type: string, value: string | number | boolean | null | undefined) {
    if (value === null || value === undefined) {
      return undefined
    }
    const target = String(value)
    return getDictDatas(type).find(data => data.value === target)
  }

  /** 取值翻译为中文名（未命中原样返回，保证表格不留空） */
  function getDictLabel(type: string, value: string | number | boolean | null | undefined): string {
    return findDictData(type, value)?.label ?? String(value ?? '')
  }

  /** 取值的标签色（el-tag type；未命中返回 null，由调用方决定兜底色） */
  function getDictColorType(
    type: string,
    value: string | number | boolean | null | undefined,
  ): string | null {
    return findDictData(type, value)?.colorType ?? null
  }

  return {
    isLoaded,
    ensureLoaded,
    getDictDatas,
    getDictLabel,
    getDictColorType,
  }
})
