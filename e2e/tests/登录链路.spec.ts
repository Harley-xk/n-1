// 全链路用例：认证授权链路（登录成功 / 失败 / 未登录重定向与回跳 / 退出登录）。
// 依赖后端与 PostgreSQL 就绪（种子账号 admin/admin123）；探测失败时整组自动跳过
import { expect, test } from '@playwright/test'

import { loginViaUi } from './support/auth'

test.beforeEach(async ({ request }) => {
  const health = await request.get('http://localhost:3000/api/health').catch(() => null)
  test.skip(!health?.ok(), '后端服务未启动或数据库未就绪（需先配置 server/.env 并启动 pnpm dev:server）')
})

test.describe('登录链路', () => {
  test('登录成功：进入首页并显示用户昵称', async ({ page }) => {
    await page.goto('/login')
    await loginViaUi(page, 'admin', 'admin123')

    // 落首页 + 顶栏用户区显示种子账号昵称（.user-entry 为选择器契约）
    await expect(page.getByRole('heading', { name: 'n-1' })).toBeVisible()
    await expect(page.locator('.user-entry').getByText('系统管理员')).toBeVisible()
  })

  test('登录失败：错误口令弹错并停留登录页', async ({ page }) => {
    await page.goto('/login')
    await loginViaUi(page, 'admin', 'wrong-password')

    // 后端业务错误经 http 层统一弹错；页面停留登录页
    await expect(page.locator('.el-message').getByText('登录账号或密码不正确')).toBeVisible()
    await expect(page.getByPlaceholder('请输入登录账号')).toBeVisible()
  })

  test('未登录访问受保护页重定向登录页，登录后回跳原址', async ({ page }) => {
    await page.goto('/demo/tabs')

    // 守卫拦截：跳登录页并回带 redirect（地址栏 query 为未编码形态）
    await expect(page).toHaveURL(/\/login\?redirect=\/demo\/tabs/)

    // 登录后回跳原址
    await loginViaUi(page, 'admin', 'admin123')
    await expect(page.getByRole('button', { name: '打开 tab=1' })).toBeVisible()
  })

  test('退出登录：确认后回登录页，再访问受保护页要求重新登录', async ({ page }) => {
    await page.goto('/login')
    await loginViaUi(page, 'admin', 'admin123')
    await expect(page.getByRole('heading', { name: 'n-1' })).toBeVisible()

    // 用户下拉退出（confirm 确认）
    await page.locator('.user-entry').click()
    await page.getByText('退出登录').click()
    await page.getByRole('button', { name: '退出' }).click()

    await expect(page).toHaveURL(/\/login/)
    // 登出后再直链受保护页：重新要求登录
    await page.goto('/demo/tabs')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })
})
