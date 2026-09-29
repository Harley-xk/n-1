<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 角色管理页：搜索分页 + 新增 / 编辑 / 删除 / 分配权限（super_admin 内置角色后端保护，前端隐藏分配入口）
-->
<template>
  <div class="page-container">
    <el-card>
      <el-form class="search-bar" inline :model="queryParam" @submit.prevent>
        <el-form-item label="角色名称">
          <el-input
            v-model="queryParam.name"
            placeholder="名称模糊匹配"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="状态">
          <DictSelect
            v-model="queryParam.status"
            type="common_status"
            placeholder="全部"
            style="width: 120px"
            @update:model-value="handleStatusChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            查询
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button v-hasPermi="'system:role:create'" type="primary" @click="openCreate">
            新增角色
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="name" label="角色名称" min-width="140" />
        <el-table-column prop="code" label="角色标识" min-width="140" />
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <DictTag type="common_status" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" min-width="170" :formatter="dateTimeColumnFormatter" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-hasPermi="'system:role:update'"
              link
              type="primary"
              :disabled="row.code === 'super_admin'"
              @click="openUpdate(row)"
            >
              编辑
            </el-button>
            <el-button
              v-hasPermi="'system:role:assign-permission'"
              link
              type="primary"
              :disabled="row.code === 'super_admin'"
              @click="openAssignPermission(row)"
            >
              分配权限
            </el-button>
            <el-button
              v-hasPermi="'system:role:delete'"
              link
              type="danger"
              :disabled="row.code === 'super_admin'"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pagination-bar"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        :current-page="queryParam.pageNo"
        :page-size="queryParam.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </el-card>

    <RoleSaveDialog ref="saveDialogRef" @saved="loadTable" />
    <RolePermissionDialog ref="permissionDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import type { RoleVO } from '@/api/system/role'
import { deleteRole, getRolePage } from '@/api/system/role'
import DictSelect from '@/components/DictSelect/index.vue'
import DictTag from '@/components/DictTag/index.vue'
import { dateTimeColumnFormatter } from '@/utils/format'
import RolePermissionDialog from '@/views/system/role/components/RolePermissionDialog.vue'
import RoleSaveDialog from '@/views/system/role/components/RoleSaveDialog.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemRole' })

const loading = ref(false)
const tableData = ref<RoleVO[]>([])
const total = ref(0)

const queryParam = reactive({
  pageNo: 1,
  pageSize: 10,
  name: '',
  /** 字典 value 为字符串形态（'true' / 'false'），提交前转 boolean */
  status: undefined as string | undefined,
})

const saveDialogRef = ref<InstanceType<typeof RoleSaveDialog>>()
const permissionDialogRef = ref<InstanceType<typeof RolePermissionDialog>>()

onMounted(() => {
  loadTable()
})

async function loadTable(): Promise<void> {
  loading.value = true
  try {
    const page = await getRolePage({
      pageNo: queryParam.pageNo,
      pageSize: queryParam.pageSize,
      name: queryParam.name || undefined,
      status: queryParam.status === undefined ? undefined : queryParam.status === 'true',
    })
    tableData.value = page.list
    total.value = page.total
  }
  finally {
    loading.value = false
  }
}

function handleQuery(): void {
  queryParam.pageNo = 1
  loadTable()
}

function handleReset(): void {
  queryParam.name = ''
  queryParam.status = undefined
  handleQuery()
}

/** 字典下拉选择即查询（状态筛选的即时反馈） */
function handleStatusChange(): void {
  handleQuery()
}

function handlePageChange(pageNo: number): void {
  queryParam.pageNo = pageNo
  loadTable()
}

function handleSizeChange(pageSize: number): void {
  queryParam.pageSize = pageSize
  queryParam.pageNo = 1
  loadTable()
}

function openCreate(): void {
  saveDialogRef.value?.open()
}

function openUpdate(role: RoleVO): void {
  saveDialogRef.value?.open(role)
}

function openAssignPermission(role: RoleVO): void {
  permissionDialogRef.value?.open(role)
}

async function handleDelete(role: RoleVO): Promise<void> {
  const confirmed = await ElMessageBox.confirm(`确定删除角色「${role.name}」吗？`, '提示', {
    type: 'warning',
  })
    .then(() => true)
    .catch(() => false)
  if (!confirmed) {
    return
  }
  await deleteRole(role.id)
  ElMessage.success('删除成功')
  loadTable()
}
</script>
