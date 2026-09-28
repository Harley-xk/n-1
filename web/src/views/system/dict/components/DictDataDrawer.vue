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

      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="sort" label="排序" width="70" />
        <el-table-column prop="label" label="数据标签" min-width="120" />
        <el-table-column prop="dictValue" label="数据键值" min-width="120" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <DictTag type="common_status" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="标签配色" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.colorType" :type="row.colorType" size="small">
              {{ row.colorType }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.remark ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="'system:dict:update'" link type="primary" @click="openUpdate(row)">
              编辑
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
import DictDataSaveDialog from '@/views/system/dict/components/DictDataSaveDialog.vue'

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
