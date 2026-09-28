<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 用户分配角色弹窗：启用角色多选勾选（打开时回显已分配集合，保存为目标全集差集绑定）
-->
<template>
  <el-dialog
    v-model="visible"
    :title="`分配角色 - ${user?.nickname ?? ''}`"
    width="440px"
    :close-on-click-modal="false"
  >
    <el-checkbox-group v-model="checkedRoleIds" v-loading="loading">
      <el-checkbox v-for="role in roles" :key="role.id" :value="role.id">
        {{ role.name }}（{{ role.code }}）
      </el-checkbox>
    </el-checkbox-group>
    <el-empty v-if="!loading && roles.length === 0" description="暂无启用的角色" :image-size="60" />
    <template #footer>
      <el-button @click="visible = false">
        取消
      </el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref } from 'vue'

import type { RoleVO } from '@/api/system/role'
import { getEnabledRoleList } from '@/api/system/role'
import { assignUserRoles, getUserRoleIds } from '@/api/system/user'
import type { UserVO } from '@/api/system/user'

const visible = ref(false)
const loading = ref(false)
const submitting = ref(false)

const user = ref<UserVO | null>(null)
const roles = ref<RoleVO[]>([])
const checkedRoleIds = ref<string[]>([])

/** 打开弹窗：拉取启用角色全集 + 该用户已分配集合（回显） */
async function open(target: UserVO): Promise<void> {
  user.value = target
  visible.value = true
  loading.value = true
  checkedRoleIds.value = []
  try {
    const [roleList, assigned] = await Promise.all([
      getEnabledRoleList(),
      getUserRoleIds(target.id),
    ])
    roles.value = roleList
    checkedRoleIds.value = assigned
  }
  finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (!user.value) {
    return
  }
  submitting.value = true
  try {
    await assignUserRoles(user.value.id, checkedRoleIds.value)
    ElMessage.success('分配成功')
    visible.value = false
  }
  finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>
