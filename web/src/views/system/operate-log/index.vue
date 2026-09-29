<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 操作日志页：只读查询分页 + 详情弹窗（请求参数 JSON 美化）+ 单条删除
-->
<template>
  <div class="page-container">
    <el-card>
      <el-form class="search-bar" inline :model="queryParam" @submit.prevent>
        <el-form-item label="操作人">
          <el-input
            v-model="queryParam.userName"
            placeholder="操作人模糊匹配"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="模块名">
          <el-input
            v-model="queryParam.module"
            placeholder="模块模糊匹配"
            clearable
            @keyup.enter="handleQuery"
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
      </el-form>
    </el-card>

    <el-card class="table-card">
      <N1Table :columns="columns" :data="tableData" :loading="loading">
        <template #userName="{ row }">
          {{ row.userName ?? '-' }}
        </template>
        <template #request="{ row }">
          <el-tag size="small" class="method-tag">
            {{ row.requestMethod }}
          </el-tag>{{ row.requestUrl }}
        </template>
        <template #durationMs="{ row }">
          {{ row.durationMs }}ms
        </template>
        <template #resultCode="{ row }">
          <el-tag :type="row.resultCode === 0 ? 'success' : 'danger'" size="small">
            {{ row.resultCode }}
          </el-tag>
        </template>
        <template #action="{ row }">
          <el-button link type="primary" @click="openDetail(row)">
            详情
          </el-button>
          <el-button v-hasPermi="'system:operate-log:delete'" link type="danger" @click="handleDelete(row)">
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

    <el-dialog v-model="detailVisible" title="操作日志详情" width="680px">
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item label="操作人">
          {{ detail.userName ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="模块">
          {{ detail.module }}
        </el-descriptions-item>
        <el-descriptions-item label="操作名">
          {{ detail.name }}
        </el-descriptions-item>
        <el-descriptions-item label="结果">
          {{ detail.resultCode }} {{ detail.resultMsg ?? '' }}
        </el-descriptions-item>
        <el-descriptions-item label="请求方法">
          {{ detail.requestMethod }}
        </el-descriptions-item>
        <el-descriptions-item label="耗时">
          {{ detail.durationMs }}ms
        </el-descriptions-item>
        <el-descriptions-item label="请求地址" :span="2">
          {{ detail.requestUrl }}
        </el-descriptions-item>
        <el-descriptions-item label="操作时间">
          {{ formatDateTime(detail.startTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="来源 IP">
          {{ detail.ip ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="请求参数" :span="2">
          <pre class="json-pre">{{ prettyParams }}</pre>
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
import { computed, onMounted, reactive, ref } from 'vue'

import type { OperateLogVO } from '@/api/system/operate-log'
import { deleteOperateLog, getOperateLogPage } from '@/api/system/operate-log'
import N1Table from '@/components/N1Table/index.vue'
import type { N1TableColumn } from '@/components/N1Table/types'
import { dateTimeFormatter, formatDateTime } from '@/utils/format'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemOperateLog' })

/** 列定义（field 即列宽 / 列序持久化标识，设计见 docs/前端/表格组件设计.md） */
const columns: N1TableColumn[] = [
  { field: 'userName', title: '操作人', minWidth: 110, slot: 'userName' },
  { field: 'module', title: '模块', minWidth: 100 },
  { field: 'name', title: '操作名', minWidth: 120 },
  { field: 'request', title: '请求', minWidth: 220, slot: 'request' },
  { field: 'durationMs', title: '耗时', width: 90, slot: 'durationMs' },
  { field: 'resultCode', title: '结果码', width: 90, slot: 'resultCode' },
  { field: 'startTime', title: '操作时间', minWidth: 170, formatter: dateTimeFormatter },
  { field: 'action', title: '操作', width: 140, fixed: 'right', slot: 'action' },
]

const loading = ref(false)
const tableData = ref<OperateLogVO[]>([])
const total = ref(0)

const queryParam = reactive({
  pageNo: 1,
  pageSize: 10,
  userName: '',
  module: '',
})

const detailVisible = ref(false)
const detail = ref<OperateLogVO | null>(null)

/** 请求参数 JSON 美化（非法 JSON 原样展示，掩敏字段后端已处理） */
const prettyParams = computed(() => {
  const raw = detail.value?.requestParams
  if (!raw) {
    return '-'
  }
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  }
  catch {
    return raw
  }
})

onMounted(() => {
  loadTable()
})

async function loadTable(): Promise<void> {
  loading.value = true
  try {
    const page = await getOperateLogPage({
      pageNo: queryParam.pageNo,
      pageSize: queryParam.pageSize,
      userName: queryParam.userName || undefined,
      module: queryParam.module || undefined,
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
  queryParam.userName = ''
  queryParam.module = ''
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

function openDetail(log: OperateLogVO): void {
  detail.value = log
  detailVisible.value = true
}

async function handleDelete(log: OperateLogVO): Promise<void> {
  const confirmed = await ElMessageBox.confirm(
    `确定删除「${log.module} - ${log.name}」这条操作日志吗？`,
    '提示',
    { type: 'warning' },
  )
    .then(() => true)
    .catch(() => false)
  if (!confirmed) {
    return
  }
  await deleteOperateLog(log.id)
  ElMessage.success('删除成功')
  loadTable()
}
</script>

<style scoped>
.method-tag {
  margin-right: 6px;
}

.json-pre {
  background: var(--n1-fill-hover);
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.6;
  margin: 0;
  max-height: 260px;
  overflow: auto;
  padding: 8px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
