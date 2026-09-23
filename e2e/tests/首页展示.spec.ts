// 纯前端链路用例：不依赖后端服务，验证首页文案与 Pinia 示例交互
import { expect, test } from '@playwright/test'

test.describe('首页展示', () => {
  test('标题与定位副标题可见', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'n-1' })).toBeVisible()
    await expect(page.getByText('企业级全栈项目框架底座 · vibe coding first')).toBeVisible()
  })

  test('Pinia 计数器示例可交互', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('count = 0，doubleCount = 0')).toBeVisible()
    await page.getByRole('button', { name: 'increment' }).click()
    await expect(page.getByText('count = 1，doubleCount = 2')).toBeVisible()
  })
})
