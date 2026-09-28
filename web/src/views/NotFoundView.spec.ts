// 组件测试样例：验证 jsdom + @vue/test-utils 组件测试链路可用（批次三布局组件测试的基础）
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, expect, it, vi } from 'vitest'

import NotFoundView from './NotFoundView.vue'

// useRouter 由真实路由器提供，组件单测中 mock 掉边界依赖即可
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

function mountView() {
  // 与 main.ts 一致的全量引入方式，保证 el-* 组件可解析
  return mount(NotFoundView, { global: { plugins: [ElementPlus] } })
}

describe('NotFoundView', () => {
  it('应渲染 404 标题与副标题', () => {
    const wrapper = mountView()

    expect(wrapper.text()).toContain('404')
    expect(wrapper.text()).toContain('页面不存在或已被移除')
  })

  it('应提供返回首页入口', () => {
    const wrapper = mountView()

    expect(wrapper.text()).toContain('返回首页')
  })
})
