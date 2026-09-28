<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 顶栏用户区默认组件（layout:header-user 槽位兜底）：访客展示（批次四接认证后升级为用户昵称下拉 + 退出登录）
   契约：根元素保留 .user-entry 类（登录链路 e2e 选择器依赖）
-->
<template>
  <span class="user-entry">
    <span class="n1-avatar">客</span>
    <span class="n1-user-name">访客</span>
  </span>
</template>

<style scoped>
.user-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 10px 3px 3px;
  border-radius: 18px;
  cursor: default;
}

.n1-avatar {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--n1-color-primary);
}

.n1-user-name {
  font-size: 13px;
  color: var(--n1-text-1);
}
</style>
