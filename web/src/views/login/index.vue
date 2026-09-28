<!--
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 登录页（根级路由，不进主布局）：账号口令登录，redirect 参数回带；青碧卡片浮起视觉（--n1-* token）
 * 文案契约（浏览器 e2e 依赖）：placeholder「请输入登录账号 / 请输入登录密码」、按钮「登 录」
-->
<script setup lang="ts">
import { Lock, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

defineOptions({ name: 'Login' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  username: '',
  password: '',
})

const loading = ref(false)

/** 登录：成功后回带 redirect 跳转（守卫将在此后的首次导航拉取权限信息） */
async function handleLogin(): Promise<void> {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入登录账号与登录密码')
    return
  }
  loading.value = true
  try {
    await auth.login(form.username, form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect)
  }
  catch {
    // 失败提示已由 http 层统一弹出（携带后端业务 message），此处仅停留登录页
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <main class="login-card">
      <header class="login-brand">
        <span class="login-logo">n1</span>
        <h1 class="login-title">
          n-1
        </h1>
        <p class="login-subtitle">
          企业级全栈项目框架底座
        </p>
      </header>

      <form class="login-form" @submit.prevent="handleLogin">
        <el-input
          v-model="form.username"
          size="large"
          name="username"
          placeholder="请输入登录账号"
          :prefix-icon="User"
          autocomplete="username"
        />
        <el-input
          v-model="form.password"
          size="large"
          type="password"
          name="password"
          placeholder="请输入登录密码"
          :prefix-icon="Lock"
          show-password
          autocomplete="current-password"
          @keyup.enter="handleLogin"
        />
        <el-button
          type="primary"
          size="large"
          class="login-submit"
          :loading="loading"
          native-type="submit"
        >
          登 录
        </el-button>
      </form>
    </main>

    <footer class="login-footer">
      <p>种子账号：admin / admin123</p>
    </footer>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  /* 画布底色由全局 body 提供，此处仅留白 */
}

/* 中央白卡片：青碧卡片浮起（白底 + 1px 边框 + 10px 圆角 + 阴影） */
.login-card {
  width: 380px;
  max-width: calc(100vw - 32px);
  padding: 36px 32px 32px;
  background: var(--n1-card-bg);
  border: 1px solid var(--n1-card-border);
  border-radius: var(--n1-radius);
  box-shadow: var(--n1-card-shadow);
}

.login-brand {
  text-align: center;
  margin-bottom: 28px;
}

/* 品牌字标：主色底白字 */
.login-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  background: var(--n1-color-primary);
}

.login-title {
  margin: 12px 0 0;
  font-size: 22px;
  color: var(--n1-text-1);
}

.login-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--n1-text-3);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-submit {
  margin-top: 4px;
  width: 100%;
}

.login-footer {
  font-size: 13px;
  color: var(--n1-text-3);
  text-align: center;
}

.login-footer p {
  margin: 0;
}
</style>
