<!--
  作者: Harley-xk
  创建: 2026-09-29

  描述: 商品新增 / 编辑弹窗：名称、分类（字典下拉）、金额（两位小数）、状态与描述
-->
<template>
  <el-dialog
    v-model="visible"
    :title="form.id ? '编辑商品' : '新增商品'"
    width="520px"
    :close-on-click-modal="false"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="商品名称" prop="name">
        <el-input v-model="form.name" placeholder="商品名称" maxlength="100" />
      </el-form-item>
      <el-form-item label="商品分类" prop="category">
        <DictSelect
          v-model="form.category"
          type="demo_product_category"
          placeholder="选择分类"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="金额（元）" prop="price">
        <el-input-number
          v-model="form.price"
          :min="0"
          :precision="2"
          :step="1"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="上架状态">
        <el-switch v-model="form.status" />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="商品描述（可选）"
          maxlength="500"
          show-word-limit
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

import type { ProductVO } from '@/api/demo/product'
import { createProduct, updateProduct } from '@/api/demo/product'
import DictSelect from '@/components/DictSelect/index.vue'

const emit = defineEmits<{ saved: [] }>()

const visible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: undefined as string | undefined,
  name: '',
  category: undefined as string | undefined,
  price: 0,
  status: true,
  description: '',
})

/** 与后端 ProductCreateDto 校验对齐（必填 + 金额非负） */
const rules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  price: [
    { required: true, message: '请输入金额', trigger: 'blur' },
    { type: 'number', min: 0, message: '金额不能为负数', trigger: 'blur' },
  ],
}

/** 打开弹窗：编辑态由行数据填充 */
function open(product?: ProductVO): void {
  visible.value = true
  if (product) {
    form.id = product.id
    form.name = product.name
    form.category = product.category
    form.price = product.price
    form.status = product.status
    form.description = product.description ?? ''
  }
}

function resetForm(): void {
  formRef.value?.resetFields()
  form.id = undefined
  form.name = ''
  form.category = undefined
  form.price = 0
  form.status = true
  form.description = ''
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    if (form.id) {
      await updateProduct({
        id: form.id,
        name: form.name,
        category: form.category!,
        price: form.price,
        status: form.status,
        description: form.description || undefined,
      })
      ElMessage.success('修改成功')
    }
    else {
      await createProduct({
        name: form.name,
        category: form.category!,
        price: form.price,
        status: form.status,
        description: form.description || undefined,
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
