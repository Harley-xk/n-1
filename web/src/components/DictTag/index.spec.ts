import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DictTypeSimpleVO } from '@/api/system/dict'
import { listAllSimpleDict } from '@/api/system/dict'
import { useDictStore } from '@/stores/dict'

import DictTag from './index.vue'

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

describe('DictTag', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(listAllSimpleDict).mockReset().mockResolvedValue(mockedList)
  })

  it('应按字典翻译渲染标签文本与语义色（boolean 直传命中）', async () => {
    const wrapper = mount(DictTag, {
      props: { type: 'common_status', value: true },
      global: { plugins: [ElementPlus] },
    })
    await useDictStore().ensureLoaded()

    expect(wrapper.text()).toBe('启用')
    expect(wrapper.find('.el-tag').classes()).toContain('el-tag--success')
  })

  it('未命中应原样展示取值并兜底 info 色', async () => {
    const wrapper = mount(DictTag, {
      props: { type: 'common_status', value: '9' },
      global: { plugins: [ElementPlus] },
    })
    await useDictStore().ensureLoaded()

    expect(wrapper.text()).toBe('9')
    expect(wrapper.find('.el-tag').classes()).toContain('el-tag--info')
  })
})
