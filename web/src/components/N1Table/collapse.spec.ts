import { describe, expect, it } from 'vitest'
import { Comment, Fragment, createTextVNode, h } from 'vue'

import { computeVisibleCount, flattenSlotItems } from './collapse'

describe('computeVisibleCount 收纳点计算', () => {
  it('全部项加间距恰好等于容器宽时应全部可见（≤ 边界，间距 12px）', () => {
    // sum=110 + (n-1)*gap=12 = 122，恰好等于容器宽 → 全可见
    expect(
      computeVisibleCount({ containerWidth: 122, itemWidths: [50, 60], moreWidth: 30 }),
    ).toBe(2)
  })

  it('放不下全部项时应保留最大可容纳的头部项数', () => {
    // 全放下需 204；k=2 需 110+24+30=164 ≤ 170 → k=2
    expect(
      computeVisibleCount({ containerWidth: 170, itemWidths: [50, 60, 70], moreWidth: 30 }),
    ).toBe(2)
  })

  it('仅首项加更多按钮放得下时应保留 1 项', () => {
    // k=1 需 50+12+30=92 ≤ 150；k=2 需 164 > 150 → k=1
    expect(
      computeVisibleCount({ containerWidth: 150, itemWidths: [50, 60, 70], moreWidth: 30 }),
    ).toBe(1)
  })

  it('首项加更多按钮放不下但更多按钮自身放得下时应全收纳（k=0）', () => {
    // 首项 80 > 60；more 30 ≤ 60 → k=0，全部进「更多」
    expect(computeVisibleCount({ containerWidth: 60, itemWidths: [80], moreWidth: 30 })).toBe(0)
  })

  it('容器窄到连更多按钮都放不下时仍应返回 0（兜底唯一入口）', () => {
    expect(computeVisibleCount({ containerWidth: 25, itemWidths: [80, 40], moreWidth: 30 })).toBe(0)
  })

  it('首项超宽时应全收纳且不误返回 1（保持头部项语义）', () => {
    // k=1 需 200+12+30=242 > 100；k=0 需 30 ≤ 100 → 0
    expect(
      computeVisibleCount({ containerWidth: 100, itemWidths: [200, 50], moreWidth: 30 }),
    ).toBe(0)
  })

  it('容器宽不可用时应降级为全可见（绝不因测量失效藏起按钮）', () => {
    expect(computeVisibleCount({ containerWidth: 0, itemWidths: [50, 60], moreWidth: 30 })).toBe(2)
  })

  it('更多按钮宽不可用时应降级为全可见', () => {
    expect(computeVisibleCount({ containerWidth: 150, itemWidths: [50, 60, 70], moreWidth: 0 })).toBe(
      3,
    )
  })

  it('无项时应返回 0', () => {
    expect(computeVisibleCount({ containerWidth: 200, itemWidths: [], moreWidth: 30 })).toBe(0)
  })

  it('宽度与容器宽应向下取整后参与比较（亚像素确定性）', () => {
    // floor 后 50 + 60 + 12 = 122 ≤ floor(122.9)=122 → 全可见
    expect(
      computeVisibleCount({
        containerWidth: 122.9,
        itemWidths: [50.5, 60.7],
        moreWidth: 30.2,
      }),
    ).toBe(2)
  })
})

describe('flattenSlotItems 插槽项展平', () => {
  it('应滤除注释节点（v-if 假值分支）与空白文本节点', () => {
    const button = h('button', null, '编辑')
    const vnodes = [h(Comment, null, 'v-if'), createTextVNode('   '), button]
    const items = flattenSlotItems(vnodes)
    expect(items).toHaveLength(1)
    expect(items[0]).toBe(button)
  })

  it('应递归展平 Fragment（template v-if 编译产物）并保持顺序', () => {
    const editButton = h('button', null, '编辑')
    const deleteButton = h('button', null, '删除')
    const items = flattenSlotItems([
      editButton,
      h(Fragment, null, [deleteButton, h(Fragment, null, [])]),
    ])
    expect(items).toHaveLength(2)
    expect(items[0]).toBe(editButton)
    expect(items[1]).toBe(deleteButton)
  })

  it('空入参应返回空数组', () => {
    expect(flattenSlotItems(undefined)).toEqual([])
  })
})
