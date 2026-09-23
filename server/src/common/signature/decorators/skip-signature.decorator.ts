/*
 * 作者: Harley-xk
 * 创建: 2026-09-11
 *
 * 描述: @SkipSignature 装饰器：标记豁免签名校验的控制器或方法（对外免签接口使用）
 */

import { SetMetadata } from '@nestjs/common'

/** 豁免标记的 metadata key（Guard 读取，测试契约断言引用） */
export const SIGNATURE_SKIP_METADATA = 'signature:skip'

/** 豁免签名校验：装饰控制器（整个控制器豁免）或方法（单接口豁免），方法级优先于控制器级 */
export const SkipSignature = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SIGNATURE_SKIP_METADATA, true)
