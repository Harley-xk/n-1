<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 登录日志页：只读查询分页（登录 / 登出）+ 详情弹窗 + 单条删除
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
        <el-form-item label="日志类型">
          <el-select
            v-model="queryParam.logType"
            placeholder="全部"
            clearable
            style="width: 120px"
            @change="handleQuery"
          >
            <el-option label="登录" :value="10" />
            <el-option label="登出" :value="20" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            查询
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <N1Table :columns="columns" :data="tableData" :loading="loading">
        <template #logType="{ row }">
          <el-tag :type="row.logType === 10 ? 'primary' : 'info'" size="small">
            {{ row.logType === 10 ? '登录' : '登出' }}
          </el-tag>
        </template>
        <template #ip="{ row }">
          {{ row.ip ?? '-' }}
        </template>
        <template #resultCode="{ row }">
          <el-tag :type="row.resultCode === 0 ? 'success' : 'danger'" size="small">
            {{ row.resultCode }}
          </el-tag>
        </template>
        <template #resultMsg="{ row }">
          {{ row.resultMsg ?? '-' }}
        </template>
        <template #action="{ row }">
          <el-button link type="primary" @click="openDetail(row)">
            详情
          </el-button>
          <el-button v-hasPermi="'system:login-log:delete'" link type="danger" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </N1Table>

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

    <el-dialog v-model="detailVisible" title="登录日志详情" width="640px">
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item label="类型">
          {{ detail.logType === 10 ? '登录' : '登出' }}
        </el-descriptions-item>
        <el-descriptions-item label="登录账号">
          {{ detail.username }}
        </el-descriptions-item>
        <el-descriptions-item label="用户 id">
          {{ detail.userId ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="来源 IP">
          {{ detail.ip ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="结果">
          {{ detail.resultCode }}
        </el-descriptions-item>
        <el-descriptions-item label="结果信息">
          {{ detail.resultMsg ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="时间" :span="2">
          {{ formatDateTime(detail.loginTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="User-Agent" :span="2">
          {{ detail.userAgent ?? '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import type { LoginLogVO } from '@/api/system/login-log'
import { deleteLoginLog, getLoginLogPage } from '@/api/system/login-log'
import N1Table from '@/components/N1Table/index.vue'
import type { N1TableColumn } from '@/components/N1Table/types'
import { dateTimeFormatter, formatDateTime } from '@/utils/format'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemLoginLog' })

/** 列定义（field 即列宽 / 列序持久化标识，设计见 docs/前端/表格组件设计.md） */
const columns: N1TableColumn[] = [
  { field: 'logType', title: '类型', width: 80, slot: 'logType' },
  { field: 'username', title: '登录账号', minWidth: 120 },
  { field: 'ip', title: '来源 IP', minWidth: 130, slot: 'ip' },
  { field: 'resultCode', title: '结果', width: 90, slot: 'resultCode' },
  { field: 'resultMsg', title: '结果信息', minWidth: 180, slot: 'resultMsg' },
  { field: 'loginTime', title: '登录 / 登出时间', minWidth: 170, formatter: dateTimeFormatter },
  { field: 'action', title: '操作', width: 140, fixed: 'right', slot: 'action' },
]

const loading = ref(false)
const tableData = ref<LoginLogVO[]>([])
const total = ref(0)

const queryParam = reactive({
  pageNo: 1,
  pageSize: 10,
  username: '',
  logType: undefined as number | undefined,
})

const detailVisible = ref(false)
const detail = ref<LoginLogVO | null>(null)

onMounted(() => {
  loadTable()
})

async function loadTable(): Promise<void> {
  loading.value = true
  try {
    const page = await getLoginLogPage({
      pageNo: queryParam.pageNo,
      pageSize: queryParam.pageSize,
      username: queryParam.username || undefined,
      logType: queryParam.logType,
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
  queryParam.logType = undefined
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

function openDetail(log: LoginLogVO): void {
  detail.value = log
  detailVisible.value = true
}

async function handleDelete(log: LoginLogVO): Promise<void> {
  const confirmed = await ElMessageBox.confirm(
    `确定删除「${log.username}」的这条${log.logType === 10 ? '登录' : '登出'}日志吗？`,
    '提示',
    { type: 'warning' },
  )
    .then(() => true)
    .catch(() => false)
  if (!confirmed) {
    return
  }
  await deleteLoginLog(log.id)
  ElMessage.success('删除成功')
  loadTable()
}
</script>
