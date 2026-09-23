/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 轮询后端 HTTP 端口直至其就绪后退出，作为组合调试的前置任务，
 *       确保浏览器在后端可响应请求后才打开。判定依据：收到任意 HTTP 响应
 *       （含 404/401）即视为就绪，因为 NestJS 的 app.listen() 是 bootstrap 的最后一步
 */

import http from 'node:http'

// 可用环境变量覆盖默认值：BACKEND_HOST / BACKEND_PORT / WAIT_TIMEOUT_MS
const host = process.env.BACKEND_HOST || '127.0.0.1'
const port = Number(process.env.BACKEND_PORT || 3000)
const intervalMs = 500
const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS || 60000)

const start = Date.now()

// 探测后端是否已就绪：收到任意 HTTP 响应即视为就绪
function probe() {
  return new Promise((resolve) => {
    const req = http.get({ hostname: host, port, path: '/', timeout: 1500 }, (res) => {
      res.resume() // 丢弃响应体，只关心是否收到响应
      resolve(true)
    })
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
    req.on('error', () => resolve(false))
  })
}

async function main() {
  process.stdout.write(`[wait-for-server] 等待后端 http://${host}:${port} 就绪 ...\n`)
  while (Date.now() - start < timeoutMs) {
    if (await probe()) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      process.stdout.write(`[wait-for-server] 后端已就绪（耗时 ${elapsed}s），即将打开前端页面\n`)
      process.exit(0)
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  process.stdout.write(`[wait-for-server] 超时（${elapsed}s）未检测到后端，仍继续打开前端页面，请确认后端已正常启动\n`)
  process.exit(0)
}

main()
