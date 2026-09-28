// 纯前端链路用例：验证批次三布局门面——骨架渲染、菜单导航、多标签操作（开 / 关 / 批量 / 刷新）、侧栏收起与主题切换
import { expect, test } from '@playwright/test'

/** 页签元素定位（fullPath 为 data-fullpath 属性） */
function tagOf(page: import('@playwright/test').Page, fullPath: string) {
  return page.locator(`.n1-tag[data-fullpath="${fullPath}"]`)
}

/** 右键菜单项定位（每个页签都挂有完整下拉 DOM，须过滤到当前可见的那份） */
function contextItem(page: import('@playwright/test').Page, name: string) {
  return page.getByRole('menuitem', { name }).filter({ visible: true })
}

test.describe('布局门面', () => {
  test('骨架渲染：品牌区、侧栏菜单、标签栏与首页固定签', async ({ page }) => {
    await page.goto('/')

    // 顶栏品牌
    await expect(page.getByText('n-1 管理系统')).toBeVisible()
    // 侧栏菜单（role=menubar 契约）
    await expect(page.getByRole('menuitem', { name: '首页' })).toBeVisible()
    // 标签栏首页固定签 + 右侧操作
    await expect(tagOf(page, '/home')).toBeVisible()
    await expect(page.locator('.n1-tags-bar').getByTitle('刷新当前页')).toBeVisible()
  })

  test('菜单导航落签，关闭页签回到相邻签', async ({ page }) => {
    await page.goto('/')

    // 展开演示目录并进入缓存演示
    await page.getByRole('menuitem', { name: '组件演示' }).click()
    await page.getByRole('menuitem', { name: '缓存演示' }).click()
    await expect(page.getByText('keep-alive 缓存演示')).toBeVisible()
    await expect(tagOf(page, '/demo/cache')).toBeVisible()

    // 关闭当前签：回到左邻（首页固定签）
    await tagOf(page, '/demo/cache').hover()
    await tagOf(page, '/demo/cache').locator('.n1-tag-close').click()
    await expect(tagOf(page, '/demo/cache')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'n-1' })).toBeVisible()
  })
})

test.describe('多标签操作', () => {
  test('query 分立页签与右键批量关闭', async ({ page }) => {
    await page.goto('/demo/tabs')

    // 打开 tab=1 与 tab=2：fullPath 一签，分立三个页签（含无参数原签）
    await page.getByRole('button', { name: '打开 tab=1' }).click()
    await page.getByRole('button', { name: '打开 tab=2' }).click()
    await expect(tagOf(page, '/demo/tabs?tab=1')).toBeVisible()
    await expect(tagOf(page, '/demo/tabs?tab=2')).toBeVisible()

    // 在 tab=2 签上右键「关闭其他」：仅剩首页与 tab=2
    await tagOf(page, '/demo/tabs?tab=2').click({ button: 'right' })
    await contextItem(page, '关闭其他').click()
    await expect(tagOf(page, '/demo/tabs')).toHaveCount(0)
    await expect(tagOf(page, '/demo/tabs?tab=1')).toHaveCount(0)
    await expect(tagOf(page, '/demo/tabs?tab=2')).toBeVisible()
  })

  test('刷新页签强制重建实例（keep-alive 缓存排除）', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('menuitem', { name: '组件演示' }).click()
    await page.getByRole('menuitem', { name: '缓存演示' }).click()
    // 计数 +1 后刷新：实例重建，计数归零
    await page.getByRole('button', { name: '计数 +1' }).click()
    await expect(page.locator('.el-tag', { hasText: '1' })).toBeVisible()
    await tagOf(page, '/demo/cache').click({ button: 'right' })
    await contextItem(page, '刷新页签').click()
    await expect(page.locator('.el-tag', { hasText: '0' })).toBeVisible()
  })
})

test.describe('外观状态', () => {
  test('侧栏收起并持久化', async ({ page }) => {
    await page.goto('/')

    await page.getByTitle('收起侧栏').click()
    await expect(page.locator('.n1-sidebar.collapsed')).toBeVisible()

    // 刷新后保持收起（N1_APP 持久化）
    await page.reload()
    await expect(page.locator('.n1-sidebar.collapsed')).toBeVisible()
  })

  test('主题切换：深色模式落 html.dark 类', async ({ page }) => {
    await page.goto('/')

    await page.getByTitle('主题设置').click()
    await page.getByText('深色').click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 刷新后保持深色
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
