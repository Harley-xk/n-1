<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 顶栏（一整条，透明浮于画布）：品牌槽 + 工具槽 + 用户槽；侧栏收起开关在侧栏底部
-->
<template>
  <header class="n1-header">
    <div class="n1-header-left">
      <SlotRenderer :name="SLOT_KEYS.layoutLogo" :fallback="DefaultLogo" />
    </div>
    <div class="n1-header-right">
      <SlotRenderer :name="SLOT_KEYS.layoutHeaderTool" :fallback="DefaultHeaderTool" />
      <SlotRenderer :name="SLOT_KEYS.layoutHeaderUser" :fallback="DefaultUserDropdown" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { SLOT_KEYS } from '@/framework/slots/keys'
import SlotRenderer from '@/framework/slots/SlotRenderer.vue'

import DefaultHeaderTool from '../defaults/DefaultHeaderTool.vue'
import DefaultLogo from '../defaults/DefaultLogo.vue'
import DefaultUserDropdown from '../defaults/DefaultUserDropdown.vue'
</script>

<style scoped>
.n1-header {
  height: var(--n1-header-height);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 透明浮于画布 */
  background: transparent;
}

.n1-header-left {
  margin-left: 8px;
  display: flex;
  align-items: center;
  min-width: 0;
}

.n1-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
