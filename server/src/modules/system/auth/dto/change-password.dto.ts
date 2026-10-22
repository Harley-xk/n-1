/*
 * 作者: Harley-xk
 * 创建: 2026-10-22
 *
 * 描述: 修改密码入参契约（个人中心自助改密：验旧设新，设计见 docs/前端/个人中心设计.md）
 */
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class ChangePasswordDto {
  @ApiProperty({ description: '原密码', example: 'admin123' })
  @IsString()
  @IsNotEmpty({ message: '原密码不能为空' })
  @MaxLength(32)
  oldPassword: string

  @ApiProperty({ description: '新密码（6-32 位，不得与原密码相同）', example: 'new-pass-123' })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(6, { message: '新密码长度不能少于 6 位' })
  @MaxLength(32, { message: '新密码长度不能超过 32 位' })
  newPassword: string
}
