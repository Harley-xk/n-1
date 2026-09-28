/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 登录日志 DTO：分页查询入参与列表出参契约（「在线用户」最近活跃视角的查询载体，ADR-003）
 */
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator'

import { PageParamDto } from '../../../../common/dto/page.dto'
import { LOGIN_LOG_TYPE_LOGIN, LOGIN_LOG_TYPE_LOGOUT } from '../../system.constants'

/** 登录日志列表出参 */
export interface LoginLogVo {
  id: string
  logType: number
  userId: string | null
  username: string
  ip: string | null
  userAgent: string | null
  resultCode: number
  resultMsg: string | null
  loginTime: Date
  createTime: Date
}

export class LoginLogPageDto extends PageParamDto {
  @ApiPropertyOptional({ description: '登录账号模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string

  @ApiPropertyOptional({ description: '日志类型：10 登录 / 20 登出', enum: [LOGIN_LOG_TYPE_LOGIN, LOGIN_LOG_TYPE_LOGOUT] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([LOGIN_LOG_TYPE_LOGIN, LOGIN_LOG_TYPE_LOGOUT])
  logType?: number
}
