<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 字典类型新增 / 编辑弹窗：名称 / 类型标识（变更级联数据归属）/ 状态 / 备注
-->
<template>
  <el-dialog
    v-model="visible"
    :title="form.id ? '编辑字典类型' : '新增字典类型'"
    width="480px"
    :close-on-click-modal="false"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="字典名称" prop="name">
        <el-input v-model="form.name" placeholder="如 通用状态" maxlength="50" />
      </el-form-item>
      <el-form-item label="类型标识" prop="type">
        <el-input v-model="form.type" placeholder="如 common_status" maxlength="100" />
        <span v-if="form.id" class="form-tip">变更类型标识将级联修改其下数据的归属</span>
      </el-form-item>
      <el-form-item label="启用状态">
        <el-switch v-model="form.status" />
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

import type { DictTypeVO } from '@/api/system/dict'
import { createDictType, updateDictType } from '@/api/system/dict'

const emit = defineEmits<{ saved: [] }>()

const visible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: undefined as string | undefined,
  name: '',
  type: '',
  status: true,
  remark: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  type: [{ required: true, message: '请输入类型标识', trigger: 'blur' }],
}

/** 打开弹窗：编辑态由行数据填充 */
function open(dictType?: DictTypeVO): void {
  visible.value = true
  if (dictType) {
    form.id = dictType.id
    form.name = dictType.name
    form.type = dictType.type
    form.status = dictType.status
    form.remark = dictType.remark ?? ''
  }
}

function resetForm(): void {
  formRef.value?.resetFields()
  form.id = undefined
  form.name = ''
  form.type = ''
  form.status = true
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
      await updateDictType({
        id: form.id,
        name: form.name,
        type: form.type,
        status: form.status,
        remark: form.remark || undefined,
      })
      ElMessage.success('修改成功')
    }
    else {
      await createDictType({
        name: form.name,
        type: form.type,
        status: form.status,
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
  display: block;
  font-size: 12px;
  line-height: 1.4;
  margin-top: 4px;
}
</style>
