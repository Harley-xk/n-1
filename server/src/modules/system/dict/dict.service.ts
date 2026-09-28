/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 字典服务：类型与数据两层 CRUD（标识唯一 / 变更级联改归属 / 删除连带清数据 / 同类型取值唯一）与折叠出口
 */
import { Injectable } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { Like, Not } from 'typeorm'
import type { DataSource, FindOptionsWhere, Repository } from 'typeorm'

import { businessError } from '../../../common/exceptions/business-error'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { DictDataEntity } from '../entities/dict-data.entity'
import { DictTypeEntity } from '../entities/dict-type.entity'
import { SystemErrorCode } from '../error-codes'
import type {
  DictDataCreateDto,
  DictDataPageDto,
  DictDataUpdateDto,
  DictDataVo,
  DictTypeCreateDto,
  DictTypePageDto,
  DictTypeSimpleVo,
  DictTypeUpdateDto,
  DictTypeVo,
} from './dto/dict.dto'

@Injectable()
export class DictService {
  constructor(
    @InjectRepository(DictTypeEntity)
    private readonly typeRepository: Repository<DictTypeEntity>,
    @InjectRepository(DictDataEntity)
    private readonly dataRepository: Repository<DictDataEntity>,
    // 类型标识变更须与数据归属改写保持原子（零依赖：直接用 DataSource 事务，不引 UnitOfWork）
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ===== 字典类型 =====

  /** 类型分页查询（名称 / 标识模糊、状态精确过滤） */
  async getTypePage(dto: DictTypePageDto): Promise<PageResult<DictTypeVo>> {
    const where: FindOptionsWhere<DictTypeEntity> = {}
    if (dto.name !== undefined && dto.name !== '')
      where.name = Like(`%${dto.name}%`)
    if (dto.type !== undefined && dto.type !== '')
      where.type = Like(`%${dto.type}%`)
    if (dto.status !== undefined)
      where.status = dto.status
    const [list, total] = await this.typeRepository.findAndCount({
      where,
      skip: (dto.pageNo - 1) * dto.pageSize,
      take: dto.pageSize,
      order: { createTime: 'DESC' },
    })
    return { list: list.map(type => this.toTypeVo(type)), total }
  }

  /** 创建类型：标识查重 */
  async createType(dto: DictTypeCreateDto): Promise<string> {
    await this.validateTypeAvailable(dto.type)
    const type = await this.typeRepository.save(
      this.typeRepository.create({
        name: dto.name,
        type: dto.type,
        status: dto.status ?? true,
        remark: dto.remark ?? null,
      }),
    )
    return type.id
  }

  /** 更新类型：标识变更时事务内级联改写全部数据行的归属（防数据悬空在旧标识上） */
  async updateType(dto: DictTypeUpdateDto): Promise<void> {
    const type = await this.getExistsType(dto.id)
    await this.validateTypeAvailable(dto.type, type.id)
    const oldType = type.type
    type.name = dto.name
    type.type = dto.type
    type.status = dto.status ?? type.status
    type.remark = dto.remark ?? null
    await this.dataSource.transaction(async (manager) => {
      await manager.save(type)
      if (oldType !== dto.type)
        await manager.update(DictDataEntity, { dictType: oldType }, { dictType: dto.type })
    })
  }

  /** 删除类型：软删 + 物理删除该类型下全部数据（数据行无独立入口，连带清理防悬空） */
  async removeType(id: string): Promise<void> {
    const type = await this.getExistsType(id)
    await this.typeRepository.softRemove(type)
    await this.dataRepository.delete({ dictType: type.type })
  }

  // ===== 字典数据 =====

  /** 数据分页查询（固定类型上下文 + 标签模糊） */
  async getDataPage(dto: DictDataPageDto): Promise<PageResult<DictDataVo>> {
    const where: FindOptionsWhere<DictDataEntity> = { dictType: dto.dictType }
    if (dto.label !== undefined && dto.label !== '')
      where.label = Like(`%${dto.label}%`)
    const [list, total] = await this.dataRepository.findAndCount({
      where,
      skip: (dto.pageNo - 1) * dto.pageSize,
      take: dto.pageSize,
      order: { sort: 'ASC', createTime: 'DESC' },
    })
    return { list: list.map(data => this.toDataVo(data)), total }
  }

  /** 创建数据：所属类型必须存在 + 同类型下取值唯一（软删行已被过滤，天然不占位） */
  async createData(dto: DictDataCreateDto): Promise<string> {
    await this.getExistsTypeByIdentifier(dto.dictType)
    await this.validateValueAvailable(dto.dictType, dto.dictValue)
    const data = await this.dataRepository.save(
      this.dataRepository.create({
        dictType: dto.dictType,
        sort: dto.sort ?? 0,
        label: dto.label,
        dictValue: dto.dictValue,
        status: dto.status ?? true,
        colorType: dto.colorType ?? null,
        remark: dto.remark ?? null,
      }),
    )
    return data.id
  }

  /** 更新数据：取值唯一校验排除自身；不提供改挂类型（数据的类型由类型侧级联维护） */
  async updateData(dto: DictDataUpdateDto): Promise<void> {
    const data = await this.getExistsData(dto.id)
    await this.validateValueAvailable(data.dictType, dto.dictValue, data.id)
    data.sort = dto.sort ?? data.sort
    data.label = dto.label
    data.dictValue = dto.dictValue
    data.status = dto.status ?? data.status
    data.colorType = dto.colorType ?? null
    data.remark = dto.remark ?? null
    await this.dataRepository.save(data)
  }

  /** 删除数据（软删） */
  async removeData(id: string): Promise<void> {
    const data = await this.getExistsData(id)
    await this.dataRepository.softRemove(data)
  }

  // ===== 折叠出口 =====

  /**
   * 启用类型 + 各自启用数据的折叠清单：前端 dict store 的唯一数据源
   * （两笔查询内存分组，避免 N+1；v1 直查库不加缓存）
   */
  async listAllSimple(): Promise<DictTypeSimpleVo[]> {
    const [types, datas] = await Promise.all([
      this.typeRepository.find({ where: { status: true }, order: { type: 'ASC' } }),
      this.dataRepository.find({ where: { status: true }, order: { sort: 'ASC', createTime: 'ASC' } }),
    ])
    const grouped = new Map<string, DictTypeSimpleVo>()
    for (const type of types) {
      grouped.set(type.type, { id: type.id, name: type.name, type: type.type, datas: [] })
    }
    for (const data of datas) {
      const bucket = grouped.get(data.dictType)
      // 数据挂在停用 / 已删类型上时折叠出口直接丢弃（写入侧有校验，此处为读取侧兜底）
      if (bucket)
        bucket.datas.push({ label: data.label, value: data.dictValue, colorType: data.colorType })
    }
    return [...grouped.values()]
  }

  /** 类型标识可用性校验：未删行内唯一（排除自身） */
  private async validateTypeAvailable(type: string, excludeId?: string): Promise<void> {
    const duplicated = await this.typeRepository.findOne({
      where: excludeId ? { type, id: Not(excludeId) } : { type },
    })
    if (duplicated)
      throw businessError(SystemErrorCode.DICT_TYPE_DUPLICATE.message, {
        code: SystemErrorCode.DICT_TYPE_DUPLICATE,
      })
  }

  /** 按标识查类型：不存在（含已软删）抛 DICT_TYPE_NOT_EXISTS（数据写入前的归属校验） */
  private async getExistsTypeByIdentifier(type: string): Promise<DictTypeEntity> {
    const found = await this.typeRepository.findOne({ where: { type } })
    if (!found)
      throw businessError(SystemErrorCode.DICT_TYPE_NOT_EXISTS.message, {
        code: SystemErrorCode.DICT_TYPE_NOT_EXISTS,
      })
    return found
  }

  /** 同类型下取值唯一校验（排除自身） */
  private async validateValueAvailable(dictType: string, dictValue: string, excludeId?: string): Promise<void> {
    const duplicated = await this.dataRepository.findOne({
      where: excludeId ? { dictType, dictValue, id: Not(excludeId) } : { dictType, dictValue },
    })
    if (duplicated)
      throw businessError(SystemErrorCode.DICT_DATA_VALUE_DUPLICATE.message, {
        code: SystemErrorCode.DICT_DATA_VALUE_DUPLICATE,
      })
  }

  /** 按主键查类型：不存在（含已软删）抛 DICT_TYPE_NOT_EXISTS */
  private async getExistsType(id: string): Promise<DictTypeEntity> {
    const type = await this.typeRepository.findOne({ where: { id } })
    if (!type)
      throw businessError(SystemErrorCode.DICT_TYPE_NOT_EXISTS.message, {
        code: SystemErrorCode.DICT_TYPE_NOT_EXISTS,
      })
    return type
  }

  /** 按主键查数据：不存在（含已软删）抛 DICT_DATA_NOT_EXISTS */
  private async getExistsData(id: string): Promise<DictDataEntity> {
    const data = await this.dataRepository.findOne({ where: { id } })
    if (!data)
      throw businessError(SystemErrorCode.DICT_DATA_NOT_EXISTS.message, {
        code: SystemErrorCode.DICT_DATA_NOT_EXISTS,
      })
    return data
  }

  private toTypeVo(type: DictTypeEntity): DictTypeVo {
    return {
      id: type.id,
      name: type.name,
      type: type.type,
      status: type.status,
      remark: type.remark,
      createTime: type.createTime,
    }
  }

  private toDataVo(data: DictDataEntity): DictDataVo {
    return {
      id: data.id,
      dictType: data.dictType,
      sort: data.sort,
      label: data.label,
      dictValue: data.dictValue,
      status: data.status,
      colorType: data.colorType,
      remark: data.remark,
      createTime: data.createTime,
    }
  }
}
