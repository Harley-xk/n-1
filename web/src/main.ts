/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 前端应用入口：装配 Pinia、路由与 Element Plus（中文语言包）并挂载根组件
 */

import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
