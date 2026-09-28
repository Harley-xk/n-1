import { describe, expect, it, jest } from '@jest/globals'

import type { RolePermissionEntity } from './entities/role-permission.entity'
import type { RoleEntity } from './entities/role.entity'
import type { UserRoleEntity } from './entities/user-role.entity'
import { PermissionService } from './permission.service'
import { PermissionRegistry, SYSTEM_PERMISSIONS } from './permissions'

function makeService(options: {
  relations?: Partial<UserRoleEntity>[]
  roles?: Partial<RoleEntity>[]
  rolePermissions?: Partial<RolePermissionEntity>[]
}) {
  const userRoleRepository = { find: jest.fn(() => Promise.resolve(options.relations ?? [])) }
  // 模拟真实 Repository 的 where 过滤（status 条件承载「停用角色即时失效」语义，mock 须同样执行）
  const roleRepository = {
    find: jest.fn((criteria: { where?: { status?: boolean } } = {}) => {
      let roles = options.roles ?? []
      if (criteria.where?.status !== undefined)
        roles = roles.filter(role => role.status === criteria.where?.status)
      return Promise.resolve(roles)
    }),
  }
  const rolePermissionRepository = { find: jest.fn(() => Promise.resolve(options.rolePermissions ?? [])) }
  const service = new PermissionService(
    userRoleRepository as never,
    roleRepository as never,
    rolePermissionRepository as never,
    new PermissionRegistry(),
  )
  return { service, roleRepository, rolePermissionRepository }
}

describe('PermissionService 权限集合查询', () => {
  it('无任何角色绑定应返回空集合', async () => {
    const { service } = makeService({})
    await expect(service.getUserPermissionCodes('u1')).resolves.toEqual([])
  })

  it('持有启用的 super_admin 角色应返回注册表全集', async () => {
    const { service } = makeService({
      relations: [{ userId: 'u1', roleId: 'r1' }],
      roles: [{ id: 'r1', code: 'super_admin', status: true }],
    })
    await expect(service.getUserPermissionCodes('u1')).resolves.toEqual(
      SYSTEM_PERMISSIONS.map(point => point.code),
    )
  })

  it('super_admin 角色被停用时应整体失效（不收敛全集，绑定权限也一并剔除）', async () => {
    const { service } = makeService({
      relations: [{ userId: 'u1', roleId: 'r1' }],
      roles: [{ id: 'r1', code: 'super_admin', status: false }],
      rolePermissions: [{ roleId: 'r1', permission: 'system:user:query' }],
    })
    await expect(service.getUserPermissionCodes('u1')).resolves.toEqual([])
  })

  it('停用角色的权限应被剔除（即时失效语义）', async () => {
    const { service, rolePermissionRepository } = makeService({
      relations: [
        { userId: 'u1', roleId: 'r1' },
        { userId: 'u1', roleId: 'r2' },
      ],
      roles: [
        { id: 'r1', code: 'operator', status: true },
        { id: 'r2', code: 'disabled-role', status: false },
      ],
    })
    // 权限查询只应命中启用角色 r1
    rolePermissionRepository.find.mockImplementation(() => Promise.resolve([
      { roleId: 'r1', permission: 'system:user:query' },
      { roleId: 'r1', permission: 'system:role:query' },
    ]))
    await expect(service.getUserPermissionCodes('u1')).resolves.toEqual([
      'system:user:query',
      'system:role:query',
    ])
  })

  it('读取侧应返回库内权限串全集且不过滤注册表（读写不对称）', async () => {
    const { service } = makeService({
      relations: [{ userId: 'u1', roleId: 'r1' }],
      roles: [{ id: 'r1', code: 'operator', status: true }],
      rolePermissions: [
        { roleId: 'r1', permission: 'system:user:query' },
        { roleId: 'r1', permission: 'system:legacy:removed' },
        { roleId: 'r1', permission: 'system:user:query' },
      ],
    })
    // 未注册的历史串 system:legacy:removed 应原样保留（读取侧不过滤）
    await expect(service.getUserPermissionCodes('u1')).resolves.toEqual([
      'system:user:query',
      'system:legacy:removed',
    ])
  })

  it('getUserRoleCodes 应只返回启用角色的 code', async () => {
    const { service } = makeService({
      relations: [
        { userId: 'u1', roleId: 'r1' },
        { userId: 'u1', roleId: 'r2' },
      ],
      roles: [
        { id: 'r1', code: 'operator', status: true },
        { id: 'r2', code: 'stopped', status: false },
      ],
    })
    await expect(service.getUserRoleCodes('u1')).resolves.toEqual(['operator'])
  })
})
