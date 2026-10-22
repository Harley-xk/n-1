/*
 * 作者: Harley-xk
 * 创建: 2026-10-22
 *
 * 描述: 操作列按钮动态收纳纯函数——收纳点计算与插槽项展平（设计见 docs/前端/表格组件设计.md §8，单测守护对象）
 */
import type { VNode } from 'vue'
import { Comment, Fragment, Text } from 'vue'

/** 项间水平间距（px），与 RowActions 容器 / 测量层的 flex gap 同源（唯一出处） */
export const ACTION_GAP = 12

/** 收纳点计算的输入（宽度均为 DOM 实测自然宽） */
export interface CollapseMeasure {
  /** 容器可用内容宽 */
  containerWidth: number
  /** 逐项自然宽（DOM 顺序） */
  itemWidths: number[]
  /** 「更多」按钮宽 */
  moreWidth: number
}

/**
 * 求保持可见的头部项数 k：
 * - k === n：全部放下不显示「更多」—— sum(w) + (n-1)*gap ≤ W
 * - 0 < k < n：k 项 + 「更多」—— sum(w[0..k)) + k*gap + more ≤ W（k 项间 k-1 个 gap + 与更多按钮间 1 个）
 * - k === 0：全部收进「更多」，即便 more 自身放不下也兜底 0（保证唯一入口存在）
 *
 * 降级底线：测量不可用（容器宽 ≤ 0 / more 宽 ≤ 0）一律返回全可见——宁可维持现状也绝不因测量失效藏起按钮
 */
export function computeVisibleCount(measure: CollapseMeasure): number {
  const { containerWidth, itemWidths, moreWidth } = measure
  const n = itemWidths.length
  if (n === 0) {
    return 0
  }
  if (containerWidth <= 0 || moreWidth <= 0) {
    return n
  }
  const widths = itemWidths.map(w => Math.floor(w))
  const more = Math.floor(moreWidth)
  const floor = Math.floor(containerWidth)

  // 全放下：k = n，不渲染「更多」
  if (sumWidths(widths, n) + (n - 1) * ACTION_GAP <= floor) {
    return n
  }
  // 部分收纳：自 k = n-1 递减取首个满足者（k=0 即 more ≤ W 的全收纳分支）
  for (let k = n - 1; k >= 0; k--) {
    const headWidth = k === 0 ? 0 : sumWidths(widths, k) + k * ACTION_GAP
    if (headWidth + more <= floor) {
      return k
    }
  }
  return 0
}

/** 前 count 项宽度和（含项间 gap 计数 count-1 个由调用方另行叠加，此处只累加宽度） */
function sumWidths(widths: number[], count: number): number {
  let total = 0
  for (let i = 0; i < count; i++) {
    total += widths[i]
  }
  return total
}

/**
 * 展平插槽 VNode 为「项」数组：解 Fragment（template v-if 编译产物，递归展平）、
 * 滤注释节点（v-if 假值分支）与空白文本节点，剩余每个 VNode 即一个可收纳项
 * （el-button / 终态 span / el-tooltip 包裹 / el-dropdown 均按普通项统一处理）
 */
export function flattenSlotItems(vnodes: VNode[] | undefined): VNode[] {
  if (!vnodes) {
    return []
  }
  const items: VNode[] = []
  for (const vnode of vnodes) {
    if (!vnode) {
      continue
    }
    if (vnode.type === Comment) {
      continue
    }
    if (vnode.type === Text) {
      // 空白文本节点不参与（编译器 condense 模式已去除大部分，此处兜底）
      if (typeof vnode.children === 'string' && vnode.children.trim() === '') {
        continue
      }
      items.push(vnode)
      continue
    }
    if (vnode.type === Fragment) {
      items.push(...flattenSlotItems(vnode.children as VNode[]))
      continue
    }
    items.push(vnode)
  }
  return items
}
