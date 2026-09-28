import { MigrationInterface, QueryRunner } from 'typeorm'

import {
  ADMIN_USER_ID,
  CONFIG_INIT_PASSWORD_ID,
  DEPT_DEV_ID,
  DEPT_ROOT_ID,
  DICT_DATA_DISABLE_ID,
  DICT_DATA_ENABLE_ID,
  DICT_TYPE_STATUS_ID,
  POST_CEO_ID,
  POST_HR_ID,
  POST_SE_ID,
} from '../modules/system/system.constants'

/**
 * 批次五种子数据：部门 / 岗位 / 字典 / 参数 + admin 挂根部门（手写迁移承载，id 常量与代码同源）。
 *
 * - common_status 字典的 dictValue 用 'true' / 'false' 对接 n-1 的 boolean 状态语义
 *   （DictTag 直传 boolean 天然命中，表单侧用 el-switch 不走字典）
 * - 参数 system.user.init-password 是 UserService 初始口令三级兜底链的第一级
 */
export class SystemExtensionSeed1790585200000 implements MigrationInterface {
  name = 'SystemExtensionSeed1790585200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 部门：根 + 研发部（系统级操作 creator / updater 为 null，BaseEntity 契约）
    await queryRunner.query(
      `INSERT INTO "system_dept" ("id", "name", "parent_id", "sort", "status")
       VALUES ($1, $2, $3, $4, $5)`,
      [DEPT_ROOT_ID, 'n-1 科技有限公司', null, 0, true],
    )
    await queryRunner.query(
      `INSERT INTO "system_dept" ("id", "name", "parent_id", "sort", "status")
       VALUES ($1, $2, $3, $4, $5)`,
      [DEPT_DEV_ID, '研发部', DEPT_ROOT_ID, 1, true],
    )
    // admin 挂根部门
    await queryRunner.query(`UPDATE "system_users" SET "dept_id" = $1 WHERE "id" = $2`, [
      DEPT_ROOT_ID,
      ADMIN_USER_ID,
    ])
    // 岗位：董事长 / 研发工程师 / 人力资源
    await queryRunner.query(
      `INSERT INTO "system_post" ("id", "code", "name", "sort", "status")
       VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10), ($11, $12, $13, $14, $15)`,
      [
        POST_CEO_ID, 'ceo', '董事长', 1, true,
        POST_SE_ID, 'se', '研发工程师', 2, true,
        POST_HR_ID, 'hr', '人力资源', 3, true,
      ],
    )
    // 字典类型：通用状态
    await queryRunner.query(
      `INSERT INTO "system_dict_type" ("id", "name", "type", "status", "remark")
       VALUES ($1, $2, $3, $4, $5)`,
      [DICT_TYPE_STATUS_ID, '通用状态', 'common_status', true, '启用 / 停用二元状态（对接 boolean 语义）'],
    )
    // 字典数据：启用（success）/ 停用（danger）
    await queryRunner.query(
      `INSERT INTO "system_dict_data" ("id", "dict_type", "sort", "label", "dict_value", "status", "color_type")
       VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)`,
      [
        DICT_DATA_ENABLE_ID, 'common_status', 1, '启用', 'true', true, 'success',
        DICT_DATA_DISABLE_ID, 'common_status', 2, '停用', 'false', true, 'danger',
      ],
    )
    // 参数：新建用户初始口令（修改后立即生效，走三级兜底链第一级）
    await queryRunner.query(
      `INSERT INTO "system_config" ("id", "category", "name", "config_key", "config_value", "visible", "remark")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        CONFIG_INIT_PASSWORD_ID, 'system', '用户初始口令', 'system.user.init-password', 'admin123', false,
        '新建用户与重置密码的默认口令，修改后立即生效',
      ],
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "system_config" WHERE "id" = $1`, [CONFIG_INIT_PASSWORD_ID])
    await queryRunner.query(`DELETE FROM "system_dict_data" WHERE "id" IN ($1, $2)`, [
      DICT_DATA_ENABLE_ID,
      DICT_DATA_DISABLE_ID,
    ])
    await queryRunner.query(`DELETE FROM "system_dict_type" WHERE "id" = $1`, [DICT_TYPE_STATUS_ID])
    await queryRunner.query(`DELETE FROM "system_post" WHERE "id" IN ($1, $2, $3)`, [
      POST_CEO_ID,
      POST_SE_ID,
      POST_HR_ID,
    ])
    await queryRunner.query(`UPDATE "system_users" SET "dept_id" = NULL WHERE "id" = $1`, [ADMIN_USER_ID])
    await queryRunner.query(`DELETE FROM "system_dept" WHERE "id" IN ($1, $2)`, [DEPT_DEV_ID, DEPT_ROOT_ID])
  }
}
