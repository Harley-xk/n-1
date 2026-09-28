<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 侧边菜单递归项：目录渲染子菜单、菜单渲染叶子项（MenuNode 树来自 Layout 静态路由转换，path 均为绝对路径）
-->
<template>
  <template v-for="menu in menus" :key="menu.path">
    <el-sub-menu v-if="hasChildren(menu)" :index="menu.path">
      <template #title>
        <el-icon>
          <component :is="resolveMenuIcon(menu.icon)" />
        </el-icon>
        <span>{{ menu.title }}</span>
      </template>
      <SideMenuItem :menus="menu.children" />
    </el-sub-menu>

    <el-menu-item v-else :index="menu.path">
      <el-icon>
        <component :is="resolveMenuIcon(menu.icon)" />
      </el-icon>
      <template #title>
        {{ menu.title }}
      </template>
    </el-menu-item>
  </template>
</template>

<script setup lang="ts">
import type { MenuNode } from '@/utils/menu'
import { resolveMenuIcon } from '@/utils/menu-icon'

defineProps<{
  /** 本层菜单列表（path 均为绝对路径） */
  menus: MenuNode[]
}>()

function hasChildren(menu: MenuNode): boolean {
  return menu.children.length > 0
}
</script>
