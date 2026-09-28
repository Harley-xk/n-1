/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 认证服务：登录发 token（无状态 JWT，ADR-003）、用户存在性校验、权限信息下发
 */
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import type { Repository } from 'typeorm'

import { businessError } from '../../../common/exceptions/business-error'
import { UserEntity } from '../entities/user.entity'
import { SystemErrorCode } from '../error-codes'
import { PermissionService } from '../permission.service'
import type { PermissionInfoVo } from './dto/permission-info.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly permissionService: PermissionService,
  ) {}

  /** 登录：校验账号口令后签发 JWT；用户不存在与口令错误同码同文案（防账号枚举） */
  async login(username: string, password: string): Promise<{ token: string }> {
    const user = await this.userRepository.findOne({ where: { username } })
    if (!user || !bcrypt.compareSync(password, user.password))
      throw businessError(SystemErrorCode.AUTH_LOGIN_FAILED.message, {
        code: SystemErrorCode.AUTH_LOGIN_FAILED,
      })
    if (!user.status)
      throw businessError(SystemErrorCode.AUTH_LOGIN_DISABLED.message, {
        code: SystemErrorCode.AUTH_LOGIN_DISABLED,
      })
    // payload 只放身份标识：角色与权限逐请求现查（变更/回收/禁用即时生效），不塞 token
    const token = await this.jwtService.signAsync({ sub: user.id, username: user.username })
    return { token }
  }

  /** 登出：无状态 JWT 无服务端态可清，本期占位（批次五登录日志在此埋点） */
  async logout(): Promise<void> {
    // 无服务端态可清：登出的本质由前端清令牌承担（见 auth store）
  }

  /** 按有效 token 中的用户 id 查启用用户：不存在 / 已删除 / 已停用均返回 null（Guard 存在性校验，ADR-003 即时失效语义） */
  async getActiveUserById(id: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({ where: { id } })
    return user?.status ? user : null
  }

  /** 权限信息：前端守卫登录后一次拉齐（用户 + 角色 + 权限集合） */
  async getPermissionInfo(userId: string): Promise<PermissionInfoVo> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user)
      throw businessError(SystemErrorCode.USER_NOT_EXISTS.message, { code: SystemErrorCode.USER_NOT_EXISTS })
    const [roles, permissions] = await Promise.all([
      this.permissionService.getUserRoleCodes(userId),
      this.permissionService.getUserPermissionCodes(userId),
    ])
    return {
      user: { id: user.id, username: user.username, nickname: user.nickname },
      roles,
      permissions,
    }
  }
}
