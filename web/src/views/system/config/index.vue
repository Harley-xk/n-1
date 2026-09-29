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
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="category" label="参数分类" min-width="100" />
        <el-table-column prop="name" label="参数名称" min-width="150" />
        <el-table-column prop="configKey" label="参数键名" min-width="200" />
        <el-table-column label="参数键值" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.visible ? row.configValue : '******' }}
          </template>
        </el-table-column>
        <el-table-column label="展示" width="80">
          <template #default="{ row }">
            <el-tag :type="row.visible ? 'primary' : 'info'" size="small">
              {{ row.visible ? '明文' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" min-width="170" :formatter="dateTimeColumnFormatter" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="'system:config:update'" link type="primary" @click="openUpdate(row)">
              编辑
            </el-button>
            <el-button v-hasPermi="'system:config:delete'" link type="danger" @click="handleDelete(row)">
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

    <ConfigSaveDialog ref="saveDialogRef" @saved="loadTable" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import type { ConfigVO } from '@/api/system/config'
import { deleteConfig, getConfigPage } from '@/api/system/config'
import { dateTimeColumnFormatter } from '@/utils/format'
import ConfigSaveDialog from '@/views/system/config/components/ConfigSaveDialog.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemConfig' })

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
