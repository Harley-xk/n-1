/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 部门域 DTO 集：创建 / 更新入参与平铺列表出参契约（组树在前端完成）
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator'

/** 部门平铺列表出参（前端按 parentId 组树） */
export interface DeptVo {
  id: string
  name: string
  parentId: string | null
  sort: number
  phone: string | null
  email: string | null
  status: boolean
  createTime: Date
}

export class DeptCreateDto {
  @ApiProperty({ description: '部门名称', example: '研发部' })
  @IsString()
  @IsNotEmpty({ message: '部门名称不能为空' })
  @MaxLength(50)
  name: string

  @ApiPropertyOptional({ description: '上级部门 id；不传为根部门' })
  @IsOptional()
  @IsUUID()
  parentId?: string

  @ApiPropertyOptional({ description: '显示排序，越小越靠前', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number

  @ApiPropertyOptional({ description: '联系电话' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @ApiPropertyOptional({ description: '联系邮箱' })
  @IsOptional()
  @IsString()
  @IsEmail({}, { message: '联系邮箱格式不正确' })
  @MaxLength(50)
  email?: string

  @ApiPropertyOptional({ description: '启用状态', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean
}

export class DeptUpdateDto {
  @ApiProperty({ description: '部门 id' })
  @IsUUID()
  id: string

  @ApiProperty({ description: '部门名称' })
  @IsString()
  @IsNotEmpty({ message: '部门名称不能为空' })
  @MaxLength(50)
  name: string

  @ApiPropertyOptional({ description: '上级部门 id；不传为根部门（清空挂靠）' })
  @IsOptional()
  @IsUUID()
  parentId?: string

  @ApiPropertyOptional({ description: '显示排序，越小越靠前', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number

  @ApiPropertyOptional({ description: '联系电话' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @ApiPropertyOptional({ description: '联系邮箱' })
  @IsOptional()
  @IsString()
  @IsEmail({}, { message: '联系邮箱格式不正确' })
  @MaxLength(50)
  email?: string

  @ApiPropertyOptional({ description: '启用状态', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean
}
