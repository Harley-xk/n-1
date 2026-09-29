<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 侧栏（白卡片，独立于画布）：静态路由生成的菜单递归渲染 + 底部扩展槽 + 收起开关，收起 / 展开随 app store 生效态
-->
<template>
  <aside class="n1-sidebar" :class="{ collapsed: app.effectiveSidebarCollapsed }">
    <el-scrollbar class="n1-sidebar-scroll">
      <el-menu
        :default-active="route.path"
        :collapse="app.effectiveSidebarCollapsed"
        :collapse-transition="false"
        router
        unique-opened
      >
        <SideMenuItem :menus="menus" />
      </el-menu>
    </el-scrollbar>
    <div class="n1-sidebar-bottom">
      <SlotRenderer :name="SLOT_KEYS.layoutSidebarBottom" />
      <div
        class="n1-sidebar-collapse"
        :title="app.effectiveSidebarCollapsed ? '展开侧栏' : '收起侧栏'"
        @click="app.toggleSidebar()"
      >
        <el-icon :size="18">
          <Expand v-if="app.effectiveSidebarCollapsed" />
          <Fold v-else />
        </el-icon>
        <span v-if="!app.effectiveSidebarCollapsed">收起侧栏</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Expand, Fold } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { SLOT_KEYS } from '@/framework/slots/keys'
import SlotRenderer from '@/framework/slots/SlotRenderer.vue'
import { layoutChildren } from '@/router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { buildMenuTree } from '@/utils/menu'

import SideMenuItem from './SideMenuItem.vue'

const route = useRoute()
const app = useAppStore()
const auth = useAuthStore()

/** 侧栏菜单：Layout 静态子路由树生成并按权限过滤（ADR-001；判定传入 store 方法以响应权限集合变更） */
const menus = computed(() => buildMenuTree(layoutChildren, '/', permission => auth.hasPermission(permission)))
</script>

<style scoped>
/* 侧栏白卡片：独立定界（与 n-2 的透明悬浮形态区分） */
.n1-sidebar {
  width: var(--n1-sidebar-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--n1-card-bg);
  border: 1px solid var(--n1-card-border);
  border-radius: var(--n1-radius);
  box-shadow: var(--n1-card-shadow);
  transition: width 0.2s;
  overflow: hidden;
}

.n1-sidebar.collapsed {
  width: var(--n1-sidebar-width-collapsed);
}

.n1-sidebar-scroll {
  flex: 1;
  /* 菜单区左右留白（卡片内边距） */
  padding: 8px;
}

.n1-sidebar.collapsed .n1-sidebar-scroll {
  padding: 8px 4px;
}

/* 收起态下菜单项水平居中（仅剩图标，去掉层级缩进 padding）。
   一级叶子项的图标外层是 EP 的 tooltip trigger 包裹层（占满整项），须连同内层一起居中 */
.n1-sidebar.collapsed :deep(.el-menu) {
  width: 100%;
}

.n1-sidebar.collapsed :deep(.el-menu--collapse .el-menu-item),
.n1-sidebar.collapsed :deep(.el-menu--collapse .el-sub-menu__title) {
  padding: 0;
  justify-content: center;
}

.n1-sidebar.collapsed :deep(.el-menu--collapse .el-menu-item .el-menu-tooltip__trigger) {
  justify-content: center;
}

.n1-sidebar-bottom {
  flex-shrink: 0;
  /* 与菜单区左右留白对齐 */
  padding: 4px 12px 12px;
}

.n1-sidebar.collapsed .n1-sidebar-bottom {
  padding: 4px 8px 12px;
}

/* 收起开关：与菜单项同规格的行按钮（hover 浅底圆角） */
.n1-sidebar-collapse {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border-radius: 6px;
  color: var(--n1-text-2);
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.n1-sidebar-collapse:hover {
  background: var(--n1-fill-hover);
  color: var(--n1-color-primary);
}

.n1-sidebar.collapsed .n1-sidebar-collapse {
  justify-content: center;
  padding: 0;
}
</style>
