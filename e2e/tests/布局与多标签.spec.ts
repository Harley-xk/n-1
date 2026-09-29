// 纯前端链路用例：验证批次三布局门面——骨架渲染、菜单导航、多标签操作（开 / 关 / 批量 / 刷新）、侧栏收起与主题切换（认证态经路由 mock 建立）
// 页签 / 缓存验收载体自批次六起为商品管理页（原「组件演示」两页已删除）
import { expect, test } from '@playwright/test'

import { mockAuthState } from './support/auth'

/**
 * 商品页数据接口 mock：本组为纯前端链路，避免页面请求带假 token 打到真实后端被 401 整页接管。
 * 注意用函数谓词而非 glob 匹配——分页请求携带 pageNo / pageSize 等 query，glob 不匹配带 query 的 URL，
 * 一旦漏 mock 命中真后端，401 会触发 http 层整页跳登录（假 token 又被守卫弹回首页，症状极具迷惑性）
 */
async function mockProductApi(page: import('@playwright/test').Page): Promise<void> {
  await page.route(
    url => url.pathname === '/api/system/dict/list-all-simple',
    route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: [] }),
    }),
  )
  await page.route(
    url => url.pathname === '/api/demo/product/page',
    route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: { list: [], total: 0 } }),
    }),
  )
}

test.beforeEach(async ({ page }) => {
  await mockAuthState(page)
  await mockProductApi(page)
})

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

    // 展开开发示例目录并进入商品管理
    await page.getByRole('menuitem', { name: '开发示例' }).click()
    await page.getByRole('menuitem', { name: '商品管理' }).click()
    await expect(page.getByPlaceholder('名称模糊匹配')).toBeVisible()
    await expect(tagOf(page, '/demo/product')).toBeVisible()

    // 关闭当前签：回到左邻（首页固定签）
    await tagOf(page, '/demo/product').hover()
    await tagOf(page, '/demo/product').locator('.n1-tag-close').click()
    await expect(tagOf(page, '/demo/product')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'n-1' })).toBeVisible()
  })
})

test.describe('多标签操作', () => {
  test('query 分立页签与右键批量关闭', async ({ page }) => {
    // 直链带不同 query 依次落地：fullPath 一签，分立三个页签（含无参数原签）。
    // 每次落地即断言落签——整页导航的落签在路由守卫异步完成后发生，连续 goto 会打断上一次落签
    await page.goto('/demo/product')
    await expect(tagOf(page, '/demo/product')).toBeVisible()
    await page.goto('/demo/product?from=a')
    await expect(tagOf(page, '/demo/product?from=a')).toBeVisible()
    await page.goto('/demo/product?from=b')
    await expect(tagOf(page, '/demo/product?from=b')).toBeVisible()

    // 在 from=b 签上右键「关闭其他」：仅剩首页与 from=b
    await tagOf(page, '/demo/product?from=b').click({ button: 'right' })
    await contextItem(page, '关闭其他').click()
    await expect(tagOf(page, '/demo/product')).toHaveCount(0)
    await expect(tagOf(page, '/demo/product?from=a')).toHaveCount(0)
    await expect(tagOf(page, '/demo/product?from=b')).toBeVisible()
  })

  test('刷新页签强制重建实例（keep-alive 缓存排除）', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('menuitem', { name: '开发示例' }).click()
    await page.getByRole('menuitem', { name: '商品管理' }).click()
    // 搜索关键字即页面状态：切走切回应保留（keep-alive 缓存生效）
    const keyword = page.getByPlaceholder('名称模糊匹配')
    await keyword.fill('蓝牙')
    await tagOf(page, '/home').click()
    await tagOf(page, '/demo/product').click()
    await expect(keyword).toHaveValue('蓝牙')

    // 右键「刷新页签」：缓存排除 + 实例重建，关键字清空
    await tagOf(page, '/demo/product').click({ button: 'right' })
    await contextItem(page, '刷新页签').click()
    await expect(keyword).toHaveValue('')
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
