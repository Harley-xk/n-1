import { flushPromises, mount } from '@vue/test-utils'
import { ElButton } from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, withDirectives } from 'vue'

import { hasPermi } from '@/directives/has-permi'
import { useAuthStore } from '@/stores/auth'

import RowActions from './RowActions.vue'

/**
 * jsdom 无布局（offsetWidth / clientWidth 恒 0）且无 ResizeObserver：
 * 原型级 spy 按元素特征驱动假宽度，RO 以空桩替代（首测在 mounted 同步完成，不依赖 RO）
 */
let containerWidth = 400
const ITEM_WIDTHS: Record<string, number> = {
  编辑: 50,
  重置密码: 60,
  分配角色: 70,
  删除: 40,
  终态: 30,
}

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
  if (this.classList.contains('row-actions__more')) {
    return 28
  }
  return ITEM_WIDTHS[this.textContent?.trim() ?? ''] ?? 40
})

vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
  if (this.classList.contains('row-actions')) {
    return containerWidth
  }
  return 0
})

/** 三个按钮的默认插槽（编辑 / 重置密码 / 分配角色），onClick 由调用方按需注入
    按钮必须在插槽工厂内现建：插槽函数被 RowActions 的 render 调用两次（测量层 / 可见区分片），
    预创建的 vnode 数组会被复用，两次 patch 同一批节点属未定义行为 */
function makeSlots(clickSpy?: () => void) {
  return {
    default: () =>
      ['编辑', '重置密码', '分配角色'].map(label =>
        h(ElButton, { link: true, onClick: clickSpy }, () => label),
      ),
  }
}

/** 挂载并等 mounted 首测触发的重渲染（同微任务循环）落地 */
async function mountRowActions(clickSpy?: () => void) {
  const wrapper = mount(RowActions, { slots: makeSlots(clickSpy) })
  await nextTick()
  await flushPromises()
  return wrapper
}

/** EP popover 开合链路含宏任务依赖（popper 位置计算 / transition 完成），微任务等待不够 */
async function waitPopoverTask(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}

beforeEach(() => {
  containerWidth = 400
  setActivePinia(createPinia())
  useAuthStore().permissions = ['system:user:update']
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('RowActions 操作列动态收纳', () => {
  it('容器足够宽时应平铺全部按钮且不出现更多按钮', async () => {
    const wrapper = await mountRowActions()
    // 可见区（root 直接子元素）：三个按钮；测量层副本不计入（.row-actions > button 直接子组合器）
    const visibleButtons = wrapper.findAll('.row-actions > button')
    expect(visibleButtons.map(b => b.text())).toEqual(['编辑', '重置密码', '分配角色'])
    expect(wrapper.find('.row-actions > .row-actions__more').exists()).toBe(false)
  })

  it('容器放不下全部按钮时应只保留头部项并出现更多按钮', async () => {
    containerWidth = 150 // k=1：编辑 50+12+28=90 ≤ 150；两项 90+60=150+… 放不下
    const wrapper = await mountRowActions()
    const visibleButtons = wrapper.findAll('.row-actions > button')
    expect(visibleButtons.map(b => b.text())).toEqual(['编辑', ''])
    expect(wrapper.find('.row-actions > .row-actions__more').exists()).toBe(true)
  })

  it('容器仅容得下更多按钮时应全收纳（k=0）', async () => {
    containerWidth = 60 // 编辑 50+12+28=90 > 60；more 28 ≤ 60 → k=0
    const wrapper = await mountRowActions()
    const visibleButtons = wrapper.findAll('.row-actions > button')
    expect(visibleButtons).toHaveLength(1)
    expect(visibleButtons[0].attributes('aria-label')).toBe('更多操作')
  })

  it('点击更多按钮应经 popover 弹出隐藏项，点击隐藏项应触发原回调并关闭', async () => {
    containerWidth = 150
    const clickSpy = vi.fn()
    const wrapper = await mountRowActions(clickSpy)

    // 未打开时 popover 内容不渲染（persistent false 懒渲染，teleport 到 body）
    expect(document.querySelector('.n1-row-actions-pop__list')).toBeNull()

    await wrapper.find('.row-actions > .row-actions__more').trigger('click')
    await nextTick()
    await flushPromises()
    await waitPopoverTask()

    const list = document.querySelector('.n1-row-actions-pop__list')
    expect(list).not.toBeNull()
    const hiddenButtons = Array.from(list!.querySelectorAll('button')).map(b => b.textContent)
    expect(hiddenButtons).toEqual(['重置密码', '分配角色'])

    // 点击隐藏项：原 onClick 触发 + 事件委托关闭 popover（隐藏态断言——persistent false 的
    // 内容卸载挂在 transition leave 完成回调上，测试环境 transition 被 stub 不执行，DOM 不销毁非缺陷）
    ;(list!.querySelectorAll('button')[0] as HTMLElement).click()
    await nextTick()
    await flushPromises()
    expect(clickSpy).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => {
      expect((document.querySelector('.el-popper') as HTMLElement).style.display).toBe('none')
    })
  })

  it('无权限项应被指令移除，不参与收纳计数（测量层与可见区同步）', async () => {
    containerWidth = 100
    // 重置密码挂无权限注解：挂载即被 v-hasPermi 移除，测量层只剩 编辑(50) / 分配角色(70)；
    // withDirectives 须在插槽工厂（render 期间）内调用，渲染函数外调用会静默失效
    const wrapper = mount(RowActions, {
      slots: {
        default: () => [
          withDirectives(h(ElButton, { link: true }, () => '编辑'), [[hasPermi, 'system:user:update']]),
          withDirectives(
            h(ElButton, { link: true }, () => '重置密码'),
            [[hasPermi, 'system:user:reset-password']],
          ),
          h(ElButton, { link: true }, () => '分配角色'),
        ],
      },
    })
    await nextTick()
    await flushPromises()

    // 重置密码在整棵组件树（含测量层）中不存在；编辑+分配角色 50+12+70=132 > 100 → k=1（编辑可见）
    expect(wrapper.text()).not.toContain('重置密码')
    expect(wrapper.find('.row-actions > .row-actions__more').exists()).toBe(true)
    const visibleButtons = wrapper.findAll('.row-actions > button')
    expect(visibleButtons.map(b => b.text())).toEqual(['编辑', ''])
  })

  it('插槽含非按钮项（如终态占位 span）时应按普通项处理不崩溃', async () => {
    containerWidth = 400
    const wrapper = mount(RowActions, {
      slots: { default: () => [h(ElButton, { link: true }, () => '编辑'), h('span', null, '终态')] },
    })
    await nextTick()
    await flushPromises()
    expect(wrapper.findAll('.row-actions > button').map(b => b.text())).toEqual(['编辑'])
    expect(wrapper.find('.row-actions > span').text()).toBe('终态')
    expect(wrapper.find('.row-actions > .row-actions__more').exists()).toBe(false)
  })
})
