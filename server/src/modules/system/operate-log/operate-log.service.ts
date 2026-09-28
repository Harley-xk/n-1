/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 操作日志服务：拦截器异步入库入口 + 分页查询与删除
 */
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { FindOptionsWhere } from 'typeorm'
import { Like, Repository } from 'typeorm'

import { AsyncTaskQueue } from '../../../common/async/async-task-queue'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { OperateLogEntity } from '../entities/operate-log.entity'
import type { OperateLogPageDto, OperateLogVo } from './dto/operate-log.dto'

@Injectable()
export class OperateLogService {
  constructor(
    @InjectRepository(OperateLogEntity)
    private readonly logRepository: Repository<OperateLogEntity>,
    private readonly taskQueue: AsyncTaskQueue,
  ) {}

  /**
   * 异步记录一条操作日志：实体为拦截器组装完的纯数据（无请求上下文依赖），
   * 经异步队列入库，失败仅告警、不反噬业务。
   */
  record(entity: OperateLogEntity): void {
    // async 体丢弃 InsertResult：任务契约固定 Promise<void>
    this.taskQueue.submit(async () => {
      await this.logRepository.insert(entity)
    })
  }

  /** 分页查询（时间倒序流水） */
  async getPage(dto: OperateLogPageDto): Promise<PageResult<OperateLogVo>> {
    const where: FindOptionsWhere<OperateLogEntity> = {}
    if (dto.userName !== undefined && dto.userName !== '')
      where.userName = Like(`%${dto.userName}%`)
    if (dto.module !== undefined && dto.module !== '')
      where.module = dto.module
    const [list, total] = await this.logRepository.findAndCount({
      where,
      skip: (dto.pageNo - 1) * dto.pageSize,
      take: dto.pageSize,
      order: { createTime: 'DESC' },
    })
    return { list: list.map(item => this.toVo(item)), total }
  }

  /** 删除单条（物理删除；幂等，不存在的 id 静默通过） */
  async remove(id: string): Promise<void> {
    await this.logRepository.delete(id)
  }

  private toVo(entity: OperateLogEntity): OperateLogVo {
    return {
      id: entity.id,
      userId: entity.userId,
      userName: entity.userName,
      module: entity.module,
      name: entity.name,
      requestMethod: entity.requestMethod,
      requestUrl: entity.requestUrl,
      requestParams: entity.requestParams,
      ip: entity.ip,
      userAgent: entity.userAgent,
      startTime: entity.startTime,
      durationMs: entity.durationMs,
      resultCode: entity.resultCode,
      resultMsg: entity.resultMsg,
      createTime: entity.createTime,
    }
  }
}
