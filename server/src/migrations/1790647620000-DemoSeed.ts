import { MigrationInterface, QueryRunner } from 'typeorm'

import {
  DICT_DATA_DEMO_BOOK_ID,
  DICT_DATA_DEMO_CLOTHING_ID,
  DICT_DATA_DEMO_DIGITAL_ID,
  DICT_DATA_DEMO_FOOD_ID,
  DICT_TYPE_DEMO_CATEGORY_ID,
  PRODUCT_BOOK_ID,
  PRODUCT_EARPHONES_ID,
  PRODUCT_TSHIRT_ID,
} from '../modules/demo/demo.constants'

/**
 * 批次六种子数据：示例商品分类字典 + 3 条示例商品（手写迁移承载，id 常量与代码同源）。
 *
 * - demo_product_category 是系统管理之外的业务模块消费字典的首个示范（dictValue 为英文语义串）
 * - 示例商品状态混合（两条上架 + 一条下架），示范数据形态
 */
export class DemoSeed1790647620000 implements MigrationInterface {
  name = 'DemoSeed1790647620000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 字典类型：示例商品分类
    await queryRunner.query(
      `INSERT INTO "system_dict_type" ("id", "name", "type", "status", "remark")
       VALUES ($1, $2, $3, $4, $5)`,
      [DICT_TYPE_DEMO_CATEGORY_ID, '示例商品分类', 'demo_product_category', true, '开发示例模块的商品分类（业务模块消费字典的示范）'],
    )
    // 字典数据：数码 / 服饰 / 食品 / 图书（带 colorType，表格字典列配色示范）
    await queryRunner.query(
      `INSERT INTO "system_dict_data" ("id", "dict_type", "sort", "label", "dict_value", "status", "color_type")
       VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14),
              ($15, $16, $17, $18, $19, $20, $21), ($22, $23, $24, $25, $26, $27, $28)`,
      [
        DICT_DATA_DEMO_DIGITAL_ID, 'demo_product_category', 1, '数码', 'digital', true, 'primary',
        DICT_DATA_DEMO_CLOTHING_ID, 'demo_product_category', 2, '服饰', 'clothing', true, 'success',
        DICT_DATA_DEMO_FOOD_ID, 'demo_product_category', 3, '食品', 'food', true, 'warning',
        DICT_DATA_DEMO_BOOK_ID, 'demo_product_category', 4, '图书', 'book', true, 'info',
      ],
    )
    // 示例商品：3 条（第三条下架，示范状态开关与列表过滤）
    await queryRunner.query(
      `INSERT INTO "demo_product" ("id", "name", "category", "price", "status", "description")
       VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12), ($13, $14, $15, $16, $17, $18)`,
      [
        PRODUCT_EARPHONES_ID, '无线蓝牙耳机', 'digital', 299.0, true, '支持主动降噪，单次续航 8 小时',
        PRODUCT_TSHIRT_ID, '纯棉 T 恤', 'clothing', 59.9, true, '220g 重磅纯棉，多色可选',
        PRODUCT_BOOK_ID, '深入浅出 Vue.js', 'book', 89.0, false, '已下架：第三版修订中',
      ],
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "demo_product" WHERE "id" IN ($1, $2, $3)`, [
      PRODUCT_EARPHONES_ID,
      PRODUCT_TSHIRT_ID,
      PRODUCT_BOOK_ID,
    ])
    await queryRunner.query(
      `DELETE FROM "system_dict_data" WHERE "dict_type" = 'demo_product_category'`,
    )
    await queryRunner.query(`DELETE FROM "system_dict_type" WHERE "id" = $1`, [
      DICT_TYPE_DEMO_CATEGORY_ID,
    ])
  }
}
