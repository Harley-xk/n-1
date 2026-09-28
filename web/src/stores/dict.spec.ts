import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DictTypeSimpleVO } from '@/api/system/dict'
import { listAllSimpleDict } from '@/api/system/dict'
import { useDictStore } from '@/stores/dict'

// mock 掉字典 api 模块（store 只依赖这一层边界）
vi.mock('@/api/system/dict', () => ({
  listAllSimpleDict: vi.fn(),
}))

const mockedList: DictTypeSimpleVO[] = [
  {
    id: '1',
    name: '通用状态',
    type: 'common_status',
    datas: [
      { label: '启用', value: 'true', colorType: 'success' },
      { label: '停用', value: 'false', colorType: 'danger' },
    ],
  },
]

describe('字典 store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(listAllSimpleDict).mockReset().mockResolvedValue(mockedList)
  })

  it('ensureLoaded：一次拉取建索引，重复调用不重复请求', async () => {
    const store = useDictStore()

    await store.ensureLoaded()
    await store.ensureLoaded()

    expect(listAllSimpleDict).toHaveBeenCalledTimes(1)
    expect(store.isLoaded).toBe(true)
    expect(store.getDictDatas('common_status')).toHaveLength(2)
  })

  it('并发 ensureLoaded：共享同一次请求', async () => {
    const store = useDictStore()

    await Promise.all([store.ensureLoaded(), store.ensureLoaded(), store.ensureLoaded()])

    expect(listAllSimpleDict).toHaveBeenCalledTimes(1)
  })

  it('取值翻译：boolean 直传应命中字符串种子值（common_status 契约）', async () => {
    const store = useDictStore()
    await store.ensureLoaded()

    expect(store.getDictLabel('common_status', true)).toBe('启用')
    expect(store.getDictLabel('common_status', false)).toBe('停用')
    expect(store.getDictColorType('common_status', true)).toBe('success')
    expect(store.getDictColorType('common_status', false)).toBe('danger')
  })

  it('未命中兜底：label 原样返回、色为 null；未加载或类型不存在返回空列表', () => {
    const store = useDictStore()

    expect(store.getDictLabel('common_status', '9')).toBe('9')
    expect(store.getDictLabel('common_status', null)).toBe('')
    expect(store.getDictColorType('common_status', true)).toBeNull()
    expect(store.getDictDatas('not-exists')).toEqual([])
  })

  it('加载失败后可重试（不缓存失败状态）', async () => {
    vi.mocked(listAllSimpleDict).mockRejectedValueOnce(new Error('网络错误'))
    const store = useDictStore()

    await expect(store.ensureLoaded()).rejects.toThrow('网络错误')
    expect(store.isLoaded).toBe(false)

    await store.ensureLoaded()
    expect(store.isLoaded).toBe(true)
  })
})
