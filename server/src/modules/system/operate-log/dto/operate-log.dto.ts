/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 操作日志 DTO：分页查询入参与列表出参契约（只读 + 删除，无写接口——入库走 @OperateLog 拦截器）
 */
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

import { PageParamDto } from '../../../../common/dto/page.dto'

/** 操作日志列表出参 */
export interface OperateLogVo {
  id: string
  userId: string | null
  userName: string | null
  module: string
  name: string
  requestMethod: string
  requestUrl: string
  requestParams: string | null
  ip: string | null
  userAgent: string | null
  startTime: Date
  durationMs: number
  resultCode: number
  resultMsg: string | null
  createTime: Date
}

export class OperateLogPageDto extends PageParamDto {
  @ApiPropertyOptional({ description: '操作人登录账号模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  userName?: string

  @ApiPropertyOptional({ description: '操作模块精确匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  module?: string
}
