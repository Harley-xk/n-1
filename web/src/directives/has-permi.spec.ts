import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, withDirectives } from 'vue'

import { hasPermi } from '@/directives/has-permi'
import { useAuthStore } from '@/stores/auth'

/** 宿主组件：指令经 withDirectives 绑定（渲染函数不解析 v-xxx 模板指令语法） */
function makeHost(value: string | string[]) {
  return defineComponent({
    setup() {
      return () =>
        h('div', [
          withDirectives(h('button', { 'data-testid': 'target' }, ['受限按钮']), [[hasPermi, value]]),
        ])
    },
  })
}

describe('v-hasPermi 指令', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  async function mountAndGetTarget(value: string | string[]) {
    const wrapper = mount(makeHost(value))
    await nextTick()
    return wrapper.find('[data-testid="target"]')
  }

  it('持有任一注解权限应保留元素（OR 语义）', async () => {
    const auth = useAuthStore()
    auth.permissions = ['system:user:query']

    const target = await mountAndGetTarget(['system:user:query', 'system:role:delete'])
    expect(target.exists()).toBe(true)
  })

  it('不持有任何注解权限应在挂载时移除元素', async () => {
    const auth = useAuthStore()
    auth.permissions = ['system:user:query']

    const target = await mountAndGetTarget('system:role:delete')
    expect(target.exists()).toBe(false)
  })

  it('空数组注解应保留元素（无要求）', async () => {
    const target = await mountAndGetTarget([])
    expect(target.exists()).toBe(true)
  })
})
