<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 岗位管理页：搜索分页 + 新增 / 编辑 / 删除（code 全局唯一，删除连带解除用户关联）
-->
<template>
  <div class="page-container">
    <el-card>
      <el-form class="search-bar" inline :model="queryParam" @submit.prevent>
        <el-form-item label="岗位编码">
          <el-input
            v-model="queryParam.code"
            placeholder="编码模糊匹配"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="岗位名称">
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
          <el-button v-hasPermi="'system:post:create'" type="primary" @click="openCreate">
            新增岗位
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <N1Table :columns="columns" :data="tableData" :loading="loading">
        <template #status="{ row }">
          <DictTag type="common_status" :value="row.status" />
        </template>
        <template #action="{ row }">
          <el-button v-hasPermi="'system:post:update'" link type="primary" @click="openUpdate(row)">
            编辑
          </el-button>
          <el-button v-hasPermi="'system:post:delete'" link type="danger" @click="handleDelete(row)">
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

    <PostSaveDialog ref="saveDialogRef" @saved="loadTable" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import type { PostVO } from '@/api/system/post'
import { deletePost, getPostPage } from '@/api/system/post'
import DictSelect from '@/components/DictSelect/index.vue'
import DictTag from '@/components/DictTag/index.vue'
import N1Table from '@/components/N1Table/index.vue'
import type { N1TableColumn } from '@/components/N1Table/types'
import { dateTimeFormatter } from '@/utils/format'
import PostSaveDialog from '@/views/system/post/components/PostSaveDialog.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemPost' })

/** 列定义（field 即列宽 / 列序持久化标识，设计见 docs/前端/表格组件设计.md） */
const columns: N1TableColumn[] = [
  { field: 'code', title: '岗位编码', minWidth: 120 },
  { field: 'name', title: '岗位名称', minWidth: 140 },
  { field: 'sort', title: '排序', width: 80 },
  { field: 'status', title: '状态', width: 80, slot: 'status' },
  { field: 'createTime', title: '创建时间', minWidth: 170, formatter: dateTimeFormatter },
  { field: 'action', title: '操作', width: 140, fixed: 'right', slot: 'action' },
]

const loading = ref(false)
const tableData = ref<PostVO[]>([])
const total = ref(0)

const queryParam = reactive({
  pageNo: 1,
  pageSize: 10,
  code: '',
  name: '',
  /** 字典 value 为字符串形态（'true' / 'false'），提交前转 boolean */
  status: undefined as string | undefined,
})

const saveDialogRef = ref<InstanceType<typeof PostSaveDialog>>()

onMounted(() => {
  loadTable()
})

async function loadTable(): Promise<void> {
  loading.value = true
  try {
    const page = await getPostPage({
      pageNo: queryParam.pageNo,
      pageSize: queryParam.pageSize,
      code: queryParam.code || undefined,
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
  queryParam.code = ''
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

function openUpdate(post: PostVO): void {
  saveDialogRef.value?.open(post)
}

async function handleDelete(post: PostVO): Promise<void> {
  const confirmed = await ElMessageBox.confirm(
    `确定删除岗位「${post.name}」吗？已关联用户将同时解除该岗位。`,
    '提示',
    { type: 'warning' },
  )
    .then(() => true)
    .catch(() => false)
  if (!confirmed) {
    return
  }
  await deletePost(post.id)
  ElMessage.success('删除成功')
  loadTable()
}
</script>
