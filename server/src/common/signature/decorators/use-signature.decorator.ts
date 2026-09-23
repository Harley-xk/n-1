/*
 * 作者: Harley-xk
 * 创建: 2026-09-11
 *
 * 描述: @UseSignature 装饰器：为控制器或方法指定自定义签名方案（方案需已注册到 SignatureSchemeRegistry）
 */

import { SetMetadata } from '@nestjs/common'

/** 方案名标记的 metadata key（Guard 读取，测试契约断言引用） */
export const SIGNATURE_SCHEME_METADATA = 'signature:scheme'

/**
 * 指定自定义签名方案：装饰控制器或方法（方法级优先于控制器级）。
 * 适用于对外接口有独特参数格式的场景（签名参数在 query、body 为 form/XML、自有验签规则等）
 */
export const UseSignature = (name: string): MethodDecorator & ClassDecorator =>
  SetMetadata(SIGNATURE_SCHEME_METADATA, name)
