// 个人中心：顶栏入口与基本信息展示、改密表单前端校验、修改密码闭环（临时口令 → 新口令重登 → 改回种子口令）。
// 依赖后端与 PostgreSQL 就绪（种子账号 admin/admin123）；探测失败时整组自动跳过。
// 防污染契约：闭环用例走 UI 把口令改回 admin123；afterEach 再以 API 双保险恢复（中途失败也不拖挂后续用例组）。
import { expect, test } from '@playwright/test'

import { loginViaApi, loginViaUi } from './support/auth'

/** 闭环用例的临时口令（结束后改回 admin123） */
const TEMP_PASSWORD = 'e2e-temp-pass'

test.beforeEach(async ({ request }) => {
  // 无库环境（后端 webServer 未注册）下连接被拒会抛异常，须 catch 后按未就绪跳过对齐既有探测写法
  const response = await request.get('http://localhost:3000/api/health').catch(() => null)
  test.skip(!response?.ok(), '后端未就绪，个人中心全链路用例跳过')
})

test.afterEach(async ({ request }) => {
  // 兜底恢复：闭环用例中途失败可能留下临时口令，此处改回种子口令（签名开启的环境下 API 不可达则跳过，UI 主链路仍会改回）
  const seeded = await request.post('http://localhost:3000/api/system/auth/login', {
    data: { username: 'admin', password: 'admin123' },
  }).catch(() => null)
  if (seeded?.ok())
    return // 种子口令完好，无需恢复
  const recovery = await request.post('http://localhost:3000/api/system/auth/login', {
    data: { username: 'admin', password: TEMP_PASSWORD },
  }).catch(() => null)
  if (!recovery?.ok())
    return
  const { data } = await recovery.json() as { data: { token: string } }
  await request.put('http://localhost:3000/api/system/auth/change-password', {
    headers: { Authorization: `Bearer ${data.token}` },
    data: { oldPassword: TEMP_PASSWORD, newPassword: 'admin123' },
  })
})

test('顶栏下拉入口应进入个人中心并展示基本信息', async ({ page, request }) => {
  await loginViaApi(page, request)
  await page.goto('/')
  await page.locator('.user-entry').click()
  await page.getByText('个人中心').click()
  await expect(page).toHaveURL(/\/profile/)
  await expect(page.getByText('基本信息')).toBeVisible()
  await expect(page.getByText('修改密码')).toBeVisible()
  // 基本信息卡：种子账号三要素（账号 / 昵称 / super_admin 角色），限定卡内避免与顶栏昵称撞文本
  const infoCard = page.locator('.el-descriptions')
  await expect(infoCard.getByText('admin', { exact: true })).toBeVisible()
  await expect(infoCard.getByText('系统管理员')).toBeVisible()
  await expect(infoCard.getByText('super_admin')).toBeVisible()
})

test('改密表单：两次输入不一致应被前端拦截（不发起请求）', async ({ page, request }) => {
  await loginViaApi(page, request)
  await page.goto('/profile')
  await page.getByPlaceholder('请输入原密码').fill('admin123')
  await page.getByPlaceholder('请输入新密码（6-32 位）').fill(TEMP_PASSWORD)
  await page.getByPlaceholder('请再次输入新密码').fill('different-pass')
  await page.getByRole('button', { name: '保存并重新登录' }).click()
  await expect(page.getByText('两次输入的密码不一致')).toBeVisible()
  await expect(page).toHaveURL(/\/profile/)
})

test('修改密码闭环：临时口令可重登并改回种子口令', async ({ page, request }) => {
  await loginViaApi(page, request)
  await page.goto('/profile')
  await page.getByPlaceholder('请输入原密码').fill('admin123')
  await page.getByPlaceholder('请输入新密码（6-32 位）').fill(TEMP_PASSWORD)
  await page.getByPlaceholder('请再次输入新密码').fill(TEMP_PASSWORD)
  await page.getByRole('button', { name: '保存并重新登录' }).click()
  // 成功后清令牌回登录页
  await expect(page).toHaveURL(/\/login/)

  // 临时口令可登录（新口令即刻生效）
  await loginViaUi(page, 'admin', TEMP_PASSWORD)
  await expect(page.locator('.user-entry')).toContainText('系统管理员')

  // 改回种子口令（走 UI 主链路，与环境签名策略无关）
  await page.goto('/profile')
  await page.getByPlaceholder('请输入原密码').fill(TEMP_PASSWORD)
  await page.getByPlaceholder('请输入新密码（6-32 位）').fill('admin123')
  await page.getByPlaceholder('请再次输入新密码').fill('admin123')
  await page.getByRole('button', { name: '保存并重新登录' }).click()
  await expect(page).toHaveURL(/\/login/)

  // 种子口令恢复验证
  await loginViaUi(page, 'admin', 'admin123')
  await expect(page.locator('.user-entry')).toContainText('系统管理员')
})
