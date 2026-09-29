/*
 * 作者: Harley-xk
 * 创建: 2026-09-29
 *
 * 描述: demo 模块错误码常量表（模块段 002，段位登记表见 docs/指南/统一响应与异常处理设计.md）
 */
import { ErrorCode } from '../../common/errors/error-code'

/**
 * demo 模块（模块段 002，业务模块样板）分域错误码。
 *
 * 子域划分：001 商品；数值 = 模块段 2 × 10^8 + 子域号 × 10^5 + 序号（如 200100000）。
 */
export const DemoErrorCode = {
  // ===== 子域 001：商品 =====
  /** 商品不存在 */
  PRODUCT_NOT_EXISTS: new ErrorCode(200100000, '商品不存在'),
  /** 商品名称已存在 */
  PRODUCT_NAME_DUPLICATE: new ErrorCode(200100001, '商品名称已存在'),
} as const
