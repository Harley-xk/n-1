/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 权限集合查询服务：Guard 逐请求调用，收敛 super_admin 全集与停用角色剔除语义（权限设计 §4）
 */
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In } from 'typeorm'
import type { Repository } from 'typeorm'

import { RolePermissionEntity } from './entities/role-permission.entity'
import { RoleEntity } from './entities/role.entity'
import { UserRoleEntity } from './entities/user-role.entity'
import { PermissionRegistry } from './permissions'
import { SUPER_ADMIN_ROLE_CODE } from './system.constants'

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
    private readonly registry: PermissionRegistry,
  ) {}

  /** 查用户权限串集合：停用角色即时剔除；持有启用的 super_admin 时返回注册表全集；读取侧不过滤注册表（读写不对称） */
  async getUserPermissionCodes(userId: string): Promise<string[]> {
    const roles = await this.getUserEnabledRoles(userId)
    if (roles.some(role => role.code === SUPER_ADMIN_ROLE_CODE))
      return this.registry.allCodes()
    if (roles.length === 0)
      return []
    const relations = await this.rolePermissionRepository.find({
      where: { roleId: In(roles.map(role => role.id)) },
    })
    return [...new Set(relations.map(relation => relation.permission))]
  }

  /** 查用户启用角色的 code 列表（get-permission-info 的 roles 字段） */
  async getUserRoleCodes(userId: string): Promise<string[]> {
    const roles = await this.getUserEnabledRoles(userId)
    return roles.map(role => role.code)
  }

  /** 查用户的启用角色实体（停用角色的权限即时失效，查询侧仅计入 status = true） */
  private async getUserEnabledRoles(userId: string): Promise<RoleEntity[]> {
    const relations = await this.userRoleRepository.find({ where: { userId } })
    if (relations.length === 0)
      return []
    return this.roleRepository.find({
      where: { id: In(relations.map(relation => relation.roleId)), status: true },
    })
  }
}
