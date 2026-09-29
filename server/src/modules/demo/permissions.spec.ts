import { describe, expect, it } from '@jest/globals'

import { DEMO_MODULE_NAME, DEMO_PERMISSIONS } from './permissions'
import { PermissionRegistry } from '../system/permissions'

describe('demo 模块权限点注册表', () => {
  it('清单自身不得有重复权限串（契约守护：防未来加行时手误）', () => {
    const codes = DEMO_PERMISSIONS.map(point => point.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('清单权限串应全部为三段冒号小写形态且首段为 demo', () => {
    for (const point of DEMO_PERMISSIONS) {
      expect(point.code).toMatch(/^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*){2}$/)
      expect(point.code.startsWith(`${DEMO_MODULE_NAME}:`)).toBe(true)
    }
  })

  it('接入注册表应校验通过并扩容全集（与启动期同链路的冒烟）', () => {
    const registry = new PermissionRegistry()
    registry.registerModule({ module: DEMO_MODULE_NAME, points: DEMO_PERMISSIONS })
    expect(registry.allCodes().length).toBe(34)
    expect(registry.contains('demo:product:query')).toBe(true)
  })
})
