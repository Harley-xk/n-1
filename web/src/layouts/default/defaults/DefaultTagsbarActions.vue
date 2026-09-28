<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 标签栏右侧默认组件（layout:tagsbar-right 槽位兜底）：刷新当前页 + 快捷关闭下拉
-->
<template>
  <div class="n1-tags-actions">
    <span class="n1-tags-action-btn" title="刷新当前页" @click="actions.refreshCurrent()">
      <el-icon :size="14">
        <RefreshRight />
      </el-icon>
    </span>
    <el-dropdown trigger="click" @command="handleCommand">
      <span class="n1-tags-action-btn" title="快捷关闭">
        <el-icon :size="14">
          <ArrowDown />
        </el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="others">
            关闭其他
          </el-dropdown-item>
          <el-dropdown-item command="all">
            全部关闭
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, RefreshRight } from '@element-plus/icons-vue'

import { useTagsActions } from '../composables/use-tags-actions'

const actions = useTagsActions()

function handleCommand(command: string | number | object): void {
  if (command === 'others') {
    actions.closeOthers()
  } else if (command === 'all') {
    actions.closeAll()
  }
}
</script>

<style scoped>
.n1-tags-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 8px;
  border-left: 1px solid var(--n1-divider);
}

.n1-tags-action-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--n1-text-3);
  cursor: pointer;
  outline: none;
}

.n1-tags-action-btn:hover {
  color: var(--n1-color-primary);
  background: var(--n1-fill-hover);
}
</style>
