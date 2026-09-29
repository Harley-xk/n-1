<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 多标签栏：白底细边框（上圆角与内容卡片连体），圆角块页签（激活主色浅底），右键菜单批量操作，左右扩展槽
-->
<template>
  <div class="n1-tags-bar">
    <SlotRenderer :name="SLOT_KEYS.layoutTagsbarLeft" />
    <div ref="scrollRef" class="n1-tags-scroll" @wheel="onWheel">
      <el-dropdown
        v-for="tab in tagsView.views"
        :key="tab.fullPath"
        trigger="contextmenu"
        @command="(command: string | number | object) => handleContextCommand(String(command), tab)"
      >
        <div
          class="n1-tag"
          :class="{ active: tab.fullPath === route.fullPath }"
          :data-fullpath="tab.fullPath"
          @click="switchTab(tab)"
        >
          <el-icon class="n1-tag-icon">
            <component :is="resolveMenuIcon(tab.icon)" />
          </el-icon>
          <span class="n1-tag-title">{{ tab.title }}</span>
          <el-icon v-if="!tab.affix" class="n1-tag-close" @click.stop="actions.closeTab(tab)">
            <Close />
          </el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="refresh" :disabled="tab.fullPath !== route.fullPath">
              刷新页签
            </el-dropdown-item>
            <el-dropdown-item command="close" :disabled="tab.affix">
              关闭页签
            </el-dropdown-item>
            <el-dropdown-item command="closeOthers" divided>
              关闭其他
            </el-dropdown-item>
            <el-dropdown-item command="closeLeft" :disabled="!hasSideTabs(tab, 'left')">
              关闭左侧
            </el-dropdown-item>
            <el-dropdown-item command="closeRight" :disabled="!hasSideTabs(tab, 'right')">
              关闭右侧
            </el-dropdown-item>
            <el-dropdown-item command="closeAll">
              全部关闭
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <SlotRenderer :name="SLOT_KEYS.layoutTagsbarRight" :fallback="DefaultTagsbarActions" />
  </div>
</template>

<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'
import { nextTick, ref, watch } from 'vue'
import type { LocationQueryRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import { SLOT_KEYS } from '@/framework/slots/keys'
import SlotRenderer from '@/framework/slots/SlotRenderer.vue'
import { useTagsViewStore } from '@/stores/tags-view'
import type { TagView } from '@/stores/tags-view'
import { resolveMenuIcon } from '@/utils/menu-icon'

import { useTagsActions } from '../composables/use-tags-actions'
import DefaultTagsbarActions from '../defaults/DefaultTagsbarActions.vue'

const route = useRoute()
const router = useRouter()
const tagsView = useTagsViewStore()
const actions = useTagsActions()

const scrollRef = ref<HTMLDivElement>()

/** 竖向滚轮转横向滚动（页签条不换行） */
function onWheel(event: WheelEvent): void {
  if (event.deltaY !== 0 && scrollRef.value) {
    scrollRef.value.scrollLeft += event.deltaY
  }
}

function switchTab(tab: TagView): void {
  if (tab.fullPath === route.fullPath) {
    return
  }
  router.push({ path: tab.path, query: tab.query as LocationQueryRaw })
}

/** 锚点签左侧 / 右侧是否还有可关闭页签 */
function hasSideTabs(tab: TagView, side: 'left' | 'right'): boolean {
  const index = tagsView.views.findIndex((view) => view.fullPath === tab.fullPath)
  if (index === -1) {
    return false
  }
  const range = side === 'left' ? tagsView.views.slice(0, index) : tagsView.views.slice(index + 1)
  return range.some((view) => !view.affix)
}

function handleContextCommand(command: string, tab: TagView): void {
  switch (command) {
    case 'refresh':
      void actions.refreshCurrent()
      break
    case 'close':
      actions.closeTab(tab)
      break
    case 'closeOthers':
      actions.closeOthers(tab.fullPath)
      break
    case 'closeLeft':
      actions.closeSide(tab.fullPath, 'left')
      break
    case 'closeRight':
      actions.closeSide(tab.fullPath, 'right')
      break
    case 'closeAll':
      actions.closeAll()
      break
  }
}

/** 激活签变化时滚动到可见区 */
watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    const el = scrollRef.value?.querySelector(`[data-fullpath="${CSS.escape(route.fullPath)}"]`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  },
)
</script>

<style scoped>
/* 标签栏：白底细边框（左右上三边），下边由内容卡片补齐，拼为一张视觉卡片 */
.n1-tags-bar {
  height: var(--n1-tags-bar-height);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--n1-card-bg);
  border: 1px solid var(--n1-card-border);
  border-bottom: none;
  border-radius: var(--n1-radius) var(--n1-radius) 0 0;
  padding: 0 8px;
}

.n1-tags-scroll {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  /* 页签条隐藏滚动条（滚轮横向滚动） */
  scrollbar-width: none;
}

.n1-tags-scroll::-webkit-scrollbar {
  display: none;
}

/* 页签：圆角浅底块（激活主色浅底 + 主色文字） */
.n1-tag {
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  border-radius: var(--n1-radius-small);
  font-size: 12px;
  color: var(--n1-text-2);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.n1-tag:hover {
  background: var(--n1-fill-hover);
  color: var(--n1-color-primary);
}

/* 菜单图标：与侧栏共用语义映射，未激活时弱化 */
.n1-tag-icon {
  font-size: 13px;
  color: var(--n1-text-3);
}

.n1-tag:hover .n1-tag-icon,
.n1-tag.active .n1-tag-icon {
  color: var(--n1-color-primary);
}

.n1-tag.active {
  background: var(--n1-color-primary-bg-light);
  color: var(--n1-color-primary);
  font-weight: 500;
}

.n1-tag-close {
  font-size: 12px;
  border-radius: 50%;
  color: var(--n1-text-3);
}

.n1-tag-close:hover {
  color: var(--n1-text-1);
  background: var(--n1-fill-hover);
}
</style>
