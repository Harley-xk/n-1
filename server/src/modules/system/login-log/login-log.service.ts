/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 登录日志服务：认证服务异步入库入口 + 分页查询与删除（「在线用户」最近活跃视角，ADR-003）
 */
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { FindOptionsWhere } from 'typeorm'
import { Like, Repository } from 'typeorm'

import { AsyncTaskQueue } from '../../../common/async/async-task-queue'
import type { PageResult } from '../../../common/interfaces/page-result.interface'
import { LoginLogEntity } from '../entities/login-log.entity'
import type { LoginLogPageDto, LoginLogVo } from './dto/login-log.dto'

@Injectable()
export class LoginLogService {
  constructor(
    @InjectRepository(LoginLogEntity)
    private readonly logRepository: Repository<LoginLogEntity>,
    private readonly taskQueue: AsyncTaskQueue,
  ) {}

  /**
   * 异步记录一条登录 / 登出日志：实体为认证服务组装完的纯数据，
   * 经异步队列入库，失败仅告警、**任何情况下不阻断登录链路**。
   */
  record(entity: LoginLogEntity): void {
    // async 体丢弃 InsertResult：任务契约固定 Promise<void>
    this.taskQueue.submit(async () => {
      await this.logRepository.insert(entity)
    })
  }

  /** 分页查询（最近活跃倒序；username 模糊 + logType 等值） */
  async getPage(dto: LoginLogPageDto): Promise<PageResult<LoginLogVo>> {
    const where: FindOptionsWhere<LoginLogEntity> = {}
    if (dto.username !== undefined && dto.username !== '')
      where.username = Like(`%${dto.username}%`)
    if (dto.logType !== undefined)
      where.logType = dto.logType
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

  private toVo(entity: LoginLogEntity): LoginLogVo {
    return {
      id: entity.id,
      logType: entity.logType,
      userId: entity.userId,
      username: entity.username,
      ip: entity.ip,
      userAgent: entity.userAgent,
      resultCode: entity.resultCode,
      resultMsg: entity.resultMsg,
      loginTime: entity.loginTime,
      createTime: entity.createTime,
    }
  }
}
