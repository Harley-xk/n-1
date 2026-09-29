// 全链路用例：批次五系统管理扩展——侧栏分组、用户页 CRUD 与分配角色回显、角色页分配权限分组勾选、
// 字典数据抽屉 DictTag 渲染、登录日志首行。依赖后端与 PostgreSQL 就绪（种子账号 admin/admin123）；
// 探测失败时整组自动跳过。写操作用例均为「新建 → 验证 → 删除」闭环，不污染种子数据
// 选择器约定：表格行用 .vxe-body--row（列表表格统一 N1Table / vxe-table）；el-select 非过滤态无
// input placeholder 属性（定位走表单项容器）；el-checkbox 原生 input 为隐藏元素（点击走 label 文本，
// 勾选态断言用 toBeChecked）；按钮 accessible name 源码原样
import { expect, test } from '@playwright/test'

import { loginViaApi } from './support/auth'

/** 弹窗 / 抽屉内的主按钮（源码两字无空格，与登录页「登 录」的手写空格形态不同） */
function primaryButton(scope: import('@playwright/test').Locator, name: string) {
  return scope.getByRole('button', { name })
}

test.beforeEach(async ({ page, request }) => {
  const health = await request.get('http://localhost:3000/api/health').catch(() => null)
  test.skip(!health?.ok(), '后端服务未启动或数据库未就绪（需先配置 server/.env 并启动 pnpm dev:server）')
  await loginViaApi(page, request)
})

