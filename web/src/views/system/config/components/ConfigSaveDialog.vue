<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 参数新增 / 编辑弹窗：分类 / 名称 / 键值与明文展示开关
-->
<template>
  <el-dialog
    v-model="visible"
    :title="form.id ? '编辑参数' : '新增参数'"
    width="520px"
    :close-on-click-modal="false"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="参数分类" prop="category">
        <el-input v-model="form.category" placeholder="如 system" maxlength="50" />
      </el-form-item>
      <el-form-item label="参数名称" prop="name">
        <el-input v-model="form.name" placeholder="参数名称" maxlength="100" />
      </el-form-item>
      <el-form-item label="参数键名" prop="configKey">
        <el-input v-model="form.configKey" placeholder="如 system.user.init-password" maxlength="100" />
      </el-form-item>
      <el-form-item label="参数键值" prop="configValue">
        <el-input
          v-model="form.configValue"
          type="textarea"
          :rows="3"
          placeholder="参数值"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="明文展示">
        <el-switch v-model="form.visible" />
        <span class="form-tip">关闭后列表侧打码为 ******（编辑仍可修改）</span>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="2"
          placeholder="备注"
          maxlength="500"
        />
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

import type { ConfigVO } from '@/api/system/config'
import { createConfig, updateConfig } from '@/api/system/config'

const emit = defineEmits<{ saved: [] }>()

const visible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: undefined as string | undefined,
  category: '',
  name: '',
  configKey: '',
  configValue: '',
  visible: true,
  remark: '',
})

const rules: FormRules = {
  category: [{ required: true, message: '请输入参数分类', trigger: 'blur' }],
  name: [{ required: true, message: '请输入参数名称', trigger: 'blur' }],
  configKey: [{ required: true, message: '请输入参数键名', trigger: 'blur' }],
  configValue: [{ required: true, message: '请输入参数键值', trigger: 'blur' }],
}

/** 打开弹窗：编辑态由行数据填充（打码参数在编辑态可见原值） */
function open(config?: ConfigVO): void {
  visible.value = true
  if (config) {
    form.id = config.id
    form.category = config.category
    form.name = config.name
    form.configKey = config.configKey
    form.configValue = config.configValue
    form.visible = config.visible
    form.remark = config.remark ?? ''
  }
}

function resetForm(): void {
  formRef.value?.resetFields()
  form.id = undefined
  form.category = ''
  form.name = ''
  form.configKey = ''
  form.configValue = ''
  form.visible = true
  form.remark = ''
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    if (form.id) {
      await updateConfig({
        id: form.id,
        category: form.category,
        name: form.name,
        configKey: form.configKey,
        configValue: form.configValue,
        visible: form.visible,
        remark: form.remark || undefined,
      })
      ElMessage.success('修改成功')
    }
    else {
      await createConfig({
        category: form.category,
        name: form.name,
        configKey: form.configKey,
        configValue: form.configValue,
        visible: form.visible,
        remark: form.remark || undefined,
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

<style scoped>
.form-tip {
  color: var(--n1-text-color-secondary);
  font-size: 12px;
  margin-left: 8px;
}
</style>
