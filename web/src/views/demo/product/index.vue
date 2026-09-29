<!--
  作者: Harley-xk
  创建: 2026-09-29

  描述: 商品管理页：搜索分页 + 新增 / 编辑 / 删除（业务模块样板；keep-alive 缓存载体）
-->
<template>
  <div class="page-container">
    <el-card>
      <el-form class="search-bar" inline :model="queryParam" @submit.prevent>
        <el-form-item label="商品名称">
          <el-input
            v-model="queryParam.name"
            placeholder="名称模糊匹配"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="分类">
          <DictSelect
            v-model="queryParam.category"
            type="demo_product_category"
            placeholder="全部分类"
            style="width: 140px"
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
          <el-button v-hasPermi="'demo:product:create'" type="primary" @click="openCreate">
            新增商品
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <N1Table :columns="columns" :data="tableData" :loading="loading">
        <template #category="{ row }">
          <DictTag type="demo_product_category" :value="row.category" />
        </template>
        <template #status="{ row }">
          <DictTag type="common_status" :value="row.status" />
        </template>
        <template #action="{ row }">
          <el-button v-hasPermi="'demo:product:update'" link type="primary" @click="openUpdate(row)">
            编辑
          </el-button>
          <el-button v-hasPermi="'demo:product:delete'" link type="danger" @click="handleDelete(row)">
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

    <ProductSaveDialog ref="saveDialogRef" @saved="loadTable" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import type { ProductVO } from '@/api/demo/product'
import { deleteProduct, getProductPage } from '@/api/demo/product'
import DictSelect from '@/components/DictSelect/index.vue'
import DictTag from '@/components/DictTag/index.vue'
import N1Table from '@/components/N1Table/index.vue'
import type { N1TableColumn } from '@/components/N1Table/types'
import { useDictStore } from '@/stores/dict'
import { dateTimeFormatter } from '@/utils/format'
import ProductSaveDialog from '@/views/demo/product/components/ProductSaveDialog.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'DemoProduct' })

/** 列定义（field 即列宽 / 列序持久化标识，设计见 docs/前端/表格组件设计.md） */
const columns: N1TableColumn[] = [
  { field: 'name', title: '商品名称', minWidth: 160 },
  { field: 'category', title: '分类', width: 100, slot: 'category' },
  { field: 'price', title: '金额（元）', width: 120, align: 'right', formatter: priceFormatter },
  { field: 'status', title: '状态', width: 80, slot: 'status' },
  { field: 'description', title: '描述', minWidth: 200 },
  { field: 'createTime', title: '创建时间', minWidth: 170, formatter: dateTimeFormatter },
  { field: 'action', title: '操作', width: 140, fixed: 'right', slot: 'action' },
]

const loading = ref(false)
const tableData = ref<ProductVO[]>([])
const total = ref(0)

const dictStore = useDictStore()

const queryParam = reactive({
  pageNo: 1,
  pageSize: 10,
  name: '',
  category: undefined as string | undefined,
  /** 字典 value 为字符串形态（'true' / 'false'），提交前转 boolean */
  status: undefined as string | undefined,
})

const saveDialogRef = ref<InstanceType<typeof ProductSaveDialog>>()

onMounted(() => {
  // 字典消费示范：页面挂载时确保分类字典就绪（store 内部有并发共享与缓存）
  dictStore.ensureLoaded()
  loadTable()
})

async function loadTable(): Promise<void> {
  loading.value = true
  try {
    const page = await getProductPage({
      pageNo: queryParam.pageNo,
      pageSize: queryParam.pageSize,
      name: queryParam.name || undefined,
      category: queryParam.category || undefined,
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
  queryParam.category = undefined
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

function openUpdate(product: ProductVO): void {
  saveDialogRef.value?.open(product)
}

async function handleDelete(product: ProductVO): Promise<void> {
  const confirmed = await ElMessageBox.confirm(
    `确定删除商品「${product.name}」吗？`,
    '提示',
    { type: 'warning' },
  )
    .then(() => true)
    .catch(() => false)
  if (!confirmed) {
    return
  }
  await deleteProduct(product.id)
  ElMessage.success('删除成功')
  loadTable()
}

/** 金额列格式化：固定两位小数（vxe formatter 签名） */
function priceFormatter({ cellValue }: { cellValue: number | null | undefined }): string {
  return cellValue == null ? '-' : cellValue.toFixed(2)
}
</script>
