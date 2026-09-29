<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 字典管理页：类型分页 CRUD + 行操作「数据」打开抽屉管理该类型下字典数据
-->
<template>
  <div class="page-container">
    <el-card>
      <el-form class="search-bar" inline :model="queryParam" @submit.prevent>
        <el-form-item label="字典名称">
          <el-input
            v-model="queryParam.name"
            placeholder="名称模糊匹配"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="类型标识">
          <el-input
            v-model="queryParam.type"
            placeholder="类型模糊匹配"
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
          <el-button v-hasPermi="'system:dict:create'" type="primary" @click="openCreate">
            新增类型
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="name" label="字典名称" min-width="140" />
        <el-table-column prop="type" label="类型标识" min-width="150" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <DictTag type="common_status" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.remark ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="170" :formatter="dateTimeColumnFormatter" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="'system:dict:update'" link type="primary" @click="openUpdate(row)">
              编辑
            </el-button>
            <el-button v-hasPermi="'system:dict:update'" link type="primary" @click="openData(row)">
              数据
            </el-button>
            <el-button v-hasPermi="'system:dict:delete'" link type="danger" @click="handleDelete(row)">
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

    <DictTypeSaveDialog ref="saveDialogRef" @saved="loadTable" />
    <DictDataDrawer ref="dataDrawerRef" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import type { DictTypeVO } from '@/api/system/dict'
import { deleteDictType, getDictTypePage } from '@/api/system/dict'
import DictSelect from '@/components/DictSelect/index.vue'
import DictTag from '@/components/DictTag/index.vue'
import { dateTimeColumnFormatter } from '@/utils/format'
import DictDataDrawer from '@/views/system/dict/components/DictDataDrawer.vue'
import DictTypeSaveDialog from '@/views/system/dict/components/DictTypeSaveDialog.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemDict' })

const loading = ref(false)
const tableData = ref<DictTypeVO[]>([])
const total = ref(0)

const queryParam = reactive({
  pageNo: 1,
  pageSize: 10,
  name: '',
  type: '',
  /** 字典 value 为字符串形态（'true' / 'false'），提交前转 boolean */
  status: undefined as string | undefined,
})

const saveDialogRef = ref<InstanceType<typeof DictTypeSaveDialog>>()
const dataDrawerRef = ref<InstanceType<typeof DictDataDrawer>>()

onMounted(() => {
  loadTable()
})

async function loadTable(): Promise<void> {
  loading.value = true
  try {
    const page = await getDictTypePage({
      pageNo: queryParam.pageNo,
      pageSize: queryParam.pageSize,
      name: queryParam.name || undefined,
      type: queryParam.type || undefined,
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
  queryParam.type = ''
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

function openUpdate(dictType: DictTypeVO): void {
  saveDialogRef.value?.open(dictType)
}

function openData(dictType: DictTypeVO): void {
  dataDrawerRef.value?.open(dictType)
}

async function handleDelete(dictType: DictTypeVO): Promise<void> {
  const confirmed = await ElMessageBox.confirm(
    `确定删除字典「${dictType.name}」吗？其下字典数据将一并删除。`,
    '提示',
    { type: 'warning' },
  )
    .then(() => true)
    .catch(() => false)
  if (!confirmed) {
    return
  }
  await deleteDictType(dictType.id)
  ElMessage.success('删除成功')
  loadTable()
}
</script>
