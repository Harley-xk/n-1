/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 用户域 DTO 集：分页 / 创建 / 更新 / 重置密码 / 角色分配入参与列表出参契约
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'

import { PageParamDto } from '../../../../common/dto/page.dto'

/** 用户列表出参（不回传口令散列） */
export interface UserVo {
  id: string
  username: string
  nickname: string
  status: boolean
  createTime: Date
}

export class UserPageDto extends PageParamDto {
  @ApiPropertyOptional({ description: '登录账号模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string

  @ApiPropertyOptional({ description: '昵称模糊匹配' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nickname?: string

  @ApiPropertyOptional({ description: '启用状态' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean
}

export class UserCreateDto {
  @ApiProperty({ description: '登录账号', example: 'user001' })
  @IsString()
  @IsNotEmpty({ message: '登录账号不能为空' })
  @MaxLength(30)
  username: string

  @ApiProperty({ description: '用户昵称', example: '用户一' })
  @IsString()
  @IsNotEmpty({ message: '用户昵称不能为空' })
  @MaxLength(30)
  nickname: string

  @ApiPropertyOptional({ description: '初始口令；不传则使用服务端配置的默认初始口令' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  password?: string
}

export class UserUpdateDto {
  @ApiProperty({ description: '用户 id' })
  @IsUUID()
  id: string

  @ApiProperty({ description: '用户昵称' })
  @IsString()
  @IsNotEmpty({ message: '用户昵称不能为空' })
  @MaxLength(30)
  nickname: string

  @ApiProperty({ description: '启用状态' })
  @IsBoolean()
  status: boolean
}

export class UserResetPasswordDto {
  @ApiProperty({ description: '用户 id' })
  @IsUUID()
  id: string
}

export class UserAssignRoleDto {
  @ApiProperty({ description: '用户 id' })
  @IsUUID()
  id: string

  @ApiProperty({ description: '角色 id 全集（差集增量绑定）', type: [String] })
  @IsArray()
  @ArrayUnique({ message: '角色 id 不得重复' })
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  roleIds: string[]
}
