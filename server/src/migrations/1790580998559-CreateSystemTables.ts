import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSystemTables1790580998559 implements MigrationInterface {
  name = 'CreateSystemTables1790580998559'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "system_user_role" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "role_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0c906829e166b768c60e912617b" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "uk_system_user_role" ON "system_user_role" ("user_id", "role_id") `)
    await queryRunner.query(`CREATE TABLE "system_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creator" uuid, "create_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updater" uuid, "update_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "username" character varying(30) NOT NULL, "password" character varying(100) NOT NULL, "nickname" character varying(30) NOT NULL, "status" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_cd8917a46de98ec75f9197911c0" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "uk_system_users_username" ON "system_users" ("username") WHERE deleted_at IS NULL`)
    await queryRunner.query(`CREATE TABLE "system_roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creator" uuid, "create_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updater" uuid, "update_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(50) NOT NULL, "code" character varying(50) NOT NULL, "sort" integer NOT NULL DEFAULT '0', "status" boolean NOT NULL DEFAULT true, "remark" character varying(500), CONSTRAINT "PK_468b99ca2261e84113b6ec40814" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "uk_system_roles_code" ON "system_roles" ("code") WHERE deleted_at IS NULL`)
    await queryRunner.query(`CREATE TABLE "system_role_permission" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role_id" uuid NOT NULL, "permission" character varying(100) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c510f3a1c3da73b34fa5e40346d" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "uk_system_role_permission" ON "system_role_permission" ("role_id", "permission") `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uk_system_role_permission"`)
    await queryRunner.query(`DROP TABLE "system_role_permission"`)
    await queryRunner.query(`DROP INDEX "public"."uk_system_roles_code"`)
    await queryRunner.query(`DROP TABLE "system_roles"`)
    await queryRunner.query(`DROP INDEX "public"."uk_system_users_username"`)
    await queryRunner.query(`DROP TABLE "system_users"`)
    await queryRunner.query(`DROP INDEX "public"."uk_system_user_role"`)
    await queryRunner.query(`DROP TABLE "system_user_role"`)
  }
}
