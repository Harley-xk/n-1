import { type MigrationInterface } from 'typeorm'

export class InitialBaseline1790577311146 implements MigrationInterface {
  name = 'InitialBaseline1790577311146'

  public async up(): Promise<void> {
    // 基线迁移（空）：工程尚无业务实体，库中无本工程表。
    // 首个业务实体（批次四用户表）出现时由 migration:generate 生成全量 DDL 迁移；
    // 存量库接入纪律见 docs/规划/批次二-数据层基建设计.md §3.4。
  }

  public async down(): Promise<void> {
    // 空基线无可回退内容
  }
}
