/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 参数配置服务：参数键取值（初始口令等表驱动配置）与 CRUD（v1 直查库不加缓存，命名避开 @nestjs/config 的 ConfigService）
 */
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Like, Not } from 'typeorm'
import type { FindOptionsWhere, Repository } from 'typeorm'

import { businessError } from '../../../common/exceptions/business-error'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { ConfigEntity } from '../entities/config.entity'
import { SystemErrorCode } from '../error-codes'
import type { ConfigCreateDto, ConfigPageDto, ConfigUpdateDto, ConfigVo } from './dto/config.dto'

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(ConfigEntity)
    private readonly configRepository: Repository<ConfigEntity>,
  ) {}

  /** 按参数键取值：未命中（含已软删）或值为空白时返回 null */
  async getValueByKey(key: string): Promise<string | null>

  /** 按参数键取值（带兜底）：未命中返回 defaultValue */
  async getValueByKey(key: string, defaultValue: string): Promise<string>

  async getValueByKey(key: string, defaultValue?: string): Promise<string | null> {
    const config = await this.configRepository.findOne({ where: { configKey: key } })
    const value = config?.configValue?.trim() ? config.configValue : null
    return defaultValue !== undefined ? (value ?? defaultValue) : value
  }

  /** 分页查询（名称 / 键模糊过滤） */
  async getPage(dto: ConfigPageDto): Promise<PageResult<ConfigVo>> {
    const where: FindOptionsWhere<ConfigEntity> = {}
    if (dto.name !== undefined && dto.name !== '')
      where.name = Like(`%${dto.name}%`)
    if (dto.configKey !== undefined && dto.configKey !== '')
      where.configKey = Like(`%${dto.configKey}%`)
    const [list, total] = await this.configRepository.findAndCount({
      where,
      skip: (dto.pageNo - 1) * dto.pageSize,
      take: dto.pageSize,
      order: { createTime: 'DESC' },
    })
    return { list: list.map(config => this.toVo(config)), total }
  }

  /** 创建参数：键查重（部分唯一索引兜底，服务层前置校验给出业务错误） */
  async create(dto: ConfigCreateDto): Promise<string> {
    await this.validateKeyAvailable(dto.configKey)
    const config = await this.configRepository.save(
      this.configRepository.create({
        category: dto.category,
        name: dto.name,
        configKey: dto.configKey,
        configValue: dto.configValue,
        visible: dto.visible ?? true,
        remark: dto.remark ?? null,
      }),
    )
    return config.id
  }

  /** 更新参数（键查重排除自身） */
  async update(dto: ConfigUpdateDto): Promise<void> {
    const config = await this.getExistsConfig(dto.id)
    await this.validateKeyAvailable(dto.configKey, config.id)
    config.category = dto.category
    config.name = dto.name
    config.configKey = dto.configKey
    config.configValue = dto.configValue
    config.visible = dto.visible ?? config.visible
    config.remark = dto.remark ?? null
    await this.configRepository.save(config)
  }

  /** 删除参数（软删；被引用的业务键随之取不到值，走调用方兜底链） */
  async remove(id: string): Promise<void> {
    const config = await this.getExistsConfig(id)
    await this.configRepository.softRemove(config)
  }

  /** 键可用性校验：未删行内唯一（排除自身） */
  private async validateKeyAvailable(configKey: string, excludeId?: string): Promise<void> {
    const duplicated = await this.configRepository.findOne({
      where: excludeId ? { configKey, id: Not(excludeId) } : { configKey },
    })
    if (duplicated)
      throw businessError(SystemErrorCode.CONFIG_KEY_DUPLICATE.message, {
        code: SystemErrorCode.CONFIG_KEY_DUPLICATE,
      })
  }

  /** 按主键查参数：不存在（含已软删）抛 CONFIG_NOT_EXISTS */
  private async getExistsConfig(id: string): Promise<ConfigEntity> {
    const config = await this.configRepository.findOne({ where: { id } })
    if (!config)
      throw businessError(SystemErrorCode.CONFIG_NOT_EXISTS.message, { code: SystemErrorCode.CONFIG_NOT_EXISTS })
    return config
  }

  private toVo(config: ConfigEntity): ConfigVo {
    return {
      id: config.id,
      category: config.category,
      name: config.name,
      configKey: config.configKey,
      configValue: config.configValue,
      visible: config.visible,
      remark: config.remark,
      createTime: config.createTime,
    }
  }
}
