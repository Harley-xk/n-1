<!--
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 404 兜底视图：路由未匹配时展示，并提供返回首页入口
-->
<script setup lang="ts">
  import { useRouter } from 'vue-router'

  const router = useRouter()
</script>

<template>
  <div class="not-found">
    <el-result
      icon="warning"
      title="404"
      sub-title="页面不存在或已被移除"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="router.push('/')"
        >
          返回首页
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f7fa;
}
</style>
