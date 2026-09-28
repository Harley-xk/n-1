/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 分页查询公共参数：业务分页 DTO 继承此类（响应侧配套 common/interfaces/page-result.interface.ts）
 */
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, Max, Min } from 'class-validator'

export class PageParamDto {
  /** 页码，从 1 起 */
  @ApiPropertyOptional({ description: '页码，从 1 起', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo = 1

  /** 每页条数，1-100 */
  @ApiPropertyOptional({ description: '每页条数（1-100）', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10
}
