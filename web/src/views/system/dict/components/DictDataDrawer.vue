<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 字典数据抽屉：固定在某类型下的独立分页数据管理（新增 / 编辑 / 删除）
-->
<template>
  <el-drawer v-model="visible" :title="drawerTitle" size="720px">
    <div class="drawer-body">
      <el-form class="search-bar" inline :model="queryParam" @submit.prevent>
        <el-form-item label="数据标签">
          <el-input
            v-model="queryParam.label"
            placeholder="标签模糊匹配"
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
          <el-button v-hasPermi="'system:dict:create'" type="primary" @click="openCreate">
            新增数据
          </el-button>
        </el-form-item>
      </el-form>

      <N1Table :columns="columns" :data="tableData" :loading="loading" persist-key="SystemDict:data">
        <template #status="{ row }">
          <DictTag type="common_status" :value="row.status" />
        </template>
        <template #colorType="{ row }">
          <el-tag v-if="row.colorType" :type="row.colorType" size="small">
            {{ row.colorType }}
          </el-tag>
          <span v-else>-</span>
        </template>
        <template #remark="{ row }">
          {{ row.remark ?? '-' }}
        </template>
        <template #action="{ row }">
          <el-button v-hasPermi="'system:dict:update'" link type="primary" @click="openUpdate(row)">
            编辑
          </el-button>
          <el-button v-hasPermi="'system:dict:delete'" link type="danger" @click="handleDelete(row)">
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
    </div>

    <DictDataSaveDialog ref="saveDialogRef" @saved="loadTable" />
  </el-drawer>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref } from 'vue'

import type { DictDataVO, DictTypeVO } from '@/api/system/dict'
import { deleteDictData, getDictDataPage } from '@/api/system/dict'
import DictTag from '@/components/DictTag/index.vue'
import N1Table from '@/components/N1Table/index.vue'
import type { N1TableColumn } from '@/components/N1Table/types'
import DictDataSaveDialog from '@/views/system/dict/components/DictDataSaveDialog.vue'

/** 列定义（抽屉内非页面级表格，持久化 key 显式指定，设计见 docs/前端/表格组件设计.md §4.2） */
const columns: N1TableColumn[] = [
  { field: 'sort', title: '排序', width: 70 },
  { field: 'label', title: '数据标签', minWidth: 120 },
  { field: 'dictValue', title: '数据键值', minWidth: 120 },
  { field: 'status', title: '状态', width: 80, slot: 'status' },
  { field: 'colorType', title: '标签配色', width: 110, slot: 'colorType' },
  { field: 'remark', title: '备注', minWidth: 120, slot: 'remark' },
  { field: 'action', title: '操作', width: 140, fixed: 'right', slot: 'action' },
]

const visible = ref(false)
const loading = ref(false)
const tableData = ref<DictDataVO[]>([])
const total = ref(0)

/** 抽屉上下文：当前管理的字典类型（数据查询的 dictType 固定值） */
const dictType = ref<DictTypeVO | null>(null)

const queryParam = reactive({
  pageNo: 1,
  pageSize: 10,
  label: '',
})

const saveDialogRef = ref<InstanceType<typeof DictDataSaveDialog>>()

const drawerTitle = computed(() =>
  dictType.value ? `字典数据 - ${dictType.value.name}（${dictType.value.type}）` : '字典数据',
)

/** 打开抽屉：固定类型上下文并加载首页数据 */
function open(target: DictTypeVO): void {
  dictType.value = target
  queryParam.pageNo = 1
  queryParam.pageSize = 10
  queryParam.label = ''
  visible.value = true
  loadTable()
}

async function loadTable(): Promise<void> {
  if (!dictType.value) {
    return
  }
  loading.value = true
  try {
    const page = await getDictDataPage({
      pageNo: queryParam.pageNo,
      pageSize: queryParam.pageSize,
      dictType: dictType.value.type,
      label: queryParam.label || undefined,
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
  queryParam.label = ''
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
  if (dictType.value) {
    saveDialogRef.value?.open(dictType.value.type)
  }
}

function openUpdate(data: DictDataVO): void {
  if (dictType.value) {
    saveDialogRef.value?.open(dictType.value.type, data)
  }
}

async function handleDelete(data: DictDataVO): Promise<void> {
  const confirmed = await ElMessageBox.confirm(
    `确定删除字典数据「${data.label}」吗？`,
    '提示',
    { type: 'warning' },
  )
    .then(() => true)
    .catch(() => false)
  if (!confirmed) {
    return
  }
  await deleteDictData(data.id)
  ElMessage.success('删除成功')
  loadTable()
}

defineExpose({ open })
</script>

<style scoped>
.drawer-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
