/// <reference types="vitest/config" />
// Vite 构建与 Vitest 测试配置：@ 路径别名、开发服务器端口与 /api 后端代理
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 5180：避开 Vite 默认 5173（本机常被其他项目占用）；strictPort 占用时立即失败而非跳号，
    // 避免静默漂移到其他端口后 e2e 复用 / 代理定位错乱
    port: 5180,
    strictPort: true,
    proxy: {
      // 开发环境下将 /api 请求代理到后端服务，规避跨域
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // Vitest 单元测试：jsdom 环境支持组件测试（@vue/test-utils），store / 纯函数用例同样兼容
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
})
