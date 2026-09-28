/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 用户服务：分页查询、创建、更新、软删、重置密码、角色分配（内置管理员保护 + 差集增量绑定）
 */
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import { In, Like } from 'typeorm'
import type { FindOptionsWhere, Repository } from 'typeorm'

import { businessError } from '../../../common/exceptions/business-error'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { UserRoleEntity } from '../entities/user-role.entity'
import { UserEntity } from '../entities/user.entity'
import { SystemErrorCode } from '../error-codes'
import { ADMIN_USER_ID } from '../system.constants'
import type { UserAssignRoleDto, UserCreateDto, UserPageDto, UserUpdateDto, UserVo } from './dto/user.dto'

/** BCrypt cost：与 n-2 种子散列同档（$2a$10$），兼顾安全与登录耗时 */
const BCRYPT_COST = 10

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    private readonly configService: ConfigService,
  ) {}

  /** 分页查询（账号 / 昵称模糊、状态精确过滤） */
  async getPage(dto: UserPageDto): Promise<PageResult<UserVo>> {
    const where: FindOptionsWhere<UserEntity> = {}
    if (dto.username !== undefined)
      where.username = Like(`%${dto.username}%`)
    if (dto.nickname !== undefined)
      where.nickname = Like(`%${dto.nickname}%`)
    if (dto.status !== undefined)
      where.status = dto.status
    const [list, total] = await this.userRepository.findAndCount({
      where,
      skip: (dto.pageNo - 1) * dto.pageSize,
      take: dto.pageSize,
      order: { createTime: 'DESC' },
    })
    return { list: list.map(user => this.toVo(user)), total }
  }

  /** 创建用户：账号查重；未传口令则使用服务端配置的默认初始口令（批次五迁入参数表驱动） */
  async create(dto: UserCreateDto): Promise<string> {
    const duplicated = await this.userRepository.findOne({ where: { username: dto.username } })
    if (duplicated)
      throw businessError(SystemErrorCode.USER_USERNAME_DUPLICATE.message, {
        code: SystemErrorCode.USER_USERNAME_DUPLICATE,
      })
    const password = await this.hashPassword(dto.password ?? this.getDefaultInitPassword())
    const user = await this.userRepository.save(
      this.userRepository.create({ username: dto.username, nickname: dto.nickname, password }),
    )
    return user.id
  }

  /** 更新用户基本信息（账号不可改；内置管理员保护） */
  async update(dto: UserUpdateDto): Promise<void> {
    const user = await this.getExistsUser(dto.id)
    this.validateNotBuiltinUser(user.id)
    user.nickname = dto.nickname
    user.status = dto.status
    await this.userRepository.save(user)
  }

  /** 删除用户：软删（BaseEntity）+ 物理清理角色关联 */
  async remove(id: string): Promise<void> {
    const user = await this.getExistsUser(id)
    this.validateNotBuiltinUser(user.id)
    await this.userRepository.softRemove(user)
    await this.userRoleRepository.delete({ userId: user.id })
  }

  /** 重置密码：恢复为默认初始口令（内置管理员保护） */
  async resetPassword(id: string): Promise<void> {
    const user = await this.getExistsUser(id)
    this.validateNotBuiltinUser(user.id)
    user.password = await this.hashPassword(this.getDefaultInitPassword())
    await this.userRepository.save(user)
  }

  /** 分配角色：全集差集增量绑定（物理删除 + 插入；内置管理员保护，防误解绑 super_admin 锁死系统） */
  async assignRoles(dto: UserAssignRoleDto): Promise<void> {
    const user = await this.getExistsUser(dto.id)
    this.validateNotBuiltinUser(user.id)
    const existing = await this.userRoleRepository.find({ where: { userId: user.id } })
    const existingRoleIds = new Set(existing.map(relation => relation.roleId))
    const targetRoleIds = new Set(dto.roleIds)
    // 删除：现有但目标没有
    const toRemove = [...existingRoleIds].filter(roleId => !targetRoleIds.has(roleId))
    if (toRemove.length > 0)
      await this.userRoleRepository.delete({ userId: user.id, roleId: In(toRemove) })
    // 插入：目标但现有没有
    const toAdd = [...targetRoleIds].filter(roleId => !existingRoleIds.has(roleId))
    if (toAdd.length > 0) {
      await this.userRoleRepository.insert(
        toAdd.map(roleId => ({ userId: user.id, roleId })),
      )
    }
  }

  /** 按主键查用户：不存在（含已软删）抛 USER_NOT_EXISTS */
  private async getExistsUser(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user)
      throw businessError(SystemErrorCode.USER_NOT_EXISTS.message, { code: SystemErrorCode.USER_NOT_EXISTS })
    return user
  }

  /** 内置管理员保护：更新 / 删除 / 重置密码 / 变更角色前拒绝 */
  private validateNotBuiltinUser(userId: string): void {
    if (userId === ADMIN_USER_ID)
      throw businessError(SystemErrorCode.USER_ADMIN_OPERATION_FORBIDDEN.message, {
        code: SystemErrorCode.USER_ADMIN_OPERATION_FORBIDDEN,
      })
  }

  private getDefaultInitPassword(): string {
    return this.configService.get<string>('user.initPassword') ?? 'admin123'
  }

  private async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_COST)
  }

  private toVo(user: UserEntity): UserVo {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      status: user.status,
      createTime: user.createTime,
    }
  }
}
