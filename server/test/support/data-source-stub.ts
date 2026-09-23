/**
 * 数据库连接桩：e2e 测试默认不依赖真实 PostgreSQL。
 * 需要验证真实数据库链路时，在 server/.env 中配置独立部署的数据库连接，
 * 再移除 overrideProvider 并编写专门用例。
 */
export const dataSourceStub = {
  isInitialized: true,
  initialize: () => Promise.resolve(),
  destroy: () => Promise.resolve(),
  query: () => Promise.resolve([]),
}
