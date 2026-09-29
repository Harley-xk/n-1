<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 参数设置页：搜索分页 + 新增 / 编辑 / 删除（不可见参数列表侧打码展示）
-->
<template>
  <div class="page-container">
    <el-card>
      <el-form class="search-bar" inline :model="queryParam" @submit.prevent>
        <el-form-item label="参数名称">
          <el-input
            v-model="queryParam.name"
            placeholder="名称模糊匹配"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="参数键名">
          <el-input
            v-model="queryParam.configKey"
            placeholder="键名模糊匹配"
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
        <el-form-item>
          <el-button v-hasPermi="'system:config:create'" type="primary" @click="openCreate">
            新增参数
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <N1Table :columns="columns" :data="tableData" :loading="loading">
        <template #configValue="{ row }">
          {{ row.visible ? row.configValue : '******' }}
        </template>
        <template #visible="{ row }">
          <el-tag :type="row.visible ? 'primary' : 'info'" size="small">
            {{ row.visible ? '明文' : '隐藏' }}
          </el-tag>
        </template>
        <template #action="{ row }">
          <el-button v-hasPermi="'system:config:update'" link type="primary" @click="openUpdate(row)">
            编辑
          </el-button>
          <el-button v-hasPermi="'system:config:delete'" link type="danger" @click="handleDelete(row)">
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

    <ConfigSaveDialog ref="saveDialogRef" @saved="loadTable" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import type { ConfigVO } from '@/api/system/config'
import { deleteConfig, getConfigPage } from '@/api/system/config'
import N1Table from '@/components/N1Table/index.vue'
import type { N1TableColumn } from '@/components/N1Table/types'
import { dateTimeFormatter } from '@/utils/format'
import ConfigSaveDialog from '@/views/system/config/components/ConfigSaveDialog.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemConfig' })

/** 列定义（field 即列宽 / 列序持久化标识，设计见 docs/前端/表格组件设计.md） */
const columns: N1TableColumn[] = [
  { field: 'category', title: '参数分类', minWidth: 100 },
  { field: 'name', title: '参数名称', minWidth: 150 },
  { field: 'configKey', title: '参数键名', minWidth: 200 },
  { field: 'configValue', title: '参数键值', minWidth: 160, slot: 'configValue' },
  { field: 'visible', title: '展示', width: 80, slot: 'visible' },
  { field: 'remark', title: '备注', minWidth: 140 },
  { field: 'createTime', title: '创建时间', minWidth: 170, formatter: dateTimeFormatter },
  { field: 'action', title: '操作', width: 140, fixed: 'right', slot: 'action' },
]

const loading = ref(false)
const tableData = ref<ConfigVO[]>([])
const total = ref(0)

const queryParam = reactive({
  pageNo: 1,
  pageSize: 10,
  name: '',
  configKey: '',
})

const saveDialogRef = ref<InstanceType<typeof ConfigSaveDialog>>()

onMounted(() => {
  loadTable()
})

async function loadTable(): Promise<void> {
  loading.value = true
  try {
    const page = await getConfigPage({
      pageNo: queryParam.pageNo,
      pageSize: queryParam.pageSize,
      name: queryParam.name || undefined,
      configKey: queryParam.configKey || undefined,
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
  queryParam.configKey = ''
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

function openUpdate(config: ConfigVO): void {
  saveDialogRef.value?.open(config)
}

async function handleDelete(config: ConfigVO): Promise<void> {
  const confirmed = await ElMessageBox.confirm(
    `确定删除参数「${config.name}」吗？删除后相关兜底链将回退到下一级。`,
    '提示',
    { type: 'warning' },
  )
    .then(() => true)
    .catch(() => false)
  if (!confirmed) {
    return
  }
  await deleteConfig(config.id)
  ElMessage.success('删除成功')
  loadTable()
}
</script>
