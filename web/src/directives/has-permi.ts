/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: v-hasPermi 权限指令：无权限的元素在挂载时移除（页面级控制由路由守卫承担，本指令负责页内按钮 / 区块粒度）
 */
import type { Directive } from 'vue'

import { useAuthStore } from '@/stores/auth'

/**
 * 用法：v-hasPermi="'system:user:create'" 或 v-hasPermi="['system:user:update', 'system:user:delete']"
 * 语义与后端 @RequirePermissions 一致：持有任一权限点（OR）即保留元素
 */
export const hasPermi: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const required = Array.isArray(binding.value) ? binding.value : [binding.value]
    if (required.length === 0) {
      return
    }
    const auth = useAuthStore()
    if (!required.some(code => auth.permissions.includes(code)))
      el.parentNode?.removeChild(el)
  },
}
