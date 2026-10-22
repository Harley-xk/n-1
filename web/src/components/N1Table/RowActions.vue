<!--
  作者: Harley-xk
  创建: 2026-10-22

  描述: 表格操作列按钮动态收纳——测量层双渲染 + MoreFilled 更多按钮 + el-popover 弹出隐藏项
  （设计见 docs/前端/表格组件设计.md §8）
  说明：插槽 VNode 需两次独立调用并分片（测量层 / 可见区），模板语法无法表达，
  故采用 defineComponent + setup 返回 render 的组合式形态（对 script setup 的唯一偏离）
-->
<script lang="ts">
import { MoreFilled } from '@element-plus/icons-vue'
import { ElButton, ElIcon, ElPopover } from 'element-plus'
import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import type { VNode } from 'vue'

import { ACTION_GAP, computeVisibleCount, flattenSlotItems } from './collapse'

/**
 * 用法：包裹操作列按钮组，容器放不下的尾部项自动收进「更多」按钮（MoreFilled 图标），
 * 点击经 popover 弹出。由 N1Table 对 field === 'action' 的插槽列自动包裹，业务不直接使用
 */
export default defineComponent({
  name: 'RowActions',
  setup(_, { slots }) {
    // 初值 = 全可见降级（测量异常时绝不藏按钮）；首测在 onMounted 同步执行
    const visibleCount = ref(Number.MAX_SAFE_INTEGER)
    const rootEl = ref<HTMLElement>()
    const layerEl = ref<HTMLElement>()
    // ElPopover 非受控（trigger: 'click' 自管开合——受控会禁用 trigger 事件），
    // 点击列表内项后经 expose 的 hide() 程序关闭
    const popoverRef = ref<{ hide: () => void }>()
    let observer: ResizeObserver | undefined

    /** 「更多」按钮：可见区（popover reference）与测量层（宽度副本）共用同一工厂 */
    function renderMore(): VNode {
      return h(
        ElButton,
        { link: true, type: 'primary', class: 'row-actions__more', 'aria-label': '更多操作' },
        () => [h(ElIcon, null, () => [h(MoreFilled)])],
      )
    }

    /**
     * 实测重算收纳点：测量层子元素 = 有效项 + 末尾「更多」副本（无权限项已被 v-hasPermi
     * 在 patch 期移除，天然不参与计数）。同值不写 ref——measure 幂等，避免 RO 回调循环
     */
    function measure(): void {
      const root = rootEl.value
      const layer = layerEl.value
      if (!root || !layer) {
        return
      }
      const children = Array.from(layer.children) as HTMLElement[]
      if (children.length === 0) {
        return
      }
      const itemWidths = children.slice(0, -1).map(el => el.offsetWidth)
      const moreWidth = children[children.length - 1].offsetWidth
      const next = computeVisibleCount({ containerWidth: root.clientWidth, itemWidths, moreWidth })
      if (next !== visibleCount.value) {
        visibleCount.value = next
      }
    }

    onMounted(() => {
      // 同步首测：RO 首次回调在 paint 之后才派发，纯靠 RO 会闪一帧未收纳状态；
      // mounted 中改 ref 由调度器在同一微任务循环内消化，重渲染于 paint 前闭合
      measure()
      observer = new ResizeObserver(() => measure())
      // 容器宽：列宽拖拽 / 窗口缩放 / 侧栏折叠；层宽：按钮集合 / 文字 / 字体加载变化
      observer.observe(rootEl.value!)
      observer.observe(layerEl.value!)
    })

    onBeforeUnmount(() => observer?.disconnect())

    return () => {
      const layerItems = flattenSlotItems(slots.default?.())
      const items = flattenSlotItems(slots.default?.())
      const n = items.length
      const k = Math.min(visibleCount.value, n)

      const children: VNode[] = [
        // 隐形测量层：slots.default() 第一次调用，全量项 + 「更多」宽度副本
        h(
          'div',
          { ref: layerEl, class: 'row-actions__layer', style: { gap: `${ACTION_GAP}px` } },
          [...layerItems, renderMore()],
        ),
        // 可见区：第二次调用（全新 VNode）的头片，与 popover 尾片不相交
        ...items.slice(0, k),
      ]

      if (k < n) {
        children.push(
          h(
            ElPopover,
            {
              ref: popoverRef,
              trigger: 'click',
              persistent: false,
              width: 'auto',
              popperClass: 'n1-row-actions-pop',
            },
            {
              reference: () => renderMore(),
              default: () =>
                // 事件委托：点击列表内任一项（含其冒泡）后统一关闭 popover
                h(
                  'div',
                  {
                    class: 'n1-row-actions-pop__list',
                    onClick: () => {
                      popoverRef.value?.hide()
                    },
                  },
                  items.slice(k),
                ),
            },
          ),
        )
      }

      return h(
        'div',
        {
          ref: rootEl,
          class: 'row-actions',
          style: { gap: `${ACTION_GAP}px`, whiteSpace: 'nowrap' },
        },
        children,
      )
    }
  },
})
</script>

<style scoped>
/* 容器：flex:1 + min-width:0 在 vxe cell 的 flex 行内占满可用宽，溢出裁剪不撑列 */
.row-actions {
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

/* 间距归一：项间水平距离统一由内联 flex gap（ACTION_GAP 常量唯一出处）承担，归零 EP 兄弟 margin
   （span 包裹场景该 margin 本就不生效，顺带修复其按钮间距） */
.row-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

/* 隐形测量层：常驻 DOM 供宽度实测（visibility hidden 不入无障碍树但保持布局）；
   width: max-content 防止 absolute 收缩被容器宽钳制——RO 须感知内容自然宽的任何变化 */
.row-actions__layer {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  visibility: hidden;
  pointer-events: none;
  width: max-content;
}
</style>

<style>
/* popover 内容 teleport 到 body（scoped 够不着），用 n1 前缀全局类（对齐 N1_* 键命名惯例）；
   着色走 EP 内置变量，暗色由 dark/css-vars.css 自动翻转 */
.n1-row-actions-pop__list {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-width: 96px;
}

.n1-row-actions-pop__list .el-button {
  margin: 0;
  width: 100%;
  justify-content: flex-start;
}
</style>
