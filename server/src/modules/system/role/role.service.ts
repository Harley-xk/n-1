/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 角色服务：分页查询、创建、更新、软删、权限分配（内置角色保护 + 读写不对称 + 差集增量绑定）
 */
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Like } from 'typeorm'
import type { FindOptionsWhere, Repository } from 'typeorm'

import { businessError } from '../../../common/exceptions/business-error'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { RolePermissionEntity } from '../entities/role-permission.entity'
import { RoleEntity } from '../entities/role.entity'
import { UserRoleEntity } from '../entities/user-role.entity'
import { SystemErrorCode } from '../error-codes'
import { PermissionRegistry } from '../permissions'
import { SUPER_ADMIN_ROLE_CODE, SUPER_ADMIN_ROLE_ID } from '../system.constants'
import type { RoleCreateDto, RoleDetailVo, RolePageDto, RoleUpdateDto, RoleVo } from './dto/role.dto'

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    private readonly registry: PermissionRegistry,
  ) {}

  /** 分页查询（名称模糊、状态精确过滤） */
  async getPage(dto: RolePageDto): Promise<PageResult<RoleVo>> {
    const where: FindOptionsWhere<RoleEntity> = {}
    if (dto.name !== undefined)
      where.name = Like(`%${dto.name}%`)
    if (dto.status !== undefined)
      where.status = dto.status
    const [list, total] = await this.roleRepository.findAndCount({
      where,
      skip: (dto.pageNo - 1) * dto.pageSize,
      take: dto.pageSize,
      order: { sort: 'ASC', createTime: 'DESC' },
    })
    return { list: list.map(role => this.toVo(role)), total }
  }

  /** 角色详情（含权限串回显，读取侧不过滤注册表） */
  async getDetail(id: string): Promise<RoleDetailVo> {
    const role = await this.getExistsRole(id)
    const relations = await this.rolePermissionRepository.find({ where: { roleId: role.id } })
    return { ...this.toVo(role), permissions: relations.map(relation => relation.permission) }
  }

  /** 创建角色：code 查重；super_admin 为内置保留字拒绝创建（防止伪造同名角色获得全集判定） */
  async create(dto: RoleCreateDto): Promise<string> {
    if (dto.code === SUPER_ADMIN_ROLE_CODE)
      throw businessError(SystemErrorCode.ROLE_CODE_DUPLICATE.message, {
        code: SystemErrorCode.ROLE_CODE_DUPLICATE,
      })
    const duplicated = await this.roleRepository.findOne({ where: { code: dto.code } })
    if (duplicated)
      throw businessError(SystemErrorCode.ROLE_CODE_DUPLICATE.message, {
        code: SystemErrorCode.ROLE_CODE_DUPLICATE,
      })
    const role = await this.roleRepository.save(
      this.roleRepository.create({
        name: dto.name,
        code: dto.code,
        sort: dto.sort ?? 0,
        remark: dto.remark ?? null,
      }),
    )
    return role.id
  }

  /** 更新角色基本信息（code 不可改；内置角色保护） */
  async update(dto: RoleUpdateDto): Promise<void> {
    const role = await this.getExistsRole(dto.id)
    this.validateNotBuiltinRole(role.id)
    role.name = dto.name
    role.status = dto.status
    role.sort = dto.sort ?? role.sort
    role.remark = dto.remark ?? null
    await this.roleRepository.save(role)
  }

  /** 删除角色：软删 + 物理清理两类关联（内置角色保护） */
  async remove(id: string): Promise<void> {
    const role = await this.getExistsRole(id)
    this.validateNotBuiltinRole(role.id)
    await this.roleRepository.softRemove(role)
    await this.rolePermissionRepository.delete({ roleId: role.id })
    await this.userRoleRepository.delete({ roleId: role.id })
  }

  /** 权限串回显 */
  async getPermissions(id: string): Promise<string[]> {
    const role = await this.getExistsRole(id)
    const relations = await this.rolePermissionRepository.find({ where: { roleId: role.id } })
    return relations.map(relation => relation.permission)
  }

  /** 分配权限：写入侧逐串校验注册表登记（读写不对称）；差集增量绑定（内置角色保护——super_admin 全集语义下分配无意义） */
  async assignPermissions(roleId: string, permissions: string[]): Promise<void> {
    const role = await this.getExistsRole(roleId)
    this.validateNotBuiltinRole(role.id)
    // 写入侧登记校验：拒绝未在代码注册表登记的权限串入库
    const unknown = permissions.filter(code => !this.registry.contains(code))
    if (unknown.length > 0)
      throw businessError(`${SystemErrorCode.ROLE_PERMISSION_UNKNOWN.message}：${unknown.join('、')}`, {
        code: SystemErrorCode.ROLE_PERMISSION_UNKNOWN,
        data: unknown,
      })
    const existing = await this.rolePermissionRepository.find({ where: { roleId: role.id } })
    const existingCodes = new Set(existing.map(relation => relation.permission))
    const targetCodes = new Set(permissions)
    // 删除：现有但目标没有
    const toRemove = [...existingCodes].filter(code => !targetCodes.has(code))
    if (toRemove.length > 0)
      await this.rolePermissionRepository.delete({ roleId: role.id, permission: In(toRemove) })
    // 插入：目标但现有没有
    const toAdd = [...targetCodes].filter(code => !existingCodes.has(code))
    if (toAdd.length > 0) {
      await this.rolePermissionRepository.insert(
        toAdd.map(permission => ({ roleId: role.id, permission })),
      )
    }
  }

  /** 按主键查角色：不存在（含已软删）抛 ROLE_NOT_EXISTS */
  private async getExistsRole(id: string): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({ where: { id } })
    if (!role)
      throw businessError(SystemErrorCode.ROLE_NOT_EXISTS.message, { code: SystemErrorCode.ROLE_NOT_EXISTS })
    return role
  }

  /** 内置角色保护：更新 / 删除 / 分配权限前拒绝 */
  private validateNotBuiltinRole(roleId: string): void {
    if (roleId === SUPER_ADMIN_ROLE_ID)
      throw businessError(SystemErrorCode.ROLE_BUILTIN_FORBIDDEN.message, {
        code: SystemErrorCode.ROLE_BUILTIN_FORBIDDEN,
      })
  }

  private toVo(role: RoleEntity): RoleVo {
    return {
      id: role.id,
      name: role.name,
      code: role.code,
      sort: role.sort,
      status: role.status,
      remark: role.remark,
      createTime: role.createTime,
    }
  }
}
