/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: system 模块内置数据约定：种子迁移与代码保护逻辑共用同一 id 常量（手写迁移 import 此处，杜绝两处漂移）
 */

/** 内置管理员用户 id（种子迁移静态写入；更新 / 删除 / 重置密码 / 变更角色前校验拒绝） */
export const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001'

/** 内置超级管理员角色 id（种子迁移静态写入；更新 / 删除 / 分配权限前校验拒绝） */
export const SUPER_ADMIN_ROLE_ID = '00000000-0000-0000-0000-000000000002'

/** 内置超级管理员角色标识：权限全集 = 注册表 allCodes()，前端无特判（全集在后端读取侧收敛） */
export const SUPER_ADMIN_ROLE_CODE = 'super_admin'

// ===== 批次五种子数据 id（SystemExtensionSeed 迁移静态写入，与代码约定同源） =====

/** 根部门 id（种子：n-1 科技有限公司，parent 为 null） */
export const DEPT_ROOT_ID = '00000000-0000-0000-0000-000000000011'

/** 研发部 id（种子：挂根部门下） */
export const DEPT_DEV_ID = '00000000-0000-0000-0000-000000000012'

/** 岗位：董事长（ceo）id */
export const POST_CEO_ID = '00000000-0000-0000-0000-000000000021'

/** 岗位：研发工程师（se）id */
export const POST_SE_ID = '00000000-0000-0000-0000-000000000022'

/** 岗位：人力资源（hr）id */
export const POST_HR_ID = '00000000-0000-0000-0000-000000000023'

/** 字典类型：通用状态（common_status）id */
export const DICT_TYPE_STATUS_ID = '00000000-0000-0000-0000-000000000031'

/** 字典数据：启用（value 'true'）id */
export const DICT_DATA_ENABLE_ID = '00000000-0000-0000-0000-000000000032'

/** 字典数据：停用（value 'false'）id */
export const DICT_DATA_DISABLE_ID = '00000000-0000-0000-0000-000000000033'

/** 参数：新建用户初始口令 id */
export const CONFIG_INIT_PASSWORD_ID = '00000000-0000-0000-0000-000000000041'

// ===== 业务常量 =====

/** 参数键：新建用户初始口令（UserService 三级兜底链的第一级，缺省时回退 env 再回退硬编码） */
export const CONFIG_KEY_USER_INIT_PASSWORD = 'system.user.init-password'

/** 登录日志类型：10 登录 / 20 登出（对应 system_login_log.log_type） */
export const LOGIN_LOG_TYPE_LOGIN = 10
export const LOGIN_LOG_TYPE_LOGOUT = 20
