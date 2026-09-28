// Playwright 浏览器端到端测试配置：条件双 webServer（前端 5173 + 后端 3000）。
// 后端是否自动拉起由 detect-backend.mjs 同步探测决定（3000 已有服务则复用、数据库可达才拉起）；
// 无库环境不注册后端 webServer，全链路用例交由 tests/后端连通性.spec.ts 的探测自动跳过。
// 浏览器复用本机已安装的 Chrome / Edge（channel 方式，无需下载 chromium）：
//   默认 chrome；E2E_BROWSER=msedge 切换 Edge；E2E_BROWSER=chromium 使用 Playwright 自带内核
//   （该模式需先执行 pnpm --filter e2e exec playwright install chromium）
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, devices } from '@playwright/test'

// 浏览器通道：chrome / msedge 复用系统浏览器；chromium 为 Playwright 自带内核
const channel = process.env.E2E_BROWSER || 'chrome'

// 后端可拉起性探测：Playwright 1.63 配置不支持异步导出，经子进程同步取得探测结果
const backendAvailable
  = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'detect-backend.mjs')], {
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10_000,
    }).stdout?.toString().trim() === 'true'

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
  webServer: backendAvailable
    ? [
        {
          // 后端一次性启动（非 watch）；健康探测 /api/health，本地已启动则直接复用
          command: 'pnpm --filter server run start',
          url: 'http://localhost:3000/api/health',
          reuseExistingServer: true,
          cwd: '..',
          timeout: 120_000,
        },
        {
          // 在仓库根目录执行，拉起 web 开发服务器；本地已启动则直接复用
          command: 'pnpm --filter web run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
          cwd: '..',
          timeout: 60_000,
        },
      ]
    : [
        {
          // 无库环境兜底：仅前端（全链路用例由测试内探测自动跳过）
          command: 'pnpm --filter web run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
          cwd: '..',
          timeout: 60_000,
        },
      ],
})
