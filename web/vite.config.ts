// Vite 构建与 Vitest 测试配置：@ 路径别名、开发服务器端口与 /api 后端代理
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 开发环境下将 /api 请求代理到后端服务，规避跨域
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // Vitest 单元测试：store / 纯函数用 node 环境；组件测试需要时可切换为 happy-dom
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
