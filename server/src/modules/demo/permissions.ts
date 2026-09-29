/*
 * 作者: Harley-xk
 * 创建: 2026-09-29
 *
 * 描述: demo 模块权限点代码注册表：业务模块样板（接入方式见 docs/指南/新模块接入指南.md 第 3 步）
 */
import type { PermissionPoint } from '../system/permissions'

/**
 * 权限点常量：注解与业务代码一律引用常量而非裸字符串（与错误码常量同一哲学）。
 * 三段冒号小写「模块:域:操作」，首段必须等于提供模块的注册名。
 */
export const DEMO_PERMISSION_CODES = {
  PRODUCT_QUERY: 'demo:product:query',
  PRODUCT_CREATE: 'demo:product:create',
  PRODUCT_UPDATE: 'demo:product:update',
  PRODUCT_DELETE: 'demo:product:delete',
} as const

/** demo 模块的注册名（权限串首段须与之相等，注册表启动期校验） */
export const DEMO_MODULE_NAME = 'demo'

/** 权限点清单：登记处即唯一出处，新增权限点在此加行 */
export const DEMO_PERMISSIONS: readonly PermissionPoint[] = [
  { code: DEMO_PERMISSION_CODES.PRODUCT_QUERY, label: '商品查询' },
  { code: DEMO_PERMISSION_CODES.PRODUCT_CREATE, label: '商品新增' },
  { code: DEMO_PERMISSION_CODES.PRODUCT_UPDATE, label: '商品修改' },
  { code: DEMO_PERMISSION_CODES.PRODUCT_DELETE, label: '商品删除' },
]
