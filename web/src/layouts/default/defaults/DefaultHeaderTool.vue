<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 顶栏工具区默认组件（layout:header-tool 槽位兜底）：主题切换（浅色 / 深色 / 跟随系统）
-->
<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <span class="n1-tool-btn" title="主题设置">
      <el-icon :size="16">
        <Brush />
      </el-icon>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="light" :icon="app.theme === 'light' ? Check : undefined">
          浅色
        </el-dropdown-item>
        <el-dropdown-item command="dark" :icon="app.theme === 'dark' ? Check : undefined">
          深色
        </el-dropdown-item>
        <el-dropdown-item command="auto" :icon="app.theme === 'auto' ? Check : undefined">
          跟随系统
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { Brush, Check } from '@element-plus/icons-vue'

import { useAppStore } from '@/stores/app'
import type { ThemeMode } from '@/stores/app'

const app = useAppStore()

function handleCommand(command: string | number | object): void {
  app.setTheme(command as ThemeMode)
}
</script>

<style scoped>
.n1-tool-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--n1-text-2);
  cursor: pointer;
  outline: none;
  transition: background-color 0.2s;
}

.n1-tool-btn:hover {
  background: var(--n1-fill-hover);
  color: var(--n1-color-primary);
}
</style>
