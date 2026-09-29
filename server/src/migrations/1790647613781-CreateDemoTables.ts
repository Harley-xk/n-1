import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateDemoTables1790647613781 implements MigrationInterface {
  name = 'CreateDemoTables1790647613781'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "demo_product" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creator" uuid, "create_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updater" uuid, "update_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(100) NOT NULL, "category" character varying(100) NOT NULL, "price" numeric(12,2) NOT NULL, "status" boolean NOT NULL DEFAULT true, "description" character varying(500), CONSTRAINT "PK_279d44089d6a105d20921df7fba" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "uk_demo_product_name" ON "demo_product" ("name") WHERE deleted_at IS NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uk_demo_product_name"`)
    await queryRunner.query(`DROP TABLE "demo_product"`)
  }
}
