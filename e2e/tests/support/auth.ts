// 认证支撑件：为不同层级的用例提供登录态前置
// - mockAuthState：纯前端用例（不依赖后端）——预置 token 并 mock 权限信息接口，直进主布局
// - loginViaApi：全链路用例（真实后端）——走真实登录接口拿 token 后注入，UI 交互留给登录链路用例自身
import type { Page, APIRequestContext } from '@playwright/test'
import { expect } from '@playwright/test'

/** 纯前端用例的模拟登录态：token 预置 + get-permission-info 路由 mock（守卫拉取即命中） */
export async function mockAuthState(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('N1_TOKEN', 'e2e-mock-token'))
  await page.route('**/api/system/auth/get-permission-info', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        data: {
          user: { id: 'u-e2e', username: 'mock', nickname: '模拟用户' },
          roles: ['operator'],
          // 商品页挂 meta.permission，须授查询权否则「开发示例」分组被菜单过滤
          permissions: ['demo:product:query'],
        },
      }),
    })
  })
}

/**
 * 真实登录（经 API 拿 token 注入 localStorage，免 UI 交互的快速通道）：
 * 供依赖真实后端的布局 / 全链路用例建立登录态；登录页 UI 交互由登录链路用例专门覆盖
 */
export async function loginViaApi(page: Page, request: APIRequestContext): Promise<void> {
  const response = await request.post('http://localhost:3000/api/system/auth/login', {
    data: { username: 'admin', password: 'admin123' },
  })
  expect(response.ok(), '种子账号 admin/admin123 登录应成功（需先执行迁移种子）').toBe(true)
  const { data } = await response.json() as { data: { token: string } }
  await page.addInitScript(token => localStorage.setItem('N1_TOKEN', token), data.token)
}

/** UI 表单登录（登录链路专用）：填账号口令并提交 */
export async function loginViaUi(page: Page, username: string, password: string): Promise<void> {
  await page.getByPlaceholder('请输入登录账号').fill(username)
  await page.getByPlaceholder('请输入登录密码').fill(password)
  await page.getByRole('button', { name: '登 录' }).click()
}
