/*
 * 作者: Harley-xk
 * 创建: 2026-09-29
 *
 * 描述: 示例商品域 DTO 集：分页 / 创建 / 更新入参与列表出参契约
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator'

import { PageParamDto } from '../../../../common/dto/page.dto'

/** 商品列表出参 */
export interface ProductVo {
  id: string
  name: string
  category: string
  price: number
  status: boolean
  description: string | null
  createTime: Date
}

export class ProductPageDto extends PageParamDto {
  @ApiPropertyOptional({ description: '商品名称模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional({ description: '分类（字典 demo_product_category 的取值）' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @ApiPropertyOptional({ description: '上架状态' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean
}

export class ProductCreateDto {
  @ApiProperty({ description: '商品名称', example: '无线蓝牙耳机' })
  @IsString()
  @IsNotEmpty({ message: '商品名称不能为空' })
  @MaxLength(100)
  name: string

  @ApiProperty({ description: '分类（字典取值）', example: 'digital' })
  @IsString()
  @IsNotEmpty({ message: '商品分类不能为空' })
  @MaxLength(100)
  category: string

  @ApiProperty({ description: '金额（元，两位小数）', example: 299.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '金额最多两位小数' })
  @Min(0, { message: '金额不能为负数' })
  price: number

  @ApiPropertyOptional({ description: '上架状态', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '描述不能超过 500 字' })
  description?: string
}

export class ProductUpdateDto {
  @ApiProperty({ description: '商品 id' })
  @IsUUID()
  id: string

  @ApiProperty({ description: '商品名称' })
  @IsString()
  @IsNotEmpty({ message: '商品名称不能为空' })
  @MaxLength(100)
  name: string

  @ApiProperty({ description: '分类（字典取值）' })
  @IsString()
  @IsNotEmpty({ message: '商品分类不能为空' })
  @MaxLength(100)
  category: string

  @ApiProperty({ description: '金额（元，两位小数）' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '金额最多两位小数' })
  @Min(0, { message: '金额不能为负数' })
  price: number

  @ApiPropertyOptional({ description: '上架状态' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '描述不能超过 500 字' })
  description?: string
}
