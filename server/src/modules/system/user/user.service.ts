/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 用户服务：分页查询（部门 / 岗位批量补全）、创建、更新、软删、重置密码（参数表驱动初始口令）、角色与岗位分配
 */
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import { In, Like } from 'typeorm'
import type { FindOptionsWhere, Repository } from 'typeorm'

import { businessError } from '../../../common/exceptions/business-error'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { SystemConfigService } from '../config/config.service'
import { DeptEntity } from '../entities/dept.entity'
import { PostEntity } from '../entities/post.entity'
import { UserPostEntity } from '../entities/user-post.entity'
import { UserRoleEntity } from '../entities/user-role.entity'
import { UserEntity } from '../entities/user.entity'
import { SystemErrorCode } from '../error-codes'
import { ADMIN_USER_ID, CONFIG_KEY_USER_INIT_PASSWORD } from '../system.constants'
import type { UserAssignRoleDto, UserCreateDto, UserPageDto, UserUpdateDto, UserVo } from './dto/user.dto'

/** BCrypt cost：$2a$10$，兼顾安全与登录耗时 */
const BCRYPT_COST = 10

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(UserPostEntity)
    private readonly userPostRepository: Repository<UserPostEntity>,
    @InjectRepository(DeptEntity)
    private readonly deptRepository: Repository<DeptEntity>,
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    private readonly configService: ConfigService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  /** 分页查询（账号 / 昵称模糊、状态与部门精确过滤；部门名与岗位以两笔批量查询补全，避免 N+1） */
  async getPage(dto: UserPageDto): Promise<PageResult<UserVo>> {
    const where: FindOptionsWhere<UserEntity> = {}
    if (dto.username !== undefined)
      where.username = Like(`%${dto.username}%`)
    if (dto.nickname !== undefined)
      where.nickname = Like(`%${dto.nickname}%`)
    if (dto.status !== undefined)
      where.status = dto.status
    if (dto.deptId !== undefined)
      where.deptId = dto.deptId
    const [list, total] = await this.userRepository.findAndCount({
      where,
      skip: (dto.pageNo - 1) * dto.pageSize,
      take: dto.pageSize,
      order: { createTime: 'DESC' },
    })
    return { list: await this.decorateList(list), total }
  }

  /** 创建用户：账号查重 + 部门 / 岗位存在性校验；未传口令则走三级兜底链取初始口令 */
  async create(dto: UserCreateDto): Promise<string> {
    const duplicated = await this.userRepository.findOne({ where: { username: dto.username } })
    if (duplicated)
      throw businessError(SystemErrorCode.USER_USERNAME_DUPLICATE.message, {
        code: SystemErrorCode.USER_USERNAME_DUPLICATE,
      })
    await this.validateDeptExists(dto.deptId)
    await this.validatePostsExist(dto.postIds)
    const password = await this.hashPassword(dto.password ?? (await this.getInitPassword()))
    const user = await this.userRepository.save(
      this.userRepository.create({
        username: dto.username,
        nickname: dto.nickname,
        password,
        deptId: dto.deptId ?? null,
      }),
    )
    await this.saveUserPosts(user.id, dto.postIds ?? [])
    return user.id
  }

  /** 更新用户基本信息（账号不可改；部门 / 岗位差集同步；内置管理员保护） */
  async update(dto: UserUpdateDto): Promise<void> {
    const user = await this.getExistsUser(dto.id)
    this.validateNotBuiltinUser(user.id)
    await this.validateDeptExists(dto.deptId)
    await this.validatePostsExist(dto.postIds)
    user.nickname = dto.nickname
    user.status = dto.status
    user.deptId = dto.deptId ?? null
    await this.userRepository.save(user)
    await this.saveUserPosts(user.id, dto.postIds ?? [])
  }

  /** 删除用户：软删（BaseEntity）+ 物理清理角色与岗位两类关联 */
  async remove(id: string): Promise<void> {
    const user = await this.getExistsUser(id)
    this.validateNotBuiltinUser(user.id)
    await this.userRepository.softRemove(user)
    await this.userRoleRepository.delete({ userId: user.id })
    await this.userPostRepository.delete({ userId: user.id })
  }

  /** 重置密码：恢复为初始口令（三级兜底链，改参数即刻生效；内置管理员保护） */
  async resetPassword(id: string): Promise<void> {
    const user = await this.getExistsUser(id)
    this.validateNotBuiltinUser(user.id)
    user.password = await this.hashPassword(await this.getInitPassword())
    await this.userRepository.save(user)
  }

  /** 查用户已分配角色 id 集（分配角色弹窗回显） */
  async getRoleIds(id: string): Promise<string[]> {
    await this.getExistsUser(id)
    const relations = await this.userRoleRepository.find({ where: { userId: id } })
    return relations.map(relation => relation.roleId)
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

  /**
   * 初始口令三级兜底链：参数表 system.user.init-password → env 的 user.initPassword → 'admin123' 硬兜底。
   * 参数表直查库，改值即刻生效（无需重启）。
   */
  private async getInitPassword(): Promise<string> {
    const fromConfigTable = await this.systemConfigService.getValueByKey(CONFIG_KEY_USER_INIT_PASSWORD)
    if (fromConfigTable !== null)
      return fromConfigTable
    return this.configService.get<string>('user.initPassword') ?? 'admin123'
  }

  /** 部门存在性校验（可选字段：不传跳过） */
  private async validateDeptExists(deptId: string | undefined): Promise<void> {
    if (deptId === undefined)
      return
    const dept = await this.deptRepository.findOne({ where: { id: deptId } })
    if (!dept)
      throw businessError(SystemErrorCode.DEPT_NOT_EXISTS.message, { code: SystemErrorCode.DEPT_NOT_EXISTS })
  }

  /** 岗位存在性校验（可选字段：批量比对数量，任一缺失即 POST_NOT_EXISTS） */
  private async validatePostsExist(postIds: string[] | undefined): Promise<void> {
    if (postIds === undefined || postIds.length === 0)
      return
    const found = await this.postRepository.find({ where: { id: In(postIds) } })
    if (found.length !== new Set(postIds).size)
      throw businessError(SystemErrorCode.POST_NOT_EXISTS.message, { code: SystemErrorCode.POST_NOT_EXISTS })
  }

  /** 岗位分配：全集差集增量绑定（照角色分配样板） */
  private async saveUserPosts(userId: string, postIds: string[]): Promise<void> {
    const existing = await this.userPostRepository.find({ where: { userId } })
    const existingPostIds = new Set(existing.map(relation => relation.postId))
    const targetPostIds = new Set(postIds)
    // 删除：现有但目标没有
    const toRemove = [...existingPostIds].filter(postId => !targetPostIds.has(postId))
    if (toRemove.length > 0)
      await this.userPostRepository.delete({ userId, postId: In(toRemove) })
    // 插入：目标但现有没有
    const toAdd = [...targetPostIds].filter(postId => !existingPostIds.has(postId))
    if (toAdd.length > 0) {
      await this.userPostRepository.insert(
        toAdd.map(postId => ({ userId, postId })),
      )
    }
  }

  /** 列表批量补全：部门名映射 + 岗位关联分组（两笔批量查询，替代逐行 leftJoin 的软删条件心智） */
  private async decorateList(list: UserEntity[]): Promise<UserVo[]> {
    if (list.length === 0)
      return []
    const deptIds = [...new Set(list.map(user => user.deptId).filter((id): id is string => id !== null))]
    const [depts, relations] = await Promise.all([
      deptIds.length > 0 ? this.deptRepository.find({ where: { id: In(deptIds) } }) : Promise.resolve([]),
      this.userPostRepository.find({ where: { userId: In(list.map(user => user.id)) } }),
    ])
    const deptNameMap = new Map(depts.map(dept => [dept.id, dept.name]))
    const postMap = new Map<string, string[]>()
    for (const relation of relations) {
      const bucket = postMap.get(relation.userId) ?? []
      bucket.push(relation.postId)
      postMap.set(relation.userId, bucket)
    }
    return list.map(user => ({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      status: user.status,
      deptId: user.deptId,
      deptName: user.deptId ? (deptNameMap.get(user.deptId) ?? null) : null,
      postIds: postMap.get(user.id) ?? [],
      createTime: user.createTime,
    }))
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

  private async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_COST)
  }
}
