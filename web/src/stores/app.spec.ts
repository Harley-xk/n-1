import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAppStore } from '@/stores/app'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  setActivePinia(createPinia())
})

describe('应用外观状态', () => {
  it('主题切换：落 html.dark 类并持久化', () => {
    const app = useAppStore()

    app.setTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('N1_APP')).toContain('"theme":"dark"')

    app.setTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('N1_APP')).toContain('"theme":"light"')
  })

  it('设置随 localStorage 恢复（主题与手动收起）', () => {
    localStorage.setItem('N1_APP', JSON.stringify({ theme: 'dark', sidebarCollapsed: true }))

    const app = useAppStore()

    expect(app.theme).toBe('dark')
    expect(app.sidebarCollapsed).toBe(true)
    expect(app.isDark).toBe(true)
  })

  it('脏数据兜底：非法主题回落浅色', () => {
    localStorage.setItem('N1_APP', '{"theme":"blue","sidebarCollapsed":true}')

    const app = useAppStore()

    expect(app.theme).toBe('light')
    // 收起态仍恢复（单字段脏不拖累整体）
    expect(app.sidebarCollapsed).toBe(true)
  })

  it('侧栏收起：手动开关持久化，窄屏强制收起并叠加手动态', () => {
    const app = useAppStore()

    expect(app.effectiveSidebarCollapsed).toBe(false)
    app.toggleSidebar()
    expect(app.sidebarCollapsed).toBe(true)
    expect(app.effectiveSidebarCollapsed).toBe(true)
    expect(localStorage.getItem('N1_APP')).toContain('"sidebarCollapsed":true')

    // 窄屏下：手动展开也被强制收起
    app.toggleSidebar()
    app.isNarrowScreen = true
    expect(app.effectiveSidebarCollapsed).toBe(true)
    app.isNarrowScreen = false
    expect(app.effectiveSidebarCollapsed).toBe(false)
  })

  it('跟随系统：auto 模式随系统深色偏好生效', () => {
    const app = useAppStore()

    app.setTheme('auto')
    expect(app.isDark).toBe(false)

    app.systemDark = true
    app.applyTheme()
    expect(app.isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
