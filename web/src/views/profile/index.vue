<!--
  作者: Harley-xk
  创建: 2026-10-22

  描述: 个人中心页（hidden 路由，顶栏下拉与直链可达）：基本信息展示 + 修改密码（验旧设新，成功后强制重新登录）
-->
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { changePasswordApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

// name 多词（对齐 SystemUser 惯例）；hidden 路由不参与 keep-alive，但仍遵守路由 name ↔ 页面 name 对齐契约
defineOptions({ name: 'ProfileCenter' })

const router = useRouter()
const auth = useAuthStore()

const formRef = ref<FormInstance>()

/** 修改密码表单：原密码 / 新密码 / 确认新密码 */
const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const loading = ref(false)

/** 表单校验：必填、6-32 位、两次一致（与服务端 DTO 约束对齐，前端先拦一层） */
const rules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 32, message: '长度 6 到 32 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== form.newPassword)
          callback(new Error('两次输入的密码不一致'))
        else
          callback()
      },
      trigger: 'blur',
    },
  ],
}

/** 提交改密：成功后清令牌重新登录（当前会话立即失效；业务失败提示由 http 层统一弹出） */
async function handleChangePassword(): Promise<void> {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid)
    return
  loading.value = true
  try {
    await changePasswordApi({ oldPassword: form.oldPassword, newPassword: form.newPassword })
    ElMessage.success('密码已修改，请重新登录')
    await auth.logout()
    await router.push('/login')
  }
  catch {
    // 业务错误提示已由 http 层弹出，停留本页修正后重试
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <el-card>
      <template #header>
        基本信息
      </template>
      <el-descriptions :column="3">
        <el-descriptions-item label="登录账号">
          {{ auth.user?.username ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="用户昵称">
          {{ auth.user?.nickname ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="角色">
          <template v-if="auth.roles.length > 0">
            <el-tag
              v-for="role in auth.roles"
              :key="role"
              size="small"
              class="role-tag"
            >
              {{ role }}
            </el-tag>
          </template>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card>
      <template #header>
        修改密码
      </template>
      <el-form
        ref="formRef"
        class="password-form"
        :model="form"
        :rules="rules"
        label-width="90px"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="form.oldPassword"
            type="password"
            placeholder="请输入原密码"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            placeholder="请输入新密码（6-32 位）"
            show-password
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            autocomplete="new-password"
            @keyup.enter="handleChangePassword"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleChangePassword">
            保存并重新登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.password-form {
  max-width: 480px;
}

.role-tag {
  margin-right: 6px;
}
</style>
