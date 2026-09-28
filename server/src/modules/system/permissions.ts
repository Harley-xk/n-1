/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 权限点代码注册表：权限串的字面量唯一出处（注册表设计见 docs/指南/权限设计.md，ADR-001 配套）
 */
import { Injectable, SetMetadata } from '@nestjs/common'

/**
 * 权限点常量：注解与业务代码一律引用常量而非裸字符串（与错误码常量同一哲学）。
 * 三段冒号小写「模块:域:操作」，首段必须等于提供模块的注册名。
 */
export const SYSTEM_PERMISSION_CODES = {
  USER_QUERY: 'system:user:query',
  USER_CREATE: 'system:user:create',
  USER_UPDATE: 'system:user:update',
  USER_DELETE: 'system:user:delete',
  USER_RESET_PASSWORD: 'system:user:reset-password',
  ROLE_QUERY: 'system:role:query',
  ROLE_CREATE: 'system:role:create',
  ROLE_UPDATE: 'system:role:update',
  ROLE_DELETE: 'system:role:delete',
  ROLE_ASSIGN_PERMISSION: 'system:role:assign-permission',
} as const

/** 权限点元数据（code + 中文名，中文名供角色分配界面展示） */
export interface PermissionPoint {
  /** 权限串，如 'system:user:query' */
  readonly code: string
  /** 中文名，如 '用户查询' */
  readonly label: string
}

/** system 模块的注册名（权限串首段须与之相等，启动期校验） */
export const SYSTEM_MODULE_NAME = 'system'

/** 权限点清单：登记处即唯一出处，新增权限点在此加行（批次五起随模块扩展） */
export const SYSTEM_PERMISSIONS: readonly PermissionPoint[] = [
  { code: SYSTEM_PERMISSION_CODES.USER_QUERY, label: '用户查询' },
  { code: SYSTEM_PERMISSION_CODES.USER_CREATE, label: '用户新增' },
  { code: SYSTEM_PERMISSION_CODES.USER_UPDATE, label: '用户修改' },
  { code: SYSTEM_PERMISSION_CODES.USER_DELETE, label: '用户删除' },
  { code: SYSTEM_PERMISSION_CODES.USER_RESET_PASSWORD, label: '重置密码' },
  { code: SYSTEM_PERMISSION_CODES.ROLE_QUERY, label: '角色查询' },
  { code: SYSTEM_PERMISSION_CODES.ROLE_CREATE, label: '角色新增' },
  { code: SYSTEM_PERMISSION_CODES.ROLE_UPDATE, label: '角色修改' },
  { code: SYSTEM_PERMISSION_CODES.ROLE_DELETE, label: '角色删除' },
  { code: SYSTEM_PERMISSION_CODES.ROLE_ASSIGN_PERMISSION, label: '分配权限' },
]

/**
 * 注册表装配校验（纯函数，供启动期与单测共用）：
 * 校验「code 首段 === 提供模块名」「code 全局唯一」，违反立即抛错（fail-fast 阻止启动）。
 */
export function validatePermissionPoints(
  moduleName: string,
  points: readonly PermissionPoint[],
  existing: ReadonlyMap<string, PermissionPoint> = new Map(),
): Map<string, PermissionPoint> {
  const merged = new Map(existing)
  for (const point of points) {
    if (!point.code.startsWith(`${moduleName}:`))
      throw new Error(`权限串「${point.code}」首段必须等于模块名「${moduleName}」`)
    if (merged.has(point.code))
      throw new Error(`权限串「${point.code}」重复登记`)
    merged.set(point.code, point)
  }
  return merged
}

/**
 * 权限点注册表：启动期经 validatePermissionPoints 校验后登记 system 清单。
 * 提供读取侧全集（super_admin 语义）与写入侧登记校验（读写不对称策略，见权限设计 §4.3）。
 * 批次六样板模块接入时扩展为 PermissionProvider 多模块聚合形态。
 */
@Injectable()
export class PermissionRegistry {
  private readonly points: ReadonlyMap<string, PermissionPoint>

  constructor() {
    this.points = validatePermissionPoints(SYSTEM_MODULE_NAME, SYSTEM_PERMISSIONS)
  }

  /** 全部已登记权限串（super_admin 全集语义的数据源；注册表新增权限点超管自动拥有） */
  allCodes(): string[] {
    return [...this.points.keys()]
  }

  /** 写入侧登记校验：分配接口逐串调用，未登记返回 false 由调用方抛 ROLE_PERMISSION_UNKNOWN */
  contains(code: string): boolean {
    return this.points.has(code)
  }
}

/** @RequirePermissions 装饰器的 metadata key（PermissionsGuard 读取） */
export const REQUIRE_PERMISSIONS_METADATA = 'system:require-permissions'

/**
 * 接口权限注解：任一命中即放行（OR 语义）。
 * 无该注解的已认证接口 = 仅需登录。
 *
 * @example
 * ```ts
 * @RequirePermissions(SYSTEM_PERMISSION_CODES.USER_QUERY)
 * ```
 */
export const RequirePermissions = (...codes: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_PERMISSIONS_METADATA, codes)
