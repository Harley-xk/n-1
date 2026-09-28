/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 岗位域 DTO 集：分页 / 创建 / 更新入参与列表出参契约
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator'

import { PageParamDto } from '../../../../common/dto/page.dto'

/** 岗位列表出参 */
export interface PostVo {
  id: string
  code: string
  name: string
  sort: number
  status: boolean
  createTime: Date
}

export class PostPageDto extends PageParamDto {
  @ApiPropertyOptional({ description: '岗位名称模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string

  @ApiPropertyOptional({ description: '岗位标识模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @ApiPropertyOptional({ description: '启用状态' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean
}

export class PostCreateDto {
  @ApiProperty({ description: '岗位标识', example: 'se' })
  @IsString()
  @IsNotEmpty({ message: '岗位标识不能为空' })
  @MaxLength(50)
  code: string

  @ApiProperty({ description: '岗位名称', example: '研发工程师' })
  @IsString()
  @IsNotEmpty({ message: '岗位名称不能为空' })
  @MaxLength(50)
  name: string

  @ApiPropertyOptional({ description: '显示排序，越小越靠前', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number

  @ApiPropertyOptional({ description: '启用状态', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean
}

export class PostUpdateDto {
  @ApiProperty({ description: '岗位 id' })
  @IsUUID()
  id: string

  @ApiProperty({ description: '岗位标识' })
  @IsString()
  @IsNotEmpty({ message: '岗位标识不能为空' })
  @MaxLength(50)
  code: string

  @ApiProperty({ description: '岗位名称' })
  @IsString()
  @IsNotEmpty({ message: '岗位名称不能为空' })
  @MaxLength(50)
  name: string

  @ApiPropertyOptional({ description: '显示排序，越小越靠前', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number

  @ApiPropertyOptional({ description: '启用状态', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean
}
