/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 认证服务：登录发 token（无状态 JWT，ADR-003）、用户存在性校验、权限信息下发、登录/登出日志埋点
 */
import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import type { Repository } from 'typeorm'

import type { AuthUser } from '../../../common/decorators/current-user.decorator'
import type { ErrorCode } from '../../../common/errors/error-code'
import { businessError } from '../../../common/exceptions/business-error'
import type { ClientInfo } from '../../../common/utils/client-info'
import { LoginLogEntity } from '../entities/login-log.entity'
import { UserEntity } from '../entities/user.entity'
import { SystemErrorCode } from '../error-codes'
import { LoginLogService } from '../login-log/login-log.service'
import { PermissionService } from '../permission.service'
import { LOGIN_LOG_TYPE_LOGIN, LOGIN_LOG_TYPE_LOGOUT } from '../system.constants'
import type { PermissionInfoVo } from './dto/permission-info.dto'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly permissionService: PermissionService,
    private readonly loginLogService: LoginLogService,
  ) {}

  /** 登录：校验账号口令后签发 JWT；四条路径均埋登录日志（用户不存在与口令错误同码同文案，防账号枚举） */
  async login(username: string, password: string, client: ClientInfo): Promise<{ token: string }> {
    const user = await this.userRepository.findOne({ where: { username } })
    if (!user || !bcrypt.compareSync(password, user.password)) {
      // 失败路径：userId 无法确定（用户不存在）或不宜回填（口令错），统一记 null
      this.recordLoginLog(LOGIN_LOG_TYPE_LOGIN, null, username, client, SystemErrorCode.AUTH_LOGIN_FAILED)
      throw businessError(SystemErrorCode.AUTH_LOGIN_FAILED.message, {
        code: SystemErrorCode.AUTH_LOGIN_FAILED,
      })
    }
    if (!user.status) {
      this.recordLoginLog(LOGIN_LOG_TYPE_LOGIN, user.id, username, client, SystemErrorCode.AUTH_LOGIN_DISABLED)
      throw businessError(SystemErrorCode.AUTH_LOGIN_DISABLED.message, {
        code: SystemErrorCode.AUTH_LOGIN_DISABLED,
      })
    }
    // payload 只放身份标识：角色与权限逐请求现查（变更/回收/禁用即时生效），不塞 token
    const token = await this.jwtService.signAsync({ sub: user.id, username: user.username })
    this.recordLoginLog(LOGIN_LOG_TYPE_LOGIN, user.id, username, client)
    return { token }
  }

  /** 登出：无状态 JWT 无服务端态可清（前端清令牌承担），仅记录登出日志（logType 20） */
  logout(user: AuthUser, client: ClientInfo): void {
    this.recordLoginLog(LOGIN_LOG_TYPE_LOGOUT, user.id, user.username, client)
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

  /**
   * 组装并异步入库一条登录日志：任何失败仅告警，**不阻断登录 / 登出主链路**。
   * 不传 errorCode 即成功（code 0 / message null）。
   */
  private recordLoginLog(
    logType: number,
    userId: string | null,
    username: string,
    client: ClientInfo,
    errorCode?: ErrorCode,
  ): void {
    try {
      const entity = new LoginLogEntity()
      entity.logType = logType
      entity.userId = userId
      entity.username = username
      entity.ip = client.ip
      entity.userAgent = client.userAgent
      entity.resultCode = errorCode?.code ?? 0
      entity.resultMsg = errorCode?.message ?? null
      entity.loginTime = new Date()
      this.loginLogService.record(entity)
    }
    catch (err) {
      this.logger.warn(`登录日志组装失败：${(err as Error)?.message ?? err}`)
    }
  }
}
