/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 字典域 DTO 集：类型与数据两层（分页 / 创建 / 更新入参、列表出参与折叠出参契约）
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

/** 字典类型列表出参 */
export interface DictTypeVo {
  id: string
  name: string
  type: string
  status: boolean
  remark: string | null
  createTime: Date
}

/** 字典数据列表出参 */
export interface DictDataVo {
  id: string
  dictType: string
  sort: number
  label: string
  dictValue: string
  status: boolean
  colorType: string | null
  remark: string | null
  createTime: Date
}

/** 折叠出参的字典数据项（前端 dict store 的消费形态） */
export interface DictDataSimpleVo {
  label: string
  value: string
  colorType: string | null
}

/** 折叠出参的字典类型（list-all-simple：启用类型 + 启用数据） */
export interface DictTypeSimpleVo {
  id: string
  name: string
  type: string
  datas: DictDataSimpleVo[]
}

export class DictTypePageDto extends PageParamDto {
  @ApiPropertyOptional({ description: '字典名称模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string

  @ApiPropertyOptional({ description: '字典类型标识模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string

  @ApiPropertyOptional({ description: '启用状态' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean
}

export class DictTypeCreateDto {
  @ApiProperty({ description: '字典名称', example: '通用状态' })
  @IsString()
  @IsNotEmpty({ message: '字典名称不能为空' })
  @MaxLength(50)
  name: string

  @ApiProperty({ description: '字典类型标识', example: 'common_status' })
  @IsString()
  @IsNotEmpty({ message: '字典类型标识不能为空' })
  @MaxLength(100)
  type: string

  @ApiPropertyOptional({ description: '启用状态', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string
}

export class DictTypeUpdateDto {
  @ApiProperty({ description: '字典类型 id' })
  @IsUUID()
  id: string

  @ApiProperty({ description: '字典名称' })
  @IsString()
  @IsNotEmpty({ message: '字典名称不能为空' })
  @MaxLength(50)
  name: string

  @ApiProperty({ description: '字典类型标识（变更时级联修改数据归属）' })
  @IsString()
  @IsNotEmpty({ message: '字典类型标识不能为空' })
  @MaxLength(100)
  type: string

  @ApiPropertyOptional({ description: '启用状态', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string
}

export class DictDataPageDto extends PageParamDto {
  @ApiProperty({ description: '所属字典类型标识（数据层查询必填，固定抽屉上下文）' })
  @IsString()
  @IsNotEmpty({ message: '所属字典类型不能为空' })
  @MaxLength(100)
  dictType: string

  @ApiPropertyOptional({ description: '标签模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string
}

export class DictDataCreateDto {
  @ApiProperty({ description: '所属字典类型标识' })
  @IsString()
  @IsNotEmpty({ message: '所属字典类型不能为空' })
  @MaxLength(100)
  dictType: string

  @ApiProperty({ description: '标签', example: '启用' })
  @IsString()
  @IsNotEmpty({ message: '标签不能为空' })
  @MaxLength(100)
  label: string

  @ApiProperty({ description: '取值（同类型下唯一）', example: 'true' })
  @IsString()
  @IsNotEmpty({ message: '取值不能为空' })
  @MaxLength(100)
  dictValue: string

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

  @ApiPropertyOptional({ description: '标签配色（el-tag type，如 success / danger）' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorType?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string
}

export class DictDataUpdateDto {
  @ApiProperty({ description: '字典数据 id' })
  @IsUUID()
  id: string

  @ApiProperty({ description: '标签' })
  @IsString()
  @IsNotEmpty({ message: '标签不能为空' })
  @MaxLength(100)
  label: string

  @ApiProperty({ description: '取值（同类型下唯一）' })
  @IsString()
  @IsNotEmpty({ message: '取值不能为空' })
  @MaxLength(100)
  dictValue: string

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

  @ApiPropertyOptional({ description: '标签配色（el-tag type，如 success / danger）' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorType?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string
}
