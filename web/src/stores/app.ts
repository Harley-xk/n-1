/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 应用外观状态：主题（浅色/深色/跟随系统）、侧栏手动收起、窄屏断点（持久化 key N1_APP）
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { readLocalJson, writeLocalJson } from '@/utils/storage'

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'auto'

/** 外观设置持久化结构 */
interface AppSettings {
  theme: ThemeMode
  sidebarCollapsed: boolean
}

const SETTINGS_KEY = 'N1_APP'

/** 窄屏断点（≤992px 自动收起侧栏） */
const NARROW_BREAKPOINT = '(max-width: 992px)'

function loadSettings(): AppSettings {
  const saved = readLocalJson<Partial<AppSettings>>(SETTINGS_KEY)
  return {
    theme: saved?.theme === 'dark' || saved?.theme === 'auto' ? saved.theme : 'light',
    sidebarCollapsed: saved?.sidebarCollapsed === true,
  }
}

export const useAppStore = defineStore('app', () => {
  const initial = loadSettings()

  /** 主题模式（浅色 / 深色 / 跟随系统） */
  const theme = ref<ThemeMode>(initial.theme)

  /** 侧栏手动收起态（用户意愿；窄屏自动收起独立叠加） */
  const sidebarCollapsed = ref(initial.sidebarCollapsed)

  /** 系统深色偏好（跟随系统模式的依据） */
  const systemDark = ref(false)

  /** 窄屏标记（≤992px，侧栏无条件收起） */
  const isNarrowScreen = ref(false)

  /** 实际生效的深色态 */
  const isDark = computed(
    () => theme.value === 'dark' || (theme.value === 'auto' && systemDark.value),
  )

  /** 实际生效的侧栏收起态：窄屏强制收起，宽屏取手动状态 */
  const effectiveSidebarCollapsed = computed(() => isNarrowScreen.value || sidebarCollapsed.value)

  function persist(): void {
    const settings: AppSettings = {
      theme: theme.value,
      sidebarCollapsed: sidebarCollapsed.value,
    }
    writeLocalJson(SETTINGS_KEY, settings)
  }

  /** 深色类落到 <html>（Element Plus 暗色变量与 --n1-* 深色套均以 html.dark 激活） */
  function applyTheme(): void {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  /** 切换主题并立即生效 */
  function setTheme(mode: ThemeMode): void {
    theme.value = mode
    applyTheme()
    persist()
  }

  /** 切换侧栏手动收起态 */
  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
    persist()
  }

  /** 挂载媒体查询监听（系统配色 + 窄屏断点；store 生命周期即应用生命周期，不卸载） */
  function setupMediaQueries(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = colorScheme.matches
    colorScheme.addEventListener('change', (event) => {
      systemDark.value = event.matches
      applyTheme()
    })
    const narrow = window.matchMedia(NARROW_BREAKPOINT)
    isNarrowScreen.value = narrow.matches
    narrow.addEventListener('change', (event) => {
      isNarrowScreen.value = event.matches
    })
  }

  return {
    theme,
    sidebarCollapsed,
    systemDark,
    isNarrowScreen,
    isDark,
    effectiveSidebarCollapsed,
    setTheme,
    toggleSidebar,
    applyTheme,
    setupMediaQueries,
  }
})
