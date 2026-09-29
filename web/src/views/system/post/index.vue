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
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="code" label="岗位编码" min-width="120" />
        <el-table-column prop="name" label="岗位名称" min-width="140" />
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <DictTag type="common_status" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="170" :formatter="dateTimeColumnFormatter" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="'system:post:update'" link type="primary" @click="openUpdate(row)">
              编辑
            </el-button>
            <el-button v-hasPermi="'system:post:delete'" link type="danger" @click="handleDelete(row)">
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
import { dateTimeColumnFormatter } from '@/utils/format'
import PostSaveDialog from '@/views/system/post/components/PostSaveDialog.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemPost' })

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
