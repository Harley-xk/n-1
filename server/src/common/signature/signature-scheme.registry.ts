/*
 * 作者: Harley-xk
 * 创建: 2026-09-11
 *
 * 描述: 签名方案注册表：集中管理全部签名方案，供 Guard 按名分发、业务模块注册自定义方案
 */

import { Injectable } from '@nestjs/common'

import type { SignatureScheme } from './interfaces/signature-scheme.interface'

/** 默认标准方案名：写方法未显式指定方案时使用 */
export const STANDARD_SCHEME_NAME = 'standard'

@Injectable()
export class SignatureSchemeRegistry {
  private readonly schemes = new Map<string, SignatureScheme>()

  /** 注册方案：重名直接抛错，把命名冲突暴露在启动期而非运行期 */
  register(scheme: SignatureScheme): void {
    if (this.schemes.has(scheme.name))
      throw new Error(`签名方案「${scheme.name}」重复注册`)
    this.schemes.set(scheme.name, scheme)
  }

  /** 按名取方案：未注册返回 undefined（由 Guard 按编程错误处理） */
  get(name: string): SignatureScheme | undefined {
    return this.schemes.get(name)
  }

  has(name: string): boolean {
    return this.schemes.has(name)
  }
}