test.describe('系统管理', () => {
  test('侧栏系统管理分组展开八个菜单子项', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('menuitem', { name: '系统管理' }).click()
    const items = ['用户管理', '角色管理', '部门管理', '岗位管理', '字典管理', '参数设置', '操作日志', '登录日志']
    for (const item of items) {
      await expect(page.getByRole('menuitem', { name: item })).toBeVisible()
    }
  })

  test('用户管理：列表含种子账号，新增弹窗（部门树 / 岗位多选）与删除闭环', async ({ page }) => {
    await page.goto('/system/user')

    // 列表含种子账号 admin（昵称列）
    await expect(page.locator('.vxe-body--row').filter({ hasText: '系统管理员' })).toBeVisible()

    // 新增用户：登录账号 + 昵称 + 部门树选「研发部」+ 岗位多选「研发工程师」
    const username = `e2e_${Date.now() % 100000}`
    const nickname = `端到端临时用户${Date.now() % 100000}`
    const dialog = page.locator('.el-dialog').filter({ hasText: '新增用户' })
    await page.getByRole('button', { name: '新增用户' }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder('登录账号（创建后不可修改）').fill(username)
    await dialog.getByPlaceholder('用户昵称').fill(nickname)

    // 部门树选（el-select 非过滤态：点开表单项内的选框，弹层内选节点）
    const deptItem = dialog.locator('.el-form-item').filter({ hasText: '所属部门' })
    await deptItem.locator('.el-select').click()
    await page.locator('.el-popper:visible').getByText('研发部').click()

    // 岗位多选（同一表单项容器定位法，选中后 Escape 收起）
    const postItem = dialog.locator('.el-form-item').filter({ hasText: '岗位', hasNotText: '部门' })
    await postItem.locator('.el-select').click()
    await page.getByRole('option', { name: '研发工程师' }).click()
    await page.keyboard.press('Escape')

    await primaryButton(dialog, '确定').click()

    // 保存成功弹窗关闭，新行出现且部门冗余字段随分页返回（历史行残留同名时取首个）
    const row = page.locator('.vxe-body--row').filter({ hasText: nickname }).first()
    await expect(row).toBeVisible()
    await expect(row).toContainText('研发部')

    // 行内删除闭环（MessageBox 默认确认按钮为「确定」，弹层内定位避免与行内 link 同名冲突）
    await row.getByRole('button', { name: '删除' }).click()
    await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click()
    await expect(page.locator('.vxe-body--row').filter({ hasText: nickname })).toHaveCount(0)
  })

  test('用户分配角色弹窗回显已挂角色（admin 挂 super_admin）', async ({ page }) => {
    await page.goto('/system/user')

    const row = page.locator('.vxe-body--row').filter({ hasText: '系统管理员' }).first()
    await row.getByRole('button', { name: '分配角色' }).click()

    // 弹窗内启用角色列表渲染且 super_admin 处于勾选态（原生 input 隐藏，只断言 checked）
    const dialog = page.locator('.el-dialog').filter({ hasText: '分配角色' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('超级管理员（super_admin）')).toBeVisible()
    await expect(dialog.getByRole('checkbox', { name: '超级管理员' })).toBeChecked()

    // 取消关闭（不产生写操作；el-dialog 关闭为隐藏而非销毁，断言隐藏态）
    await primaryButton(dialog, '取消').click()
    await expect(dialog).toBeHidden()
  })

  test('角色管理：新增角色 + 分配权限分组勾选保存回显 + 删除闭环', async ({ page }) => {
    await page.goto('/system/role')

    // 角色名与 code 都带随机后缀（历史失败轮次的同名残留行不干扰本用例断言）
    const code = `e2e-role-${Date.now() % 100000}`
    const roleName = `端到端临时角色${Date.now() % 100000}`
    const dialog = page.locator('.el-dialog').filter({ hasText: '新增角色' })
    await page.getByRole('button', { name: '新增角色' }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder('唯一标识（创建后不可修改）').fill(code)
    await dialog.getByPlaceholder('角色名称').fill(roleName)
    await primaryButton(dialog, '确定').click()

    const row = page.locator('.vxe-body--row').filter({ hasText: roleName }).first()
    await expect(row).toBeVisible()

    // 分配权限：分组标题渲染（权限点按域分组），勾选「用户管理」组一项后保存
    await row.getByRole('button', { name: '分配权限' }).click()
    const permDialog = page.locator('.el-dialog').filter({ hasText: '分配权限' })
    await expect(permDialog).toBeVisible()
    await expect(permDialog.getByText('用户管理')).toBeVisible()
    await expect(permDialog.getByText('角色管理')).toBeVisible()
    const queryPoint = permDialog.getByRole('checkbox', { name: '用户查询' })
    await expect(queryPoint).not.toBeChecked()
    await permDialog.getByText('用户查询', { exact: true }).click()
    await expect(queryPoint).toBeChecked()
    await primaryButton(permDialog, '确定').click()
    await expect(page.locator('.el-message').getByText('分配成功')).toBeVisible()

    // 重开弹窗验证保存生效（勾选态回显），随后取消并删除角色闭环
    await row.getByRole('button', { name: '分配权限' }).click()
    await expect(permDialog.getByRole('checkbox', { name: '用户查询' })).toBeChecked()
    await primaryButton(permDialog, '取消').click()

    await row.getByRole('button', { name: '删除' }).click()
    await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click()
    await expect(page.locator('.vxe-body--row').filter({ hasText: roleName })).toHaveCount(0)
  })

  test('字典管理：类型表 DictTag 渲染 + 数据抽屉种子数据与配色', async ({ page }) => {
    await page.goto('/system/dict')

    // 类型表状态列：通用状态（启用）经字典翻译渲染 success 语义色
    const row = page.locator('.vxe-body--row').filter({ hasText: '通用状态' })
    await expect(row).toBeVisible()
    await expect(row.locator('.el-tag--success')).toBeVisible()
    await row.getByRole('button', { name: '数据' }).click()

    // 抽屉内独立分页数据表：种子两行齐全（两条数据均启用，状态列同为「启用」，行区分靠标签列）
    // 行计数限定主区容器：fixed 操作列会额外克隆一份 fixed-right body（克隆行仅含操作列文本）
    const drawer = page.locator('.el-drawer').filter({ hasText: '字典数据 - 通用状态' })
    await expect(drawer).toBeVisible()
    await expect(drawer.locator('.vxe-table--main-wrapper .vxe-body--row')).toHaveCount(2)
    const enabledRow = drawer.locator('.vxe-body--row').filter({ hasText: '启用', hasNotText: '停用' })
    const disabledRow = drawer.locator('.vxe-body--row').filter({ hasText: '停用' })
    await expect(enabledRow).toBeVisible()
    await expect(disabledRow).toBeVisible()
    // 标签配色列渲染语义色 tag（启用行 success、停用行 danger）
    await expect(enabledRow.locator('.el-tag--success').first()).toBeVisible()
    await expect(disabledRow.locator('.el-tag--danger')).toBeVisible()
  })

  test('登录日志：首行为本次 API 登录记录（admin / 登录 / 成功）', async ({ page }) => {
    await page.goto('/system/login-log')

    // 登录日志异步入库：首拉为空则整页重载重试（expect.poll 兜底队列写入延迟）
    await expect
      .poll(async () => {
        if (!(await page.locator('.vxe-body--row').first().isVisible())) {
          await page.reload()
          return ''
        }
        return await page.locator('.vxe-body--row').first().innerText()
      }, { timeout: 10_000 })
      .toContain('admin')

    const firstRow = page.locator('.vxe-body--row').first()
    await expect(firstRow.locator('.el-tag', { hasText: '登录' })).toBeVisible()
    await expect(firstRow.locator('.el-tag--success')).toBeVisible()
  })
})
