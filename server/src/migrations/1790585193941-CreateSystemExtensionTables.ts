import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSystemExtensionTables1790585193941 implements MigrationInterface {
  name = 'CreateSystemExtensionTables1790585193941'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "system_user_post" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "post_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4eb4a321e7931ec40ffd53c9bc8" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "uk_system_user_post" ON "system_user_post" ("user_id", "post_id") `)
    await queryRunner.query(`CREATE TABLE "system_dict_data" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creator" uuid, "create_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updater" uuid, "update_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "dict_type" character varying(100) NOT NULL, "sort" integer NOT NULL DEFAULT '0', "label" character varying(100) NOT NULL, "dict_value" character varying(100) NOT NULL, "status" boolean NOT NULL DEFAULT true, "color_type" character varying(20), "remark" character varying(500), CONSTRAINT "PK_b77ff990db9f0d33b29615a0e11" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "idx_system_dict_data_dict_type" ON "system_dict_data" ("dict_type") `)
    await queryRunner.query(`CREATE TABLE "system_login_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "log_type" smallint NOT NULL, "user_id" uuid, "username" character varying(30) NOT NULL, "ip" character varying(50), "user_agent" character varying(500), "result_code" integer NOT NULL, "result_msg" character varying(500), "login_time" TIMESTAMP WITH TIME ZONE NOT NULL, "create_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2b1aea56eef6b5a962c55a140ff" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "idx_system_login_log_login_time" ON "system_login_log" ("login_time") `)
    await queryRunner.query(`CREATE INDEX "idx_system_login_log_username" ON "system_login_log" ("username") `)
    await queryRunner.query(`CREATE TABLE "system_post" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creator" uuid, "create_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updater" uuid, "update_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "code" character varying(50) NOT NULL, "name" character varying(50) NOT NULL, "sort" integer NOT NULL DEFAULT '0', "status" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_39153526bdc73a11beb1a3cf003" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "uk_system_post_code" ON "system_post" ("code") WHERE deleted_at IS NULL`)
    await queryRunner.query(`CREATE TABLE "system_operate_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "user_name" character varying(30), "module" character varying(50) NOT NULL, "name" character varying(50) NOT NULL, "request_method" character varying(10) NOT NULL, "request_url" character varying(255) NOT NULL, "request_params" character varying(2000), "ip" character varying(50), "user_agent" character varying(500), "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "duration_ms" integer NOT NULL, "result_code" integer NOT NULL, "result_msg" character varying(500), "create_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c4d08722465475d4bbe9894c435" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "idx_system_operate_log_create_time" ON "system_operate_log" ("create_time") `)
    await queryRunner.query(`CREATE INDEX "idx_system_operate_log_user_id" ON "system_operate_log" ("user_id") `)
    await queryRunner.query(`CREATE TABLE "system_dict_type" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creator" uuid, "create_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updater" uuid, "update_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(50) NOT NULL, "type" character varying(100) NOT NULL, "status" boolean NOT NULL DEFAULT true, "remark" character varying(500), CONSTRAINT "PK_a659e2cc0f9e0ecf7ac77c82b64" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "uk_system_dict_type_type" ON "system_dict_type" ("type") WHERE deleted_at IS NULL`)
    await queryRunner.query(`CREATE TABLE "system_dept" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creator" uuid, "create_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updater" uuid, "update_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(50) NOT NULL, "parent_id" uuid, "sort" integer NOT NULL DEFAULT '0', "phone" character varying(20), "email" character varying(50), "status" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ba7020b46b2e5e7dd86df17ad17" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "idx_system_dept_parent_id" ON "system_dept" ("parent_id") `)
    await queryRunner.query(`CREATE TABLE "system_config" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creator" uuid, "create_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updater" uuid, "update_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "category" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "config_key" character varying(100) NOT NULL, "config_value" character varying(500) NOT NULL, "visible" boolean NOT NULL DEFAULT true, "remark" character varying(500), CONSTRAINT "PK_db4e70ac0d27e588176e9bb44a0" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "uk_system_config_config_key" ON "system_config" ("config_key") WHERE deleted_at IS NULL`)
    await queryRunner.query(`ALTER TABLE "system_users" ADD "dept_id" uuid`)
    await queryRunner.query(`CREATE INDEX "idx_system_users_dept_id" ON "system_users" ("dept_id") `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_system_users_dept_id"`)
    await queryRunner.query(`ALTER TABLE "system_users" DROP COLUMN "dept_id"`)
    await queryRunner.query(`DROP INDEX "public"."uk_system_config_config_key"`)
    await queryRunner.query(`DROP TABLE "system_config"`)
    await queryRunner.query(`DROP INDEX "public"."idx_system_dept_parent_id"`)
    await queryRunner.query(`DROP TABLE "system_dept"`)
    await queryRunner.query(`DROP INDEX "public"."uk_system_dict_type_type"`)
    await queryRunner.query(`DROP TABLE "system_dict_type"`)
    await queryRunner.query(`DROP INDEX "public"."idx_system_operate_log_user_id"`)
    await queryRunner.query(`DROP INDEX "public"."idx_system_operate_log_create_time"`)
    await queryRunner.query(`DROP TABLE "system_operate_log"`)
    await queryRunner.query(`DROP INDEX "public"."uk_system_post_code"`)
    await queryRunner.query(`DROP TABLE "system_post"`)
    await queryRunner.query(`DROP INDEX "public"."idx_system_login_log_username"`)
    await queryRunner.query(`DROP INDEX "public"."idx_system_login_log_login_time"`)
    await queryRunner.query(`DROP TABLE "system_login_log"`)
    await queryRunner.query(`DROP INDEX "public"."idx_system_dict_data_dict_type"`)
    await queryRunner.query(`DROP TABLE "system_dict_data"`)
    await queryRunner.query(`DROP INDEX "public"."uk_system_user_post"`)
    await queryRunner.query(`DROP TABLE "system_user_post"`)
  }
}
