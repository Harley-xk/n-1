/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 参数配置域 DTO 集：分页 / 创建 / 更新入参与列表出参契约
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'

import { PageParamDto } from '../../../../common/dto/page.dto'

/** 参数列表出参 */
export interface ConfigVo {
  id: string
  category: string
  name: string
  configKey: string
  configValue: string
  visible: boolean
  remark: string | null
  createTime: Date
}

export class ConfigPageDto extends PageParamDto {
  @ApiPropertyOptional({ description: '参数名称模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional({ description: '参数键模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  configKey?: string
}

export class ConfigCreateDto {
  @ApiProperty({ description: '参数分类', example: 'system' })
  @IsString()
  @IsNotEmpty({ message: '参数分类不能为空' })
  @MaxLength(50)
  category: string

  @ApiProperty({ description: '参数名称', example: '新建用户初始口令' })
  @IsString()
  @IsNotEmpty({ message: '参数名称不能为空' })
  @MaxLength(100)
  name: string

  @ApiProperty({ description: '参数键', example: 'system.user.init-password' })
  @IsString()
  @IsNotEmpty({ message: '参数键不能为空' })
  @MaxLength(100)
  configKey: string

  @ApiProperty({ description: '参数值' })
  @IsString()
  @IsNotEmpty({ message: '参数值不能为空' })
  @MaxLength(500)
  configValue: string

  @ApiPropertyOptional({ description: '是否明文展示（敏感参数打码）', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  visible?: boolean

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string
}

export class ConfigUpdateDto {
  @ApiProperty({ description: '参数 id' })
  @IsUUID()
  id: string

  @ApiProperty({ description: '参数分类' })
  @IsString()
  @IsNotEmpty({ message: '参数分类不能为空' })
  @MaxLength(50)
  category: string

  @ApiProperty({ description: '参数名称' })
  @IsString()
  @IsNotEmpty({ message: '参数名称不能为空' })
  @MaxLength(100)
  name: string

  @ApiProperty({ description: '参数键' })
  @IsString()
  @IsNotEmpty({ message: '参数键不能为空' })
  @MaxLength(100)
  configKey: string

  @ApiProperty({ description: '参数值' })
  @IsString()
  @IsNotEmpty({ message: '参数值不能为空' })
  @MaxLength(500)
  configValue: string

  @ApiPropertyOptional({ description: '是否明文展示（敏感参数打码）', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  visible?: boolean

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string
}
