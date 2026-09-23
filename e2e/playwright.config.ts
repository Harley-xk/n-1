// Playwright 浏览器端到端测试配置：自动拉起前端开发服务器（复用已启动实例）；
// 后端不在此自动拉起（依赖 PostgreSQL），未就绪时链路用例自动跳过（见 tests/后端连通性.spec.ts）。
// 浏览器复用本机已安装的 Chrome / Edge（channel 方式，无需下载 chromium）：
//   默认 chrome；E2E_BROWSER=msedge 切换 Edge；E2E_BROWSER=chromium 使用 Playwright 自带内核
//   （该模式需先执行 pnpm --filter e2e exec playwright install chromium）
import { defineConfig, devices } from '@playwright/test'

// 浏览器通道：chrome / msedge 复用系统浏览器；chromium 为 Playwright 自带内核
const channel = process.env.E2E_BROWSER || 'chrome'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // CI 环境禁止 .only，失败自动重试
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    // Chrome 与 Edge 同为 Chromium 内核，共用 Desktop Chrome 设备描述
    { name: channel, use: { ...devices['Desktop Chrome'], channel } },
  ],
  webServer: {
    // 在仓库根目录执行，拉起 web 开发服务器；本地已启动则直接复用
    command: 'pnpm --filter web run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    cwd: '..',
    timeout: 60_000,
  },
})
