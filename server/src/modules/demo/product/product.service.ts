/*
 * 作者: Harley-xk
 * 创建: 2026-09-29
 *
 * 描述: 示例商品服务：分页查询与 CRUD（name 唯一 + 启用列表；单表无关联不连带删除）
 */
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Like, Not } from 'typeorm'
import type { FindOptionsWhere, Repository } from 'typeorm'

import { businessError } from '../../../common/exceptions/business-error'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { DemoProductEntity } from '../entities/product.entity'
import { DemoErrorCode } from '../error-codes'
import type { ProductCreateDto, ProductPageDto, ProductUpdateDto, ProductVo } from './dto/product.dto'

@Injectable()
export class DemoProductService {
  constructor(
    @InjectRepository(DemoProductEntity)
    private readonly productRepository: Repository<DemoProductEntity>,
  ) {}

  /** 分页查询（名称模糊、分类 / 状态精确过滤） */
  async getPage(dto: ProductPageDto): Promise<PageResult<ProductVo>> {
    const where: FindOptionsWhere<DemoProductEntity> = {}
    if (dto.name !== undefined && dto.name !== '')
      where.name = Like(`%${dto.name}%`)
    if (dto.category !== undefined && dto.category !== '')
      where.category = dto.category
    if (dto.status !== undefined)
      where.status = dto.status
    const [list, total] = await this.productRepository.findAndCount({
      where,
      skip: (dto.pageNo - 1) * dto.pageSize,
      take: dto.pageSize,
      order: { createTime: 'DESC' },
    })
    return { list: list.map(product => this.toVo(product)), total }
  }

  /** 单查商品 */
  async get(id: string): Promise<ProductVo> {
    return this.toVo(await this.getExistsProduct(id))
  }

  /** 上架商品全量列表（下拉数据源示范；数量有限不分页） */
  async listEnabled(): Promise<ProductVo[]> {
    const list = await this.productRepository.find({
      where: { status: true },
      order: { id: 'DESC' },
    })
    return list.map(product => this.toVo(product))
  }

  /** 创建商品：name 查重 */
  async create(dto: ProductCreateDto): Promise<string> {
    await this.validateNameAvailable(dto.name)
    const product = await this.productRepository.save(
      this.productRepository.create({
        name: dto.name,
        category: dto.category,
        price: dto.price,
        status: dto.status ?? true,
        description: dto.description ?? null,
      }),
    )
    return product.id
  }

  /** 更新商品：name 查重排除自身 */
  async update(dto: ProductUpdateDto): Promise<void> {
    const product = await this.getExistsProduct(dto.id)
    await this.validateNameAvailable(dto.name, product.id)
    product.name = dto.name
    product.category = dto.category
    product.price = dto.price
    product.status = dto.status ?? product.status
    product.description = dto.description ?? null
    await this.productRepository.save(product)
  }

  /** 删除商品：软删（单表无关联，不连带清理） */
  async remove(id: string): Promise<void> {
    const product = await this.getExistsProduct(id)
    await this.productRepository.softRemove(product)
  }

  /** name 可用性校验：未删行内唯一（排除自身） */
  private async validateNameAvailable(name: string, excludeId?: string): Promise<void> {
    const duplicated = await this.productRepository.findOne({
      where: excludeId ? { name, id: Not(excludeId) } : { name },
    })
    if (duplicated)
      throw businessError(DemoErrorCode.PRODUCT_NAME_DUPLICATE.message, {
        code: DemoErrorCode.PRODUCT_NAME_DUPLICATE,
      })
  }

  /** 按主键查商品：不存在（含已软删）抛 PRODUCT_NOT_EXISTS */
  private async getExistsProduct(id: string): Promise<DemoProductEntity> {
    const product = await this.productRepository.findOne({ where: { id } })
    if (!product)
      throw businessError(DemoErrorCode.PRODUCT_NOT_EXISTS.message, {
        code: DemoErrorCode.PRODUCT_NOT_EXISTS,
      })
    return product
  }

  /** 实体转出参：白名单映射 + numeric 列统一转数值出口（PG 驱动读出为 string） */
  private toVo(product: DemoProductEntity): ProductVo {
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      price: Number(product.price),
      status: product.status,
      description: product.description,
      createTime: product.createTime,
    }
  }
}
