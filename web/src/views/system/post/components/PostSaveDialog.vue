<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 岗位新增 / 编辑弹窗：编码、名称、排序与启用状态
-->
<template>
  <el-dialog
    v-model="visible"
    :title="form.id ? '编辑岗位' : '新增岗位'"
    width="480px"
    :close-on-click-modal="false"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="岗位编码" prop="code">
        <el-input v-model="form.code" placeholder="如 se / hr" maxlength="50" />
      </el-form-item>
      <el-form-item label="岗位名称" prop="name">
        <el-input v-model="form.name" placeholder="岗位名称" maxlength="50" />
      </el-form-item>
      <el-form-item label="显示排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="启用状态">
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
import { reactive, ref } from 'vue'

import type { PostVO } from '@/api/system/post'
import { createPost, updatePost } from '@/api/system/post'

const emit = defineEmits<{ saved: [] }>()

const visible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: undefined as string | undefined,
  code: '',
  name: '',
  sort: 0,
  status: true,
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入岗位编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
}

/** 打开弹窗：编辑态由行数据填充 */
function open(post?: PostVO): void {
  visible.value = true
  if (post) {
    form.id = post.id
    form.code = post.code
    form.name = post.name
    form.sort = post.sort
    form.status = post.status
  }
}

function resetForm(): void {
  formRef.value?.resetFields()
  form.id = undefined
  form.code = ''
  form.name = ''
  form.sort = 0
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
      await updatePost({
        id: form.id,
        code: form.code,
        name: form.name,
        sort: form.sort,
        status: form.status,
      })
      ElMessage.success('修改成功')
    }
    else {
      await createPost({
        code: form.code,
        name: form.name,
        sort: form.sort,
        status: form.status,
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
</script>
