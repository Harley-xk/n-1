<!--
  作者: Harley-xk
  创建: 2026-09-28

  描述: 部门管理页：平铺接口前端组树展示（树形表格）+ 名称纯前端过滤 + 新增 / 编辑 / 删除
-->
<template>
  <div class="page-container">
    <el-card>
      <el-form class="search-bar" inline @submit.prevent>
        <el-form-item label="部门名称">
          <el-input
            v-model="queryName"
            placeholder="名称过滤（含子孙命中保留祖先链）"
            clearable
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button v-hasPermi="'system:dept:create'" type="primary" @click="openCreate">
            新增部门
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <N1Table
        :columns="columns"
        :data="treeData"
        :loading="loading"
        :tree-config="{ children: 'children', expandAll: true }"
        :row-config="{ keyField: 'id' }"
      >
        <template #status="{ row }">
          <DictTag type="common_status" :value="row.status" />
        </template>
        <template #phone="{ row }">
          {{ row.phone ?? '-' }}
        </template>
        <template #email="{ row }">
          {{ row.email ?? '-' }}
        </template>
        <template #action="{ row }">
          <el-button v-hasPermi="'system:dept:update'" link type="primary" @click="openUpdate(row)">
            编辑
          </el-button>
          <el-button v-hasPermi="'system:dept:delete'" link type="danger" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </N1Table>
    </el-card>

    <DeptSaveDialog ref="saveDialogRef" @saved="loadTable" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import type { DeptVO } from '@/api/system/dept'
import { deleteDept, getDeptList } from '@/api/system/dept'
import DictTag from '@/components/DictTag/index.vue'
import N1Table from '@/components/N1Table/index.vue'
import type { N1TableColumn } from '@/components/N1Table/types'
import { dateTimeFormatter } from '@/utils/format'
import DeptSaveDialog from '@/views/system/dept/components/DeptSaveDialog.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemDept' })

/** 树形行（平铺 VO 组树后的形态） */
interface DeptRow extends DeptVO {
  children: DeptRow[]
}

/** 列定义（field 即列宽 / 列序持久化标识，设计见 docs/前端/表格组件设计.md） */
const columns: N1TableColumn[] = [
  { field: 'name', title: '部门名称', minWidth: 220 },
  { field: 'sort', title: '排序', width: 80 },
  { field: 'status', title: '状态', width: 80, slot: 'status' },
  { field: 'phone', title: '联系电话', minWidth: 130, slot: 'phone' },
  { field: 'email', title: '联系邮箱', minWidth: 180, slot: 'email' },
  { field: 'createTime', title: '创建时间', minWidth: 170, formatter: dateTimeFormatter },
  { field: 'action', title: '操作', width: 140, fixed: 'right', slot: 'action' },
]

const loading = ref(false)
const allDepts = ref<DeptVO[]>([])
const queryName = ref('')

const saveDialogRef = ref<InstanceType<typeof DeptSaveDialog>>()

/** 平铺组树（按 sort 升序）；名称过滤时保留命中节点与祖先链（纯前端） */
const treeData = computed<DeptRow[]>(() => {
  const childrenOf = (parentId: string | null): DeptRow[] =>
    allDepts.value
      .filter(dept => dept.parentId === parentId)
      .map(dept => ({ ...dept, children: childrenOf(dept.id) }))
      .sort((a, b) => a.sort - b.sort)
  const tree = childrenOf(null)
  const keyword = queryName.value.trim()
  if (!keyword) {
    return tree
  }
  const filterTree = (nodes: DeptRow[]): DeptRow[] =>
    nodes
      .map(node => ({ ...node, children: filterTree(node.children) }))
      .filter(node => node.name.includes(keyword) || node.children.length > 0)
  return filterTree(tree)
})

onMounted(() => {
  loadTable()
})

async function loadTable(): Promise<void> {
  loading.value = true
  try {
    allDepts.value = await getDeptList()
  }
  finally {
    loading.value = false
  }
}

function openCreate(): void {
  saveDialogRef.value?.open()
}

function openUpdate(dept: DeptVO): void {
  saveDialogRef.value?.open(dept)
}

async function handleDelete(dept: DeptVO): Promise<void> {
  const confirmed = await ElMessageBox.confirm(
    `确定删除部门「${dept.name}」吗？存在下级部门或挂靠用户时无法删除。`,
    '提示',
    { type: 'warning' },
  )
    .then(() => true)
    .catch(() => false)
  if (!confirmed) {
    return
  }
  await deleteDept(dept.id)
  ElMessage.success('删除成功')
  loadTable()
}
</script>
