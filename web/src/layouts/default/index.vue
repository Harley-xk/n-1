<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 主布局（见 docs/前端/布局与风格设计.md §2）：浅灰画布 + 透明顶栏一整条 / 白卡片侧栏 + 白底标签栏 + 连体白卡片内容区
-->
<template>
  <div class="n1-app-wrapper">
    <LayoutHeader />
    <div class="n1-main-container">
      <LayoutSidebar />
      <div class="n1-content-layout">
        <TagsBar />
        <div class="n1-content-card">
          <el-scrollbar class="n1-content-scrollbar">
            <RouterView v-slot="{ Component, route: currentRoute }">
              <KeepAlive :include="tagsView.cachedNames">
                <component :is="Component" :key="currentRoute.fullPath" />
              </KeepAlive>
            </RouterView>
          </el-scrollbar>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTagsViewStore } from '@/stores/tags-view'

import LayoutHeader from './components/LayoutHeader.vue'
import LayoutSidebar from './components/LayoutSidebar.vue'
import TagsBar from './components/TagsBar.vue'

const tagsView = useTagsViewStore()
</script>

<style scoped>
.n1-app-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.n1-main-container {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}

.n1-content-layout {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 内容白卡片：唯一滚动容器（el-scrollbar 内滚），与标签栏拼为一张视觉卡片 */
.n1-content-card {
  flex: 1;
  min-height: 0;
  background: var(--n1-card-bg);
  border: 1px solid var(--n1-card-border);
  border-top: none;
  border-radius: 0 0 var(--n1-radius) var(--n1-radius);
  box-shadow: var(--n1-card-shadow);
  overflow: hidden;
}

.n1-content-scrollbar {
  height: 100%;
}
</style>
