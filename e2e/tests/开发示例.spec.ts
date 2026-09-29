// 全链路用例：批次六样板业务模块——开发示例分组、商品列表字典翻译（DictTag 分类 / 状态复用）、
// 新增 / 编辑 / 删除闭环、搜索过滤与 keep-alive 载体。依赖后端与 PostgreSQL 就绪（种子账号
// admin/admin123）；探测失败时整组自动跳过。写操作用例为「新建 → 验证 → 删除」闭环且名称带随机后缀，
// 不污染种子数据。选择器约定同系统管理：表格行用 .vxe-body--row（列表表格统一 N1Table / vxe-table）；
// el-select 非过滤态走表单项容器定位；行断言用 filter hasText，命中多行时取 first()
import { expect, test } from '@playwright/test'

import { loginViaApi } from './support/auth'

/** 页签元素定位（fullPath 为 data-fullpath 属性） */
function tagOf(page: import('@playwright/test').Page, fullPath: string) {
  return page.locator(`.n1-tag[data-fullpath="${fullPath}"]`)
}

test.beforeEach(async ({ page, request }) => {
  const health = await request.get('http://localhost:3000/api/health').catch(() => null)
  test.skip(!health?.ok(), '后端服务未启动或数据库未就绪（需先配置 server/.env 并启动 pnpm dev:server）')
  await loginViaApi(page, request)
})

test.describe('开发示例', () => {
  test('侧栏开发示例分组展开商品管理子项', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('menuitem', { name: '开发示例' }).click()
    await expect(page.getByRole('menuitem', { name: '商品管理' })).toBeVisible()
  })

  test('商品列表：种子数据经字典翻译与金额格式化渲染', async ({ page }) => {
    await page.goto('/demo/product')

    // 启用商品：分类 digital → 数码（primary）、状态启用 → success、金额固定两位小数
    const row = page.locator('.vxe-body--row').filter({ hasText: '无线蓝牙耳机' })
    await expect(row).toBeVisible()
    await expect(row.locator('.el-tag--primary')).toHaveText('数码')
    await expect(row.locator('.el-tag--success')).toHaveText('启用')
    await expect(row.getByText('299.00')).toBeVisible()

    // 非整数金额：59.9 → 59.90（formatter 两位小数）
    const shirtRow = page.locator('.vxe-body--row').filter({ hasText: '纯棉 T 恤' })
    await expect(shirtRow.getByText('59.90')).toBeVisible()

    // 停用商品：分类 book → 图书（info）、状态停用 → danger
    const disabledRow = page.locator('.vxe-body--row').filter({ hasText: '深入浅出 Vue.js' })
    await expect(disabledRow.locator('.el-tag--info')).toHaveText('图书')
    await expect(disabledRow.locator('.el-tag--danger')).toHaveText('停用')
  })

  test('商品新增 → 编辑调价 → 删除闭环（弹窗分类下拉与金额精度）', async ({ page }) => {
    await page.goto('/demo/product')

    // 新增：名称 + 分类下拉选「服饰」+ 金额 128.5（两位小数内）
    const name = `端到端商品${Date.now() % 100000}`
    const dialog = page.locator('.el-dialog').filter({ hasText: '新增商品' })
    await page.getByRole('button', { name: '新增商品' }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder('商品名称').fill(name)
    const categoryItem = dialog.locator('.el-form-item').filter({ hasText: '商品分类' })
    await categoryItem.locator('.el-select').click()
    await page.getByRole('option', { name: '服饰' }).click()
    await dialog.getByRole('spinbutton').fill('128.5')
    await dialog.getByRole('button', { name: '确定' }).click()

    // 新行出现：金额格式化 128.50、分类翻译「服饰」（success 语义色）
    const row = page.locator('.vxe-body--row').filter({ hasText: name }).first()
    await expect(row).toBeVisible()
    await expect(row.getByText('128.50')).toBeVisible()
    await expect(row.locator('.el-tag--success', { hasText: '服饰' })).toBeVisible()

    // 编辑调价：168.8 → 168.80（弹窗标题切换为编辑态）
    await row.getByRole('button', { name: '编辑' }).click()
    const editDialog = page.locator('.el-dialog').filter({ hasText: '编辑商品' })
    await expect(editDialog).toBeVisible()
    await editDialog.getByRole('spinbutton').fill('168.8')
    await editDialog.getByRole('button', { name: '确定' }).click()
    await expect(page.locator('.el-message').getByText('修改成功')).toBeVisible()
    await expect(row.getByText('168.80')).toBeVisible()

    // 删除闭环（MessageBox 确认在弹层内定位，避免与行内 link 同名冲突）
    await row.getByRole('button', { name: '删除' }).click()
    await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click()
    await expect(page.locator('.vxe-body--row').filter({ hasText: name })).toHaveCount(0)
  })

  test('搜索过滤与 keep-alive 载体：关键字保留、重置恢复全量', async ({ page }) => {
    await page.goto('/demo/product')

    // 名称模糊过滤：命中耳机单行，其余种子行不出现
    const keyword = page.getByPlaceholder('名称模糊匹配')
    await keyword.fill('耳机')
    await page.getByRole('button', { name: '查询' }).click()
    await expect(page.locator('.vxe-body--row').filter({ hasText: '无线蓝牙耳机' })).toBeVisible()
    await expect(page.locator('.vxe-body--row').filter({ hasText: '纯棉 T 恤' })).toHaveCount(0)

    // 切走切回：keep-alive 缓存生效，关键字与过滤结果保留
    await tagOf(page, '/home').click()
    await tagOf(page, '/demo/product').click()
    await expect(keyword).toHaveValue('耳机')
    await expect(page.locator('.vxe-body--row').filter({ hasText: '无线蓝牙耳机' })).toBeVisible()

    // 重置：恢复全量（种子三行齐全）
    await page.getByRole('button', { name: '重置' }).click()
    await expect(page.locator('.vxe-body--row').filter({ hasText: '纯棉 T 恤' })).toBeVisible()
    await expect(page.locator('.vxe-body--row').filter({ hasText: '深入浅出 Vue.js' })).toBeVisible()
    await expect(keyword).toHaveValue('')
  })
})
