import { describe, expect, it } from '@jest/globals'

import {
  PermissionRegistry,
  SYSTEM_MODULE_NAME,
  SYSTEM_PERMISSIONS,
  validatePermissionPoints,
} from './permissions'

describe('权限点注册表', () => {
  it('应将 system 清单完整登记进注册表', () => {
    const registry = new PermissionRegistry()
    expect(registry.allCodes()).toEqual(SYSTEM_PERMISSIONS.map(point => point.code))
  })

  it('写入侧登记校验：已登记返回 true，未登记返回 false', () => {
    const registry = new PermissionRegistry()
    expect(registry.contains('system:user:query')).toBe(true)
    expect(registry.contains('system:not-registered')).toBe(false)
    expect(registry.contains('other:user:query')).toBe(false)
  })

  it('应拒绝首段不等于模块名的权限串（启动期 fail-fast）', () => {
    expect(() =>
      validatePermissionPoints(SYSTEM_MODULE_NAME, [{ code: 'other:user:query', label: '越界' }]),
    ).toThrow('首段必须等于模块名')
  })

  it('应拒绝重复登记的权限串（跨模块聚合时的唯一性契约）', () => {
    const first = validatePermissionPoints('moduleA', [{ code: 'moduleA:item:query', label: 'A' }])
    expect(() =>
      validatePermissionPoints('moduleA', [{ code: 'moduleA:item:query', label: 'A 重复' }], first),
    ).toThrow('重复登记')
  })

  it('清单自身不得有重复权限串（契约守护：防未来加行时手误）', () => {
    const codes = SYSTEM_PERMISSIONS.map(point => point.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('清单权限串应全部为三段冒号小写形态', () => {
    for (const point of SYSTEM_PERMISSIONS)
      expect(point.code).toMatch(/^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*){2}$/)
  })
})

describe('权限注册表多模块聚合', () => {
  const DEMO_POINTS = [
    { code: 'demo:product:query', label: '商品查询' },
    { code: 'demo:product:create', label: '商品新增' },
  ] as const

  it('业务模块注册后全集与写入侧校验应同时扩容', () => {
    const registry = new PermissionRegistry()
    registry.registerModule({ module: 'demo', points: DEMO_POINTS })
    expect(registry.allCodes()).toContain('demo:product:query')
    expect(registry.allCodes().length).toBe(SYSTEM_PERMISSIONS.length + DEMO_POINTS.length)
    expect(registry.contains('demo:product:create')).toBe(true)
    expect(registry.allPoints().map(point => point.code)).toContain('demo:product:query')
  })

  it('应拒绝重复注册的同名模块', () => {
    const registry = new PermissionRegistry()
    registry.registerModule({ module: 'demo', points: DEMO_POINTS })
    expect(() => registry.registerModule({ module: 'demo', points: DEMO_POINTS })).toThrow('重复注册')
  })

  it('应拒绝清单内重复的权限串（全局唯一契约，防加行手误）', () => {
    const registry = new PermissionRegistry()
    expect(() =>
      registry.registerModule({
        module: 'demo',
        points: [{ code: 'demo:product:query', label: '商品查询' }, { code: 'demo:product:query', label: '重复项' }],
      }),
    ).toThrow('重复登记')
  })

  it('应拒绝首段与模块名不符的权限串（注册入口同样 fail-fast）', () => {
    const registry = new PermissionRegistry()
    expect(() =>
      registry.registerModule({
        module: 'other',
        points: [{ code: 'demo:item:query', label: '串段' }],
      }),
    ).toThrow('首段必须等于模块名')
  })
})
