<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 用户管理页：搜索分页 + 新增 / 编辑 / 删除 / 重置密码 / 分配角色（批次五 CRUD 样板）
-->
<template>
  <div class="page-container">
    <el-card>
      <el-form class="search-bar" inline :model="queryParam" @submit.prevent>
        <el-form-item label="登录账号">
          <el-input
            v-model="queryParam.username"
            placeholder="账号模糊匹配"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-tree-select
            v-model="queryParam.deptId"
            :data="deptTreeOptions"
            :render-after-expand="false"
            check-strictly
            default-expand-all
            node-key="id"
            placeholder="全部"
            clearable
            style="width: 200px"
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
          <el-button v-hasPermi="'system:user:create'" type="primary" @click="openCreate">
            新增用户
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="username" label="登录账号" min-width="120" />
        <el-table-column prop="nickname" label="用户昵称" min-width="120" />
        <el-table-column prop="deptName" label="所属部门" min-width="120" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <DictTag type="common_status" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="170" :formatter="dateTimeColumnFormatter" />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button
              v-hasPermi="'system:user:update'"
              link
              type="primary"
              @click="openUpdate(row)"
            >
              编辑
            </el-button>
            <el-button
              v-hasPermi="'system:user:reset-password'"
              link
              type="primary"
              @click="handleResetPassword(row)"
            >
              重置密码
            </el-button>
            <el-button
              v-hasPermi="'system:user:update'"
              link
              type="primary"
              @click="openAssignRole(row)"
            >
              分配角色
            </el-button>
            <el-button
              v-hasPermi="'system:user:delete'"
              link
              type="danger"
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

    <UserSaveDialog ref="saveDialogRef" @saved="loadTable" />
    <UserRoleDialog ref="roleDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import type { DeptVO } from '@/api/system/dept'
import { getDeptList } from '@/api/system/dept'
import type { UserVO } from '@/api/system/user'
import { deleteUser, getUserPage, resetUserPassword } from '@/api/system/user'
import DictSelect from '@/components/DictSelect/index.vue'
import DictTag from '@/components/DictTag/index.vue'
import { dateTimeColumnFormatter } from '@/utils/format'
import UserRoleDialog from '@/views/system/user/components/UserRoleDialog.vue'
import UserSaveDialog from '@/views/system/user/components/UserSaveDialog.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemUser' })

const loading = ref(false)
const tableData = ref<UserVO[]>([])
const total = ref(0)

const queryParam = reactive({
  pageNo: 1,
  pageSize: 10,
  username: '',
  deptId: undefined as string | undefined,
  /** 字典 value 为字符串形态（'true' / 'false'），提交前转 boolean */
  status: undefined as string | undefined,
})

/** 部门筛选树选数据（平铺组树） */
const allDepts = ref<DeptVO[]>([])

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

const saveDialogRef = ref<InstanceType<typeof UserSaveDialog>>()
const roleDialogRef = ref<InstanceType<typeof UserRoleDialog>>()

onMounted(() => {
  loadTable()
  // 部门筛选下拉数据（失败不阻塞列表）
  getDeptList().then((depts) => {
    allDepts.value = depts
  })
})

async function loadTable(): Promise<void> {
  loading.value = true
  try {
    const page = await getUserPage({
      pageNo: queryParam.pageNo,
      pageSize: queryParam.pageSize,
      username: queryParam.username || undefined,
      deptId: queryParam.deptId,
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
  queryParam.username = ''
  queryParam.deptId = undefined
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

function openUpdate(user: UserVO): void {
  saveDialogRef.value?.open(user)
}

function openAssignRole(user: UserVO): void {
  roleDialogRef.value?.open(user)
}

/** 重置密码：确认后直调（恢复初始口令，无需输入框） */
async function handleResetPassword(user: UserVO): Promise<void> {
  const confirmed = await ElMessageBox.confirm(
    `确定将用户「${user.nickname}」的密码重置为初始口令吗？`,
    '提示',
    { type: 'warning' },
  )
    .then(() => true)
    .catch(() => false)
  if (!confirmed) {
    return
  }
  await resetUserPassword(user.id)
  ElMessage.success('重置成功')
}

async function handleDelete(user: UserVO): Promise<void> {
  const confirmed = await ElMessageBox.confirm(`确定删除用户「${user.nickname}」吗？`, '提示', {
    type: 'warning',
  })
    .then(() => true)
    .catch(() => false)
  if (!confirmed) {
    return
  }
  await deleteUser(user.id)
  ElMessage.success('删除成功')
  loadTable()
}

/** 树选节点 */
interface TreeOption {
  id: string
  label: string
  children: TreeOption[]
}
</script>
