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
      <el-table
        v-loading="loading"
        :data="treeData"
        row-key="id"
        :tree-props="{ children: 'children' }"
        default-expand-all
        stripe
      >
        <el-table-column prop="name" label="部门名称" min-width="220" />
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <DictTag type="common_status" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" min-width="130">
          <template #default="{ row }">
            {{ row.phone ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="email" label="联系邮箱" min-width="180">
          <template #default="{ row }">
            {{ row.email ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="170" :formatter="dateTimeColumnFormatter" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="'system:dept:update'" link type="primary" @click="openUpdate(row)">
              编辑
            </el-button>
            <el-button v-hasPermi="'system:dept:delete'" link type="danger" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
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
import { dateTimeColumnFormatter } from '@/utils/format'
import DeptSaveDialog from '@/views/system/dept/components/DeptSaveDialog.vue'

// 与路由 name 对齐（keep-alive 缓存键契约）
defineOptions({ name: 'SystemDept' })

/** 树形行（平铺 VO 组树后的形态） */
interface DeptRow extends DeptVO {
  children: DeptRow[]
}

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
