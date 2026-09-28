/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 部门服务：平铺全量列表（前端组树）与 CRUD（防环三态校验 + 子部门 / 挂用户删除约束）
 */
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'

import { businessError } from '../../../common/exceptions/business-error'
import { DeptEntity } from '../entities/dept.entity'
import { UserEntity } from '../entities/user.entity'
import { SystemErrorCode } from '../error-codes'
import type { DeptCreateDto, DeptUpdateDto, DeptVo } from './dto/dept.dto'

/** 防环上溯深度上限：数据异常（手工造环等）时的保险丝，正常组织层级远达不到 */
const MAX_ANCESTRY_DEPTH = 100

@Injectable()
export class DeptService {
  constructor(
    @InjectRepository(DeptEntity)
    private readonly deptRepository: Repository<DeptEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /** 平铺全量列表（数量有限不分页；名称过滤在前端做） */
  async list(): Promise<DeptVo[]> {
    const list = await this.deptRepository.find({ order: { sort: 'ASC', createTime: 'ASC' } })
    return list.map(dept => this.toVo(dept))
  }

  /** 创建部门：上级存在性校验（parentId 不传为根） */
  async create(dto: DeptCreateDto): Promise<string> {
    await this.validateParentExists(dto.parentId)
    const dept = await this.deptRepository.save(
      this.deptRepository.create({
        name: dto.name,
        parentId: dto.parentId ?? null,
        sort: dto.sort ?? 0,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        status: dto.status ?? true,
      }),
    )
    return dept.id
  }

  /** 更新部门：防环三态校验（自环 / 父存在 / 上溯不回到自身） */
  async update(dto: DeptUpdateDto): Promise<void> {
    const dept = await this.getExistsDept(dto.id)
    await this.validateNoCycle(dept.id, dto.parentId)
    dept.name = dto.name
    dept.parentId = dto.parentId ?? null
    dept.sort = dto.sort ?? dept.sort
    dept.phone = dto.phone ?? null
    dept.email = dto.email ?? null
    dept.status = dto.status ?? dept.status
    await this.deptRepository.save(dept)
  }

  /** 删除部门：有子部门 / 挂用户禁删，软删 */
  async remove(id: string): Promise<void> {
    const dept = await this.getExistsDept(id)
    const child = await this.deptRepository.findOne({ where: { parentId: dept.id } })
    if (child)
      throw businessError(SystemErrorCode.DEPT_HAS_CHILD.message, { code: SystemErrorCode.DEPT_HAS_CHILD })
    const user = await this.userRepository.findOne({ where: { deptId: dept.id } })
    if (user)
      throw businessError(SystemErrorCode.DEPT_HAS_USER.message, { code: SystemErrorCode.DEPT_HAS_USER })
    await this.deptRepository.softRemove(dept)
  }

  /** 上级存在性校验（创建路径：新节点无 id，无环可成） */
  private async validateParentExists(parentId: string | undefined): Promise<void> {
    if (parentId === undefined)
      return
    const parent = await this.deptRepository.findOne({ where: { id: parentId } })
    if (!parent)
      throw businessError(SystemErrorCode.DEPT_PARENT_ERROR.message, { code: SystemErrorCode.DEPT_PARENT_ERROR })
  }

  /**
   * 防环三态校验（更新路径）：
   * parentId 为空放行（改为根）→ 自环拒绝 → 父必须存在 → 沿父链上溯不得回到自身（深度上限保险丝）。
   */
  private async validateNoCycle(deptId: string, parentId: string | undefined): Promise<void> {
    if (parentId === undefined || parentId === null)
      return
    if (parentId === deptId)
      throw businessError(SystemErrorCode.DEPT_PARENT_ERROR.message, { code: SystemErrorCode.DEPT_PARENT_ERROR })
    const parent = await this.deptRepository.findOne({ where: { id: parentId } })
    if (!parent)
      throw businessError(SystemErrorCode.DEPT_PARENT_ERROR.message, { code: SystemErrorCode.DEPT_PARENT_ERROR })
    let current: DeptEntity | null = parent
    let depth = 0
    while (current !== null && depth < MAX_ANCESTRY_DEPTH) {
      if (current.id === deptId)
        throw businessError(SystemErrorCode.DEPT_PARENT_ERROR.message, { code: SystemErrorCode.DEPT_PARENT_ERROR })
      current = current.parentId === null
        ? null
        : await this.deptRepository.findOne({ where: { id: current.parentId } })
      depth++
    }
    if (depth >= MAX_ANCESTRY_DEPTH)
      throw businessError(SystemErrorCode.DEPT_PARENT_ERROR.message, { code: SystemErrorCode.DEPT_PARENT_ERROR })
  }

  /** 按主键查部门：不存在（含已软删）抛 DEPT_NOT_EXISTS */
  private async getExistsDept(id: string): Promise<DeptEntity> {
    const dept = await this.deptRepository.findOne({ where: { id } })
    if (!dept)
      throw businessError(SystemErrorCode.DEPT_NOT_EXISTS.message, { code: SystemErrorCode.DEPT_NOT_EXISTS })
    return dept
  }

  private toVo(dept: DeptEntity): DeptVo {
    return {
      id: dept.id,
      name: dept.name,
      parentId: dept.parentId,
      sort: dept.sort,
      phone: dept.phone,
      email: dept.email,
      status: dept.status,
      createTime: dept.createTime,
    }
  }
}
