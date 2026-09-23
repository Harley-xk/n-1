/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 示例 Pinia Store：演示 state / getters / actions 基本用法，业务模块请按领域拆分
 */

import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
  }),
  getters: {
    doubleCount: state => state.count * 2,
  },
  actions: {
    increment() {
      this.count += 1
    },
  },
})
