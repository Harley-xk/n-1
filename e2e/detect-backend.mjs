// 后端可拉起性探测（供 playwright.config.ts 经 spawnSync 同步调用）：
// 3000 端口已有服务（复用既有实例）或数据库端口可达（可自动拉起）时输出 true，否则 false。
// 独立为 .mjs 是因为 Playwright 1.63 的配置文件不支持异步函数导出，只能在配置加载期同步取得探测结果。
import { createConnection } from 'node:net'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BACKEND_HOST = 'localhost'
const BACKEND_PORT = 3000

/** 探测 TCP 端口是否可连（超时即视为不可达） */
function isPortOpen(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port })
    const settle = (ok) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs, () => settle(false))
    socket.once('connect', () => settle(true))
    socket.once('error', () => settle(false))
  })
}

/** 从 server/.env（缺省回退 .env.example）解析数据库连接目标 */
function readDbEndpoint() {
  const e2eDir = dirname(fileURLToPath(import.meta.url))
  const envFile = [join(e2eDir, '../server/.env'), join(e2eDir, '../server/.env.example')]
    .find(path => existsSync(path))

  if (!envFile)
    return { host: 'localhost', port: 5432 }

  const values = new Map()
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(DB_HOST|DB_PORT)\s*=\s*(\S+)\s*$/)
    if (match)
      values.set(match[1], match[2])
  }
  return {
    host: values.get('DB_HOST') || 'localhost',
    port: Number(values.get('DB_PORT')) || 5432,
  }
}

const backendRunning = await isPortOpen(BACKEND_HOST, BACKEND_PORT)
const db = backendRunning ? null : readDbEndpoint()
const dbReachable = backendRunning || (await isPortOpen(db.host, db.port))
process.stdout.write(dbReachable ? 'true' : 'false')
