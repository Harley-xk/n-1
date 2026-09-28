<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 角色分配权限弹窗：注册表全集按域分组平铺勾选（无父子级联；打开回显已分配串，保存为目标全集）
-->
<template>
  <el-dialog
    v-model="visible"
    :title="`分配权限 - ${role?.name ?? ''}`"
    width="560px"
    :close-on-click-modal="false"
  >
    <div v-loading="loading">
      <div v-for="group in groups" :key="group.domain" class="perm-group">
        <div class="perm-group-title">
          {{ group.label }}
        </div>
        <el-checkbox-group v-model="checkedCodes">
          <el-checkbox v-for="point in group.points" :key="point.code" :value="point.code">
            {{ point.label }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
      <el-empty v-if="!loading && groups.length === 0" description="权限注册表为空" :image-size="60" />
    </div>
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
import { computed, ref } from 'vue'

import { getPermissionList } from '@/api/system/permission'
import type { PermissionPointVO } from '@/api/system/permission'
import { assignRolePermissions, getRolePermissions } from '@/api/system/role'
import type { RoleVO } from '@/api/system/role'
import { groupPermissions } from '@/utils/permission'

const visible = ref(false)
const loading = ref(false)
const submitting = ref(false)

const role = ref<RoleVO | null>(null)
const points = ref<PermissionPointVO[]>([])
const checkedCodes = ref<string[]>([])

/** 权限点按域分组（纯函数整形，无父子级联） */
const groups = computed(() => groupPermissions(points.value))

/** 打开弹窗：拉取注册表全集 + 该角色已分配串（回显） */
async function open(target: RoleVO): Promise<void> {
  role.value = target
  visible.value = true
  loading.value = true
  checkedCodes.value = []
  try {
    const [list, assigned] = await Promise.all([
      getPermissionList(),
      getRolePermissions(target.id),
    ])
    points.value = list
    checkedCodes.value = assigned
  }
  finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (!role.value) {
    return
  }
  submitting.value = true
  try {
    await assignRolePermissions(role.value.id, checkedCodes.value)
    ElMessage.success('分配成功')
    visible.value = false
  }
  finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.perm-group + .perm-group {
  margin-top: 12px;
}

.perm-group-title {
  font-weight: 600;
  margin-bottom: 4px;
}
</style>
