/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 前端应用入口：装配 Pinia、路由守卫与 Element Plus（中文语言包 + 暗色变量）并挂载根组件
 */

import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/styles/index.css'

import App from './App.vue'
import router from './router'
import { setupRouterGuard } from './router/guard'

const app = createApp(App)

app.use(createPinia())
// 守卫依赖 Pinia（页签 store），须在 Pinia 装配后、路由挂载前安装
setupRouterGuard(router)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
