/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 登录请求 DTO
 */
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class LoginDto {
  @ApiProperty({ description: '登录账号', example: 'admin' })
  @IsString()
  @IsNotEmpty({ message: '登录账号不能为空' })
  @MaxLength(30)
  username: string

  @ApiProperty({ description: '登录口令', example: 'admin123' })
  @IsString()
  @IsNotEmpty({ message: '口令不能为空' })
  @MaxLength(32)
  password: string
}
