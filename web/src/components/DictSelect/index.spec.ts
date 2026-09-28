import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DictTypeSimpleVO } from '@/api/system/dict'
import { listAllSimpleDict } from '@/api/system/dict'
import { useDictStore } from '@/stores/dict'

import DictSelect from './index.vue'

// mock 掉字典 api 模块（组件经 store 间接依赖，仅这一层边界）
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

describe('DictSelect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(listAllSimpleDict).mockReset().mockResolvedValue(mockedList)
  })

  it('挂载应触发一次字典加载（下拉数据源就绪）', async () => {
    mount(DictSelect, {
      props: { type: 'common_status' },
      global: { plugins: [ElementPlus] },
    })
    await useDictStore().ensureLoaded()

    expect(listAllSimpleDict).toHaveBeenCalledTimes(1)
    expect(useDictStore().getDictDatas('common_status')).toHaveLength(2)
  })

  it('v-model 应透传选中值（未加载时呈现 loading 态）', async () => {
    const wrapper = mount(DictSelect, {
      props: { type: 'common_status', modelValue: 'false' },
      global: { plugins: [ElementPlus] },
    })

    expect(wrapper.props('modelValue')).toBe('false')
    // 加载完成前 loading 为真（el-select 的 loading 属性透传）
    expect(wrapper.findComponent({ name: 'ElSelect' }).props('loading')).toBe(true)

    await useDictStore().ensureLoaded()
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'ElSelect' }).props('loading')).toBe(false)
  })
})
