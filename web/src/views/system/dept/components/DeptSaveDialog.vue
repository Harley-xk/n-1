<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 部门新增 / 编辑弹窗：上级部门树选（编辑时排除自身及子孙防环）、名称 / 排序 / 联系方式
-->
<template>
  <el-dialog
    v-model="visible"
    :title="form.id ? '编辑部门' : '新增部门'"
    width="520px"
    :close-on-click-modal="false"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="上级部门" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          :data="deptTreeOptions"
          :render-after-expand="false"
          check-strictly
          default-expand-all
          node-key="id"
          placeholder="不选为根部门"
          clearable
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="部门名称" prop="name">
        <el-input v-model="form.name" placeholder="部门名称" maxlength="50" />
      </el-form-item>
      <el-form-item label="显示排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="联系电话" prop="phone">
        <el-input v-model="form.phone" placeholder="联系电话" maxlength="20" />
      </el-form-item>
      <el-form-item label="联系邮箱" prop="email">
        <el-input v-model="form.email" placeholder="联系邮箱" maxlength="50" />
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
import { computed, reactive, ref } from 'vue'

import type { DeptVO } from '@/api/system/dept'
import { createDept, getDeptList, updateDept } from '@/api/system/dept'

const emit = defineEmits<{ saved: [] }>()

const visible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: undefined as string | undefined,
  parentId: undefined as string | undefined,
  name: '',
  sort: 0,
  phone: '',
  email: '',
  status: true,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  email: [{ type: 'email', message: '联系邮箱格式不正确', trigger: 'blur' }],
}

/** 部门全集（弹窗打开时拉取） */
const allDepts = ref<DeptVO[]>([])

/** 编辑时排除自身及子孙（防止把部门挂到自己子树下成环，后端另有兜底校验） */
const excludedIds = computed<Set<string>>(() => {
  const excluded = new Set<string>()
  if (!form.id) {
    return excluded
  }
  const queue = [form.id]
  while (queue.length > 0) {
    const current = queue.shift()!
    excluded.add(current)
    for (const dept of allDepts.value) {
      if (dept.parentId === current) {
        queue.push(dept.id)
      }
    }
  }
  return excluded
})

const deptTreeOptions = computed<TreeOption[]>(() => {
  const childrenOf = (parentId: string | null): TreeOption[] =>
    allDepts.value
      .filter(dept => dept.parentId === parentId && !excludedIds.value.has(dept.id))
      .map(dept => ({
        id: dept.id,
        label: dept.name,
        children: childrenOf(dept.id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  return childrenOf(null)
})

/** 打开弹窗：拉取部门全集 + 编辑态由行数据填充 */
async function open(dept?: DeptVO): Promise<void> {
  visible.value = true
  // 部门全集失败不阻塞表单（树选降级为空）
  getDeptList().then((depts) => {
    allDepts.value = depts
  })
  if (dept) {
    form.id = dept.id
    form.parentId = dept.parentId ?? undefined
    form.name = dept.name
    form.sort = dept.sort
    form.phone = dept.phone ?? ''
    form.email = dept.email ?? ''
    form.status = dept.status
  }
}

function resetForm(): void {
  formRef.value?.resetFields()
  form.id = undefined
  form.parentId = undefined
  form.name = ''
  form.sort = 0
  form.phone = ''
  form.email = ''
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
      await updateDept({
        id: form.id,
        parentId: form.parentId,
        name: form.name,
        sort: form.sort,
        phone: form.phone || undefined,
        email: form.email || undefined,
        status: form.status,
      })
      ElMessage.success('修改成功')
    }
    else {
      await createDept({
        parentId: form.parentId,
        name: form.name,
        sort: form.sort,
        phone: form.phone || undefined,
        email: form.email || undefined,
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

/** 树选节点 */
interface TreeOption {
  id: string
  label: string
  children: TreeOption[]
}
</script>
