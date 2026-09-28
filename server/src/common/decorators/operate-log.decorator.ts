/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: @OperateLog 操作日志注解：标注需要异步入库的写接口（拦截器读取，批次六起业务模块照抄）
 */
import { SetMetadata } from '@nestjs/common'

/** @OperateLog 注解元数据键（OperateLogInterceptor 读取，方法级优先于控制器级） */
export const OPERATE_LOG_METADATA = 'system:operate-log'

/** 操作日志标注选项 */
export interface OperateLogOptions {
  /** 操作模块（如「用户管理」） */
  module: string
  /** 操作名（如「创建用户」） */
  name: string
}

/**
 * 操作日志注解：标注的接口在响应后异步入库一条操作日志（记录人 / 模块 / 参数 / 结果 / 耗时 / IP）。
 * 方法级与控制器级皆可标注，方法级优先。
 *
 * @example
 * ```ts
 * @OperateLog('用户管理', '创建用户')
 * @Post('create')
 * ```
 */
export const OperateLog = (module: string, name: string): MethodDecorator & ClassDecorator =>
  SetMetadata(OPERATE_LOG_METADATA, { module, name })
