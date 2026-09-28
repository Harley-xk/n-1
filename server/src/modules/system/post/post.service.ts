/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 岗位服务：分页查询与 CRUD（code 唯一 + 删除连带物理清理用户岗位关联）
 */
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Like, Not } from 'typeorm'
import type { FindOptionsWhere, Repository } from 'typeorm'

import { businessError } from '../../../common/exceptions/business-error'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { PostEntity } from '../entities/post.entity'
import { UserPostEntity } from '../entities/user-post.entity'
import { SystemErrorCode } from '../error-codes'
import type { PostCreateDto, PostPageDto, PostUpdateDto, PostVo } from './dto/post.dto'

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    @InjectRepository(UserPostEntity)
    private readonly userPostRepository: Repository<UserPostEntity>,
  ) {}

  /** 分页查询（名称 / 标识模糊、状态精确过滤） */
  async getPage(dto: PostPageDto): Promise<PageResult<PostVo>> {
    const where: FindOptionsWhere<PostEntity> = {}
    if (dto.name !== undefined && dto.name !== '')
      where.name = Like(`%${dto.name}%`)
    if (dto.code !== undefined && dto.code !== '')
      where.code = Like(`%${dto.code}%`)
    if (dto.status !== undefined)
      where.status = dto.status
    const [list, total] = await this.postRepository.findAndCount({
      where,
      skip: (dto.pageNo - 1) * dto.pageSize,
      take: dto.pageSize,
      order: { sort: 'ASC', createTime: 'DESC' },
    })
    return { list: list.map(post => this.toVo(post)), total }
  }

  /** 创建岗位：code 查重 */
  async create(dto: PostCreateDto): Promise<string> {
    await this.validateCodeAvailable(dto.code)
    const post = await this.postRepository.save(
      this.postRepository.create({
        code: dto.code,
        name: dto.name,
        sort: dto.sort ?? 0,
        status: dto.status ?? true,
      }),
    )
    return post.id
  }

  /** 更新岗位：code 查重排除自身 */
  async update(dto: PostUpdateDto): Promise<void> {
    const post = await this.getExistsPost(dto.id)
    await this.validateCodeAvailable(dto.code, post.id)
    post.code = dto.code
    post.name = dto.name
    post.sort = dto.sort ?? post.sort
    post.status = dto.status ?? post.status
    await this.postRepository.save(post)
  }

  /** 删除岗位：软删 + 物理清理用户岗位关联（用户侧随批清理，无悬空挂靠） */
  async remove(id: string): Promise<void> {
    const post = await this.getExistsPost(id)
    await this.postRepository.softRemove(post)
    await this.userPostRepository.delete({ postId: post.id })
  }

  /** code 可用性校验：未删行内唯一（排除自身） */
  private async validateCodeAvailable(code: string, excludeId?: string): Promise<void> {
    const duplicated = await this.postRepository.findOne({
      where: excludeId ? { code, id: Not(excludeId) } : { code },
    })
    if (duplicated)
      throw businessError(SystemErrorCode.POST_CODE_DUPLICATE.message, {
        code: SystemErrorCode.POST_CODE_DUPLICATE,
      })
  }

  /** 按主键查岗位：不存在（含已软删）抛 POST_NOT_EXISTS */
  private async getExistsPost(id: string): Promise<PostEntity> {
    const post = await this.postRepository.findOne({ where: { id } })
    if (!post)
      throw businessError(SystemErrorCode.POST_NOT_EXISTS.message, { code: SystemErrorCode.POST_NOT_EXISTS })
    return post
  }

  private toVo(post: PostEntity): PostVo {
    return {
      id: post.id,
      code: post.code,
      name: post.name,
      sort: post.sort,
      status: post.status,
      createTime: post.createTime,
    }
  }
}
