import { MigrationInterface, QueryRunner } from 'typeorm'

import {
  ADMIN_USER_ID,
  SUPER_ADMIN_ROLE_ID,
} from '../modules/system/system.constants'

/**
 * 内置种子数据：admin 用户 + super_admin 角色 + 绑定关系（手写迁移承载，不引入 seed 框架——批次二定稿纪律）。
 *
 * - super_admin 权限全集由读取侧收敛（PermissionService 返回注册表 allCodes），无需逐条权限关联行
 * - admin 口令为 admin123 的 BCrypt 散列（$2a$10$，与 Spring BCryptPasswordEncoder 同格式可互验）
 * - id 为固定 uuid（system.constants.ts 常量），代码层的内置保护逻辑引用同一常量
 */
export class InitialSeed1790581000000 implements MigrationInterface {
  name = 'InitialSeed1790581000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 内置超级管理员角色（内置角色保护：更新 / 删除 / 分配权限前校验拒绝）
    await queryRunner.query(
      `INSERT INTO "system_roles" ("id", "name", "code", "sort", "status", "remark")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [SUPER_ADMIN_ROLE_ID, '超级管理员', 'super_admin', 0, true, '内置角色，拥有全部权限，不可删除'],
    )
    // 内置管理员用户（内置用户保护：更新 / 删除 / 重置密码 / 变更角色前校验拒绝）
    await queryRunner.query(
      `INSERT INTO "system_users" ("id", "username", "password", "nickname", "status")
       VALUES ($1, $2, $3, $4, $5)`,
      [ADMIN_USER_ID, 'admin', '$2a$10$8yeFDSyUDUfl4SwuLGEah.XGaPS4uQLJb53EwXiCqXjUyxFKFAkLC', '系统管理员', true],
    )
    // admin 绑定 super_admin
    await queryRunner.query(
      `INSERT INTO "system_user_role" ("user_id", "role_id") VALUES ($1, $2)`,
      [ADMIN_USER_ID, SUPER_ADMIN_ROLE_ID],
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "system_user_role" WHERE "user_id" = $1`, [ADMIN_USER_ID])
    await queryRunner.query(`DELETE FROM "system_users" WHERE "id" = $1`, [ADMIN_USER_ID])
    await queryRunner.query(`DELETE FROM "system_roles" WHERE "id" = $1`, [SUPER_ADMIN_ROLE_ID])
  }
}
