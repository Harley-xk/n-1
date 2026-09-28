<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 字典数据新增 / 编辑弹窗：标签 / 键值（同类型唯一）/ 排序 / 状态 / 标签配色
-->
<template>
  <el-dialog
    v-model="visible"
    :title="form.id ? '编辑字典数据' : '新增字典数据'"
    width="480px"
    :close-on-click-modal="false"
    append-to-body
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="数据标签" prop="label">
        <el-input v-model="form.label" placeholder="如 启用" maxlength="100" />
      </el-form-item>
      <el-form-item label="数据键值" prop="dictValue">
        <el-input v-model="form.dictValue" placeholder="如 true" maxlength="100" />
      </el-form-item>
      <el-form-item label="显示排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="标签配色" prop="colorType">
        <el-select v-model="form.colorType" placeholder="默认 info" clearable style="width: 160px">
          <el-option v-for="color in COLOR_OPTIONS" :key="color.value" :label="color.label" :value="color.value">
            <el-tag :type="color.value" size="small">
              {{ color.label }}
            </el-tag>
          </el-option>
        </el-select>
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

import type { DictDataVO } from '@/api/system/dict'
import { createDictData, updateDictData } from '@/api/system/dict'

/** 标签配色候选（el-tag type 语义色） */
const COLOR_OPTIONS = [
  { label: 'primary', value: 'primary' },
  { label: 'success', value: 'success' },
  { label: 'warning', value: 'warning' },
  { label: 'danger', value: 'danger' },
  { label: 'info', value: 'info' },
]

const emit = defineEmits<{ saved: [] }>()

const visible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: undefined as string | undefined,
  /** 所属类型标识（创建必传，由抽屉上下文注入） */
  dictType: '',
  label: '',
  dictValue: '',
  sort: 0,
  colorType: undefined as string | undefined,
  status: true,
  remark: '',
})

const rules: FormRules = {
  label: [{ required: true, message: '请输入数据标签', trigger: 'blur' }],
  dictValue: [{ required: true, message: '请输入数据键值', trigger: 'blur' }],
}

/** 打开弹窗：类型上下文注入 + 编辑态由行数据填充 */
function open(dictType: string, data?: DictDataVO): void {
  visible.value = true
  form.dictType = dictType
  if (data) {
    form.id = data.id
    form.label = data.label
    form.dictValue = data.dictValue
    form.sort = data.sort
    form.colorType = data.colorType ?? undefined
    form.status = data.status
    form.remark = data.remark ?? ''
  }
}

function resetForm(): void {
  formRef.value?.resetFields()
  form.id = undefined
  form.dictType = ''
  form.label = ''
  form.dictValue = ''
  form.sort = 0
  form.colorType = undefined
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
      await updateDictData({
        id: form.id,
        label: form.label,
        dictValue: form.dictValue,
        sort: form.sort,
        colorType: form.colorType,
        status: form.status,
        remark: form.remark || undefined,
      })
      ElMessage.success('修改成功')
    }
    else {
      await createDictData({
        dictType: form.dictType,
        label: form.label,
        dictValue: form.dictValue,
        sort: form.sort,
        colorType: form.colorType,
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
