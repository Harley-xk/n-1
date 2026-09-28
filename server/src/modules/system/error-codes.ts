/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: system 模块错误码常量表（模块段 001，段位登记表见 docs/指南/统一响应与异常处理设计.md）
 */
import { ErrorCode } from '../../common/errors/error-code'

/**
 * system 模块（模块段 001）分域错误码。
 *
 * 子域划分：000 认证 / 001 用户 / 002 角色 / 003 字典 / 004 参数 / 005 部门 / 006 岗位；
 * 操作 / 登录日志域只读 + 删除幂等，无业务失败不登记（007+ 预留）。
 * 鉴权框架错误（401 / 403）走 GlobalErrorCode 通用段（Nest 内置异常自动映射），此处仅登记业务失败。
 */
export const SystemErrorCode = {
  // ===== 子域 000：认证 =====
  /** 登录失败：用户不存在与口令错误同码同文案（防账号枚举） */
  AUTH_LOGIN_FAILED: new ErrorCode(100000000, '登录账号或密码不正确'),
  /** 账号已被停用 */
  AUTH_LOGIN_DISABLED: new ErrorCode(100000001, '账号已被停用'),

  // ===== 子域 001：用户 =====
  /** 用户不存在 */
  USER_NOT_EXISTS: new ErrorCode(100100000, '用户不存在'),
  /** 登录账号已存在 */
  USER_USERNAME_DUPLICATE: new ErrorCode(100100001, '登录账号已存在'),
  /** 内置管理员不允许该操作（更新 / 删除 / 重置密码 / 变更角色） */
  USER_ADMIN_OPERATION_FORBIDDEN: new ErrorCode(100100002, '内置管理员不允许该操作'),

  // ===== 子域 002：角色 =====
  /** 角色不存在 */
  ROLE_NOT_EXISTS: new ErrorCode(100200000, '角色不存在'),
  /** 角色标识已存在 */
  ROLE_CODE_DUPLICATE: new ErrorCode(100200001, '角色标识已存在'),
  /** 内置角色不允许该操作（更新 / 删除 / 分配权限） */
  ROLE_BUILTIN_FORBIDDEN: new ErrorCode(100200002, '内置角色不允许该操作'),
  /** 权限串未在代码注册表中登记（分配接口写入侧校验） */
  ROLE_PERMISSION_UNKNOWN: new ErrorCode(100200003, '权限串未在代码注册表中登记'),

  // ===== 子域 003：字典 =====
  /** 字典类型不存在 */
  DICT_TYPE_NOT_EXISTS: new ErrorCode(100300000, '字典类型不存在'),
  /** 字典类型标识已存在 */
  DICT_TYPE_DUPLICATE: new ErrorCode(100300001, '字典类型标识已存在'),
  /** 字典数据不存在 */
  DICT_DATA_NOT_EXISTS: new ErrorCode(100300002, '字典数据不存在'),
  /** 同一类型下字典取值已存在 */
  DICT_DATA_VALUE_DUPLICATE: new ErrorCode(100300003, '该类型下字典取值已存在'),

  // ===== 子域 004：参数 =====
  /** 参数不存在 */
  CONFIG_NOT_EXISTS: new ErrorCode(100400000, '参数不存在'),
  /** 参数键已存在 */
  CONFIG_KEY_DUPLICATE: new ErrorCode(100400001, '参数键已存在'),

  // ===== 子域 005：部门 =====
  /** 部门不存在 */
  DEPT_NOT_EXISTS: new ErrorCode(100500000, '部门不存在'),
  /** 上级部门设置不正确（含将自身或后代设为上级的成环场景） */
  DEPT_PARENT_ERROR: new ErrorCode(100500001, '上级部门设置不正确'),
  /** 存在子部门，不允许删除 */
  DEPT_HAS_CHILD: new ErrorCode(100500002, '存在子部门，不允许删除'),
  /** 部门下存在用户，不允许删除 */
  DEPT_HAS_USER: new ErrorCode(100500003, '部门下存在用户，不允许删除'),

  // ===== 子域 006：岗位 =====
  /** 岗位不存在 */
  POST_NOT_EXISTS: new ErrorCode(100600000, '岗位不存在'),
  /** 岗位标识已存在 */
  POST_CODE_DUPLICATE: new ErrorCode(100600001, '岗位标识已存在'),
} as const
