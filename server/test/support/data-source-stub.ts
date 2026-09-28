/**
 * 数据库连接桩：e2e 测试默认不依赖真实 PostgreSQL。
 * 需要验证真实数据库链路时，在 server/.env 中配置独立部署的数据库连接，
 * 再移除 overrideProvider 并编写专门用例。
 *
 * entityMetadatas / getRepository / queryRunner：@nestjs/typeorm forFeature 在模块装配期
 * 经 DataSource 解析实体元数据并创建 Repository（批次四 system 模块起被触达），
 * 桩只需让装配通过——用例如需触库行为，应 overrideProvider(getRepositoryToken(Entity))。
 */
export const dataSourceStub = {
  isInitialized: true,
  initialize: () => Promise.resolve(),
  destroy: () => Promise.resolve(),
  query: () => Promise.resolve([]),
  entityMetadatas: [] as unknown[],
  options: { type: 'postgres' },
  getRepository: () => ({}),
}
