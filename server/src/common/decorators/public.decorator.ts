/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: @Public 装饰器：标记豁免 JWT 认证的控制器或方法（登录、健康检查等对外免登录接口使用）
 */
import { SetMetadata } from '@nestjs/common'

/** 公开标记的 metadata key（JwtAuthGuard 读取，测试契约断言引用） */
export const IS_PUBLIC_KEY = 'auth:public'

/** 豁免 JWT 认证：装饰控制器（整个控制器豁免）或方法（单接口豁免），方法级优先于控制器级 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true)
