<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 顶栏品牌区默认组件（layout:logo 槽位兜底）：青碧方块标 + 系统名，业务可经槽位注册表替换
-->
<template>
  <div class="n1-logo">
    <span class="n1-logo-mark">N</span>
    <span class="n1-logo-title">n-1 管理系统</span>
  </div>
</template>

<style scoped>
.n1-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.n1-logo-mark {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  /* 纯色主色方块（区别于渐变标），暗色下主色自动提亮 */
  background: var(--n1-color-primary);
}

.n1-logo-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--n1-text-1);
  letter-spacing: 0.5px;
}
</style>
