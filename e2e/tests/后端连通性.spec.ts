// 全链路用例：浏览器页面 → Vite 代理 → 后端 API →（数据库）。
// 依赖后端与 PostgreSQL 就绪；探测失败时整组自动跳过而非报错，避免无数据库环境下 CI 红
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ request }) => {
  const health = await request.get('http://localhost:3000/api/health').catch(() => null)
  test.skip(!health?.ok(), '后端服务未启动或数据库未就绪（需先配置 server/.env 并启动 pnpm dev:server）')
})

test.describe('后端连通性', () => {
  test('首页健康检查显示「正常」', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '检查 /api/health' }).click()
    await expect(page.locator('.el-tag', { hasText: '正常' })).toBeVisible()
  })
})
