<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 用户新增 / 编辑弹窗：username 编辑禁改、部门树选、岗位多选（编辑数据取自行冗余字段）
-->
<template>
  <el-dialog
    v-model="visible"
    :title="form.id ? '编辑用户' : '新增用户'"
    width="520px"
    :close-on-click-modal="false"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="登录账号" prop="username">
        <el-input
          v-model="form.username"
          placeholder="登录账号（创建后不可修改）"
          maxlength="30"
          :disabled="!!form.id"
        />
      </el-form-item>
      <el-form-item label="用户昵称" prop="nickname">
        <el-input v-model="form.nickname" placeholder="用户昵称" maxlength="30" />
      </el-form-item>
      <el-form-item v-if="!form.id" label="初始密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="留空使用系统初始口令"
          maxlength="32"
          show-password
        />
      </el-form-item>
      <el-form-item label="所属部门" prop="deptId">
        <el-tree-select
          v-model="form.deptId"
          :data="deptTreeOptions"
          :render-after-expand="false"
          check-strictly
          default-expand-all
          node-key="id"
          placeholder="未挂靠"
          clearable
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="岗位" prop="postIds">
        <el-select
          v-model="form.postIds"
          multiple
          placeholder="可多选"
          clearable
          style="width: 100%"
        >
          <el-option v-for="post in posts" :key="post.id" :label="post.name" :value="post.id" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="form.id" label="启用状态">
        <el-switch v-model="form.status" />
      </el-form-item>
    </el-form>
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
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { computed, reactive, ref } from 'vue'

import type { DeptVO } from '@/api/system/dept'
import { getDeptList } from '@/api/system/dept'
import type { PostVO } from '@/api/system/post'
import { getPostList } from '@/api/system/post'
import { createUser, updateUser } from '@/api/system/user'
import type { UserVO } from '@/api/system/user'

const emit = defineEmits<{ saved: [] }>()

const visible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: undefined as string | undefined,
  username: '',
  nickname: '',
  password: '',
  deptId: undefined as string | undefined,
  postIds: [] as string[],
  status: true,
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入用户昵称', trigger: 'blur' }],
}

/** 部门树与岗位全集（弹窗打开时拉取） */
const allDepts = ref<DeptVO[]>([])
const posts = ref<PostVO[]>([])

const deptTreeOptions = computed<TreeOption[]>(() => {
  const childrenOf = (parentId: string | null): TreeOption[] =>
    allDepts.value
      .filter(dept => dept.parentId === parentId)
      .map(dept => ({
        id: dept.id,
        label: dept.name,
        children: childrenOf(dept.id),
      }))
  return childrenOf(null)
})

/** 打开弹窗：编辑态由行数据填充（部门 / 岗位为分页接口的冗余字段） */
async function open(user?: UserVO): Promise<void> {
  visible.value = true
  // 部门与岗位数据并行拉取（失败不阻塞表单）
  getDeptList().then((depts) => {
    allDepts.value = depts
  })
  getPostList().then((list) => {
    posts.value = list
  })
  if (user) {
    form.id = user.id
    form.username = user.username
    form.nickname = user.nickname
    form.deptId = user.deptId ?? undefined
    form.postIds = [...user.postIds]
    form.status = user.status
  }
}

function resetForm(): void {
  formRef.value?.resetFields()
  form.id = undefined
  form.username = ''
  form.nickname = ''
  form.password = ''
  form.deptId = undefined
  form.postIds = []
  form.status = true
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    if (form.id) {
      await updateUser({
        id: form.id,
        nickname: form.nickname,
        status: form.status,
        deptId: form.deptId,
        postIds: form.postIds,
      })
      ElMessage.success('修改成功')
    }
    else {
      await createUser({
        username: form.username,
        nickname: form.nickname,
        password: form.password || undefined,
        deptId: form.deptId,
        postIds: form.postIds,
      })
      ElMessage.success('新增成功')
    }
    visible.value = false
    emit('saved')
  }
  finally {
    submitting.value = false
  }
}

defineExpose({ open })

/** 树选节点 */
interface TreeOption {
  id: string
  label: string
  children: TreeOption[]
}
</script>
