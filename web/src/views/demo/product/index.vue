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
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column prop="name" label="商品名称" min-width="160" />
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <DictTag type="demo_product_category" :value="row.category" />
          </template>
        </el-table-column>
        <el-table-column
          prop="price"
          label="金额（元）"
          width="120"
          align="right"
          :formatter="priceFormatter"
        />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <DictTag type="common_status" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" min-width="170" :formatter="dateTimeColumnFormatter" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="'demo:product:update'" link type="primary" @click="openUpdate(row)">
              编辑
            </el-button>
            <el-button v-hasPermi="'demo:product:delete'" link type="danger" @click="handleDelete(row)">
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
import { useDictStore } from '@/stores/dict'
import { dateTimeColumnFormatter } from '@/utils/format'
import ProductSaveDialog from '@/views/demo/product/components/ProductSaveDialog.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'DemoProduct' })

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

/** 金额列格式化：固定两位小数 */
function priceFormatter(_row: unknown, _column: unknown, cellValue: number): string {
  return cellValue == null ? '-' : cellValue.toFixed(2)
}
</script>
