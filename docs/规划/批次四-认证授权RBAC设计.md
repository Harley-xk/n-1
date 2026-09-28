# 批次四：认证授权 RBAC 设计

> 本文是《[n-2 消化吸收规划](n-2消化吸收规划.md)》批次四的实施设计，对应规划条目 **B1 / B7 / A5 / A7 / A8**。
> 前置决策已定稿：[ADR-001](../决策/ADR-001-菜单与路由的权限承载方式.md)（菜单不落库）、[ADR-002](../决策/ADR-002-错误码分段体系.md)（system 模块领 `001` 段）、[ADR-003](../决策/ADR-003-认证与会话方案.md)（Bearer JWT + 无状态 + 存在性校验）、[ADR-004](../决策/ADR-004-主键与逻辑删除.md)、[ADR-005](../决策/ADR-005-数据库迁移策略.md)。
> 本文档负责定稿 ADR-003 留下的两个待决点（§3.3 用户存在性校验形态、token 有效期）及全部实施细节；权限体系的长期设计另见《[权限设计](../指南/权限设计.md)》（以 n-2 同名文档为底稿改写，本批次同步交付）。

## 1. 需求背景

n-1 经批次一（契约定稿）、批次二（数据层基建）、批次三（前端门面）后已具备完整骨架，但**没有任何认证授权能力**：所有 `/api` 接口匿名可达，前端无登录页，侧栏菜单对所有人全量可见。批次四是 README 路线图核心项「认证授权 JWT + RBAC」，也是批次五（系统管理扩展）与批次六（样板模块）的前置——后续所有业务模块的接口保护与页面可见性控制都建立在本批次交付的权限链路上。

n-2 已沉淀成熟的 RBAC 设计（权限点代码注册表、读写不对称、super_admin 全集语义）与前端五件套（auth store / 守卫 / `v-hasPermi` / http 增强 / 登录页），本批次按吸收原则翻译：**语义决策平移、实现按 n-1 技术栈与既有契约改写**。

## 2. 改造总览

| # | 规划条目 | 内容 | 主要落点 |
| --- | --- | --- | --- |
| 1 | B1 | 数据模型：用户 / 角色 / 用户-角色 / 角色-权限四表 + 种子迁移 | `server/src/modules/system/entities/`、`server/src/migrations/` |
| 2 | B1 | 权限点代码注册表（TS 单层形态）+ 契约守护单测 | `server/src/modules/system/permissions.ts` |
| 3 | B7 | JWT 认证：配置、登录/登出/权限信息三接口、`JwtAuthGuard` + `@Public()` | `server/src/modules/system/auth/`、`server/src/common/guards/` |
| 4 | B1 | 权限校验：`@RequirePermissions()` 装饰器 + `PermissionsGuard` + super_admin 全集 + 读写不对称 | `server/src/modules/system/permissions.ts`、`server/src/common/guards/` |
| 5 | B1 | 用户 / 角色 CRUD 与分配接口（后端全量，管理页批次五交付） | `server/src/modules/system/user/`、`role/` |
| 6 | B7 | 错误码段位正式登记：system 模块领 `001`，认证/用户/角色三子域 | `server/src/modules/system/error-codes.ts` |
| 7 | A7 | http 层增强：token 注入、401 清令牌带 redirect 跳登录、`ApiError` | `web/src/api/http.ts` |
| 8 | A8 | token 存储封装（`N1_TOKEN`）+ auth store | `web/src/utils/auth.ts`、`web/src/stores/auth.ts` |
| 9 | A5 | 登录页（青碧卡片浮起风格）+ 路由守卫（`meta.permission` / `meta.public`）+ `v-hasPermi` 指令 | `web/src/views/login/`、`web/src/router/guard.ts`、`web/src/directives/has-permi.ts` |
| 10 | A5 | 侧栏菜单权限过滤 + 路由按模块拆文件静态注册 + DefaultUserDropdown 升级 | `web/src/utils/menu.ts`、`web/src/router/modules/`、`web/src/layouts/default/defaults/` |
| 11 | — | e2e：server 认证 e2e、浏览器 auth.spec 四用例、`workers: 1` 对齐 | `server/test/`、`e2e/tests/` |
| 12 | — | 文档：《权限设计》新建、ADR-003 实施定稿节、架构设计 / 统一响应 / CLAUDE.md / 规划回填 | `docs/` |

## 3. 方案设计

### 3.1 数据模型（四表 + 种子）

首组业务实体，全部继承批次二 `BaseEntity`（uuid 主键 + 审计列 + 软删），表名带 `system_` 模块前缀、蛇形小写：

| 实体 | 表 | 关键列 | 唯一索引 |
| --- | --- | --- | --- |
| `UserEntity` | `system_users` | `username` / `password`（BCrypt 散列）/ `nickname` / `status`（启用 1 停用 0） | `uk_system_users_username(username)` |
| `RoleEntity` | `system_roles` | `name` / `code` / `sort` / `status` / `remark` | `uk_system_roles_code(code)` |
| `UserRoleEntity` | `system_user_role` | `user_id` / `role_id`（uuid 逻辑外键，无物理约束） | `uk_system_user_role(user_id, role_id)` |
| `RolePermissionEntity` | `system_role_permission` | `role_id` / `permission`（权限串） | `uk_system_role_permission(role_id, permission)` |

与 n-2 的翻译差异及理由：

| n-2 形态 | n-1 形态 | 理由 |
| --- | --- | --- |
| 雪花 BIGINT 主键 | uuid 主键（BaseEntity 契约） | ADR-004 已定稿 |
| 布尔 SMALLINT 0/1 | PG 原生 `boolean` | 批次二建表类型规约（PG 优先，不做兼容妥协） |
| TIMESTAMP 无时区 | `timestamptz` | 同上 |
| `system_role`（单数） | `system_roles`（复数） | n-1 实体表名统一复数，与 TypeORM 惯例一致 |
| `login_ip` / `login_date` 落用户表 | 不落（批次五登录日志承担最近活跃视角） | ADR-003 能力边界；避免用户表承载日志语义 |
| 关联表带审计列 | **关联表不继承 BaseEntity，物理删除** | 差集增量分配逐行 delete；软删会让唯一索引被历史行占位打穿（n-2 已验证的教训直接采纳） |

关联表为「纯关联值对象」：仅 `id` + 两列 + 自建 `createdAt`（不参与审计填充），提供 `save()` 差集工具方法。**不建菜单表、角色-菜单表**（ADR-001）。

**种子数据**（手写迁移 `InitialSeed`，批次二已定稿「手写仅限数据变更与种子」纪律）：

- `admin` 用户（BCrypt 散列静态写入，明文 `admin123`，散列值复用 n-2 同源串——bcryptjs 与 Spring BCryptPasswordEncoder 同为 `$2a$` 格式可互验）
- `super_admin` 角色（code 精确值，remark 注明内置不可删）
- `admin ↔ super_admin` 绑定行（无需逐条权限关联——super_admin 权限全集在后端读取侧收敛）
- DDL 迁移经 `migration:generate` 从实体派生（实体为 schema 唯一事实源）；本机库无建表权时 generate 的 diff 基线为空库，生成物为全量 `CREATE TABLE`

**内置 admin 保护**：`SUPER_ADMIN_USER_ID` 常量（种子迁移与代码约定同一 uuid），用户更新 / 删除 / 重置密码前校验，命中抛 `USER_ADMIN_OPERATION_FORBIDDEN`（照 n-2 语义平移）。

### 3.2 权限点代码注册表

n-2 因「Java 注解只收编译期常量」被迫拆 interface + enum 双层；TS 装饰器收普通表达式，**单层数组即唯一出处**：

```ts
// server/src/modules/system/permissions.ts（示意）
export interface PermissionPoint {
  readonly code: string    // 'system:user:query'
  readonly label: string   // '用户查询'
}

export const SYSTEM_PERMISSIONS: readonly PermissionPoint[] = [
  { code: 'system:user:query', label: '用户查询' },
  { code: 'system:user:create', label: '用户新增' },
  // …
]
```

配套 `PermissionRegistry`（`@Global` 服务）：启动期校验「code 全局唯一」「首段 === 提供模块」（多模块聚合契约，为批次六样板模块预留 `PermissionProvider` 注入位），提供 `allCodes()` / `contains()`。**首串即代码常量、注解一律引常量、杜绝裸字符串**——与错误码同一哲学。

首批登记 10 项（批次五随模块扩展）：

| 域 | 权限串 |
| --- | --- |
| 用户 | `system:user:query` / `create` / `update` / `delete` / `reset-password` |
| 角色 | `system:role:query` / `create` / `update` / `delete` / `assign-permission` |

**读写不对称**（n-2 §4.3 语义平移）：读取侧（`get-permission-info`、角色权限回显）返回库内权限串全集**不过滤**注册表——历史未注册串命中不了任何注解常量，无提权面；写入侧（分配接口）逐串 `registry.contains()` 校验，未登记抛 `ROLE_PERMISSION_UNKNOWN`。

**super_admin 全集**：读取侧发现用户持有 code 为 `super_admin` 的启用角色 → 直接返回 `allCodes()`。注册表新增权限点超管自动拥有，无需维护关联；前端无超管特判。**停用角色即时失效**：查权限集合仅计入 `status = 启用` 的角色。

### 3.3 JWT 认证（登录链路 + JwtAuthGuard）

**ADR-003 待决点定稿**：

| 待决点 | 定稿 | 理由 |
| --- | --- | --- |
| 用户存在性校验形态 | **逐请求查库**（findById + status 判定） | 禁用/删除即时失效语义最纯粹、零缓存失效心智负担；PG 主键查询成本可忽略。进程内短 TTL 缓存留作多实例高并发时的优化后手（届时另立设计） |
| token 有效期 | **8 小时**（`JWT_EXPIRES` 可配，如 `8h`） | 对齐 n-2 timeout=28800s 的企业后台节奏；无刷新 token（无状态纪律，过期重新登录） |

**配置**（循 `.env` → `configuration.ts` → `ConfigService` 链路，参照 signature 节先例）：

```
JWT_SECRET=dev-jwt-secret-change-me     # 生产必换；启用认证时为空则启动 fail-fast
JWT_EXPIRES=8h
USER_INIT_PASSWORD=admin123             # 新建用户初始口令（批次五迁入参数表驱动）
```

**接口面**（`modules/system/auth/`，路由 `/api/system/auth/*`）：

| 接口 | 认证 | 签名 | 说明 |
| --- | --- | --- | --- |
| `POST /system/auth/login` | `@Public()` | `@SkipSignature()`（本批次已拍板豁免） | 入参 `{username, password}`；出参 `{token}`（登录只发 token） |
| `POST /system/auth/logout` | 仅需登录 | 参与签名 | 无状态 JWT 登出即前端清令牌；接口保留用于后续登录日志埋点（批次五），本期仅回 code 0 |
| `GET /system/auth/get-permission-info` | 仅需登录 | GET 免签 | 出参 `{user: {id, username, nickname}, roles: string[], permissions: string[]}`——**无 menus 字段**（ADR-001：前端静态路由 + 权限过滤） |

登录逻辑（n-2 语义平移）：按用户名查用户 → **用户不存在与密码错误同码 `AUTH_LOGIN_FAILED`**（防账号枚举）→ 停用抛 `AUTH_LOGIN_DISABLED` → `JwtService.sign({ sub: userId, username })` 返回 token。**权限不塞 JWT payload**——权限逐请求由 Guard 现查（角色变更/权限回收即时生效，与「用户禁用即时失效」同一时效语义）。

**JwtAuthGuard**（`common/guards/jwt-auth.guard.ts`，`APP_GUARD` 注册）：

1. `@Public()` 装饰器（`reflector.getAllAndOverride`，方法级优先控制器级）→ 放行
2. 取 `Authorization: Bearer <token>` → 缺失/格式错/签名无效/过期 → 抛 `UnauthorizedException`（HTTP 401，通用段 code 401）
3. 查用户存在且 `status = 启用`（不存在/已删除/已停用同抛 401）→ **`requestContext.setUserId(userId)` 一行激活审计填充**（批次二预埋通路）
4. 将 `{userId, username}` 挂到 `request` 上供后续使用

**Guard 执行顺序**（`APP_GUARD` 数组顺序即执行顺序）：`SignatureGuard → JwtAuthGuard → PermissionsGuard`。签名是外层防篡改防线，先于身份认证。

**存量接口适配**：`app.controller.ts` 的 `GET /` 与 `GET /health` 标 `@Public()`（健康检查是拉起探测的目标，必须匿名可达）；存量 e2e 的测试内临时控制器同步加 `@Public()`（详见 §3.7）。

### 3.4 权限校验（@RequirePermissions + PermissionsGuard）

```ts
// 装饰器：@RequirePermissions(SYSTEM_PERMISSIONS.USER_QUERY.code)
export const REQUIRE_PERMISSIONS_KEY = 'require_permissions'
export const RequirePermissions = (...codes: string[]) => SetMetadata(REQUIRE_PERMISSIONS_KEY, codes)
```

`PermissionsGuard`（`APP_GUARD`，排在 JwtAuthGuard 后）：读 metadata——**无装饰器 = 仅需登录**（Guard 空过）；有装饰器 → 查用户权限集合（含 super_admin 全集收敛）→ 任一命中放行（OR 语义，对齐 n-2 `v-hasPermi` 与 Sa-Token），不满足抛 `ForbiddenException`（HTTP 403，通用段 code 403）。鉴权失败一律抛 Nest 内置异常自动映射通用段码（统一响应契约已约定，无需自造 401/403 业务码）。

权限集合查询（`PermissionService.getUserPermissionCodes(userId)`）：`user_role → role(启用) → super_admin ? allCodes() : role_permission 串合集`。

### 3.5 业务接口面（后端全量，管理页批次五交付）

批次四已拍板：**接口全量落地，页面批次五集中交付**（批次五纯做 UI，A 档五模块管理页风格统一）。按域拆 controller / service / dto，全部挂权限注解：

**用户域**（`/api/system/user/*`）：

| 接口 | 权限 | 说明 |
| --- | --- | --- |
| `GET /page` | `system:user:query` | 分页列表（`PageParam` / `PageResult` 泛型契约随本期落地，A7） |
| `POST /create` | `system:user:create` | 用户名唯一校验；不传口令则用 `USER_INIT_PASSWORD` |
| `PUT /update` | `system:user:update` | 内置 admin 保护 |
| `DELETE /delete/:id` | `system:user:delete` | 软删（BaseEntity）；内置 admin 保护 |
| `PUT /reset-password` | `system:user:reset-password` | 重置为初始口令；内置 admin 保护 |
| `PUT /assign-role` | `system:user:update` | 用户-角色差集增量绑定（物理删除） |

**角色域**（`/api/system/role/*`）：

| 接口 | 权限 | 说明 |
| --- | --- | --- |
| `GET /page` | `system:role:query` | 分页列表 |
| `GET /:id` | `system:role:query` | 详情（含已分配权限串回显，读取侧不过滤注册表） |
| `POST /create` | `system:role:create` | code 唯一校验；`super_admin` 保留字拒绝创建 |
| `PUT /update` | `system:role:update` | 内置角色保护（禁改名/禁停用/禁删除） |
| `DELETE /delete/:id` | `system:role:delete` | 软删 + 解绑关联；内置角色保护 |
| `GET /:id/permissions` | `system:role:query` | 权限串回显 |
| `PUT /:id/permissions` | `system:role:assign-permission` | **写入侧逐串 registry.contains() 校验**，差集增量物理删除/插入 |

删除用户 / 角色时同步物理清理关联行（`user_role` / `role_permission`），避免唯一索引残留。

### 3.6 错误码段位登记（system 领 001 段）

`modules/system/error-codes.ts` 正式登记（ADR-002 的「段位表随批次四建立」兑现），同时在本表登记供后续模块对号：

| 模块段 | 模块 | 子域段 | 子域 | 登记批次 |
| --- | --- | --- | --- | --- |
| 001 | system（系统管理） | 000 | 认证 | 批次四 |
| 001 | system | 001 | 用户 | 批次四 |
| 001 | system | 002 | 角色 | 批次四 |
| 001 | system | 003+ | 字典 / 参数 / 日志等 | 批次五起 |

常量表（九位分段，`BusinessError` 只引常量杜绝裸数字）：

| 常量 | code | 文案 |
| --- | --- | --- |
| `AUTH_LOGIN_FAILED` | `100000000` | 登录账号或密码不正确 |
| `AUTH_LOGIN_DISABLED` | `100000001` | 账号已被停用 |
| `USER_NOT_EXISTS` | `100100000` | 用户不存在 |
| `USER_USERNAME_DUPLICATE` | `100100001` | 登录账号已存在 |
| `USER_ADMIN_OPERATION_FORBIDDEN` | `100100002` | 内置管理员不允许该操作 |
| `ROLE_NOT_EXISTS` | `100200000` | 角色不存在 |
| `ROLE_CODE_DUPLICATE` | `100200001` | 角色标识已存在 |
| `ROLE_BUILTIN_FORBIDDEN` | `100200002` | 内置角色不允许该操作 |
| `ROLE_PERMISSION_UNKNOWN` | `100200003` | 权限串未在代码注册表中登记 |

### 3.7 前端 auth 链路

**token 存储**（`web/src/utils/auth.ts`）：key `N1_TOKEN`（对齐 `N1_APP` / `N1_TAGS` 前缀纪律），存**纯 token 字符串**——n-2 存 `{tokenName, tokenValue}` 对象是 Sa-Token 头名动态所致，n-1 头名固定 `Authorization: Bearer`，无需对象形态。`getToken() / setToken() / removeToken()` 三函数，脏数据静默清理（照 storage 工具惯例）。

**auth store**（`web/src/stores/auth.ts`，组合式，照 n-2 五件套适配）：

- `token`（刷新自 localStorage 恢复）/ `user` / `roles` / `permissions`（super_admin 全集已在后端收敛，前端无特判）/ `isLoaded`
- `isLoggedIn` computed；`login(username, password)` → 存 token；`loadPermissionInfo()` → 拉三集合置 `isLoaded`（守卫在权限校验前调用）；`logout()` → **后端失败也清本地**（避免僵尸登录态）；`hasPermission(code)`
- 登出联动：守卫发现 `!isLoggedIn && tagsView.isInitialized` → `tagsView.reset()`（批次三预埋的登出清签 action 启用）

**http 层增强**（`web/src/api/http.ts`，A7）：

- 请求拦截器：解注释预留位——函数体内 `useAuthStore()` 延迟取用（Pinia 初始化顺序），token 存在则 `config.headers.Authorization = 'Bearer ' + token`
- 响应拦截器 error 分支（n-1 后端真实 HTTP 状态码，401 走 error 而非 code 分支）：`error.response?.status === 401` → 清 token + `window.location.href = '/login?redirect=' + encodeURIComponent(当前路径)`（整页跳转避免与路由模块循环依赖）；其余维持现状（message 弹错）
- 新增 `ApiError`（code + message）供调用方按码分支；`PageParam<T>` / `PageResult<T>` 泛型类型并入 `api/http.ts` 或 `api/types.ts`
- **登录接口 401 不误伤**：登录失败后端抛 BusinessError（HTTP 400 + 业务码），不触发 401 重定向

**路由改造**（ADR-001 落地）：

- `RouteMeta` 声明合并增补 `permission?: string`（页面级权限）与 `public?: boolean`（免登录白名单）
- 路由按模块拆文件：`router/modules/home.ts` / `demo.ts`（存量两页迁移），`router/index.ts` 汇总 `layoutChildren`——批次三预留注释兑现
- 根级新增 `/login`（`meta: { title: '登录', public: true }`，不进 Layout）
- **守卫 beforeEach（全新增）**：
  1. 已登出 → 清页签持久化（`tagsView.reset()`）
  2. `to.meta.public` → 已登录则回 `/home`，否则放行
  3. 未登录 → `{ path: '/login', query: { redirect: to.fullPath } }`
  4. `!isLoaded` → `await loadPermissionInfo()`（异常兜底跳登录）后重进放行
  5. `to.meta.permission` 且 `!hasPermission(...)` → **跳 404**（不泄露页面存在性，与「菜单不可见 = 无权」语义一致，复用 NotFoundView）
- afterEach 维持现状（页签恢复天然晚于权限加载，时序满足批次三预留约束）

**菜单过滤**（`utils/menu.ts`，布局组件零改动）：`buildMenuTree` 增第二参权限判定函数（默认恒真），`meta.permission` 存在且无权 → 该节点剔除（含子树）；`LayoutSidebar` 调用处传 `auth.hasPermission` 绑定。

**`v-hasPermi` 指令**（`web/src/directives/has-permi.ts`，照 n-2 近似直搬）：`mounted` 钩子内无权限则移除节点（OR 语义 `some` 匹配）；`main.ts` 注册 `app.directive('hasPermi', hasPermi)`。

**登录页**（`web/src/views/login/index.vue`）：

- 视觉：批次三预留「按 token 设计」兑现——青碧卡片浮起风格（近纯色画布 + 白卡片 + 10px 圆角 + 主色 `#0D9488` 按钮），只消费 `--n1-*` token 不硬编码色值；根级主题初始化已覆盖布局外页面
- 表单：username / password 两字段，required + blur 校验，回车提交，按钮 loading 态
- **e2e 契约**（照 n-2 文案，登记为本仓库契约不可随意改动）：placeholder「请输入登录账号」「请输入登录密码」、按钮「登 录」
- 提交：`auth.login()` → `router.push(redirect 参数，非法值兜底 /home)`；页脚提示种子账号 `admin / admin123`（开发便利，DEV 常显）

**DefaultUserDropdown 升级**（批次三预留位兑现）：「访客」静态展示 → 昵称 + 首字头像 + 下拉「退出登录」→ `ElMessageBox.confirm` → `auth.logout()` → `router.push('/login')`。**根元素 `.user-entry` 类保留**（e2e 选择器契约）。

### 3.8 e2e 与测试策略

**server 单测**（风险分级取舍）：

| 对象 | 策略 |
| --- | --- |
| `JwtAuthGuard` / `PermissionsGuard` / `@Public` | **必测**（契约守护类：豁免优先级、401/403 语义、审计激活），mock Repository 边界 |
| 权限注册表 | **必测**（串唯一、首段=模块、allCodes 全集）——防未来改坏 |
| `AuthService.login` | **重点测**（成功 / 用户不存在与密码错同码 / 停用 / token 可解析回 sub） |
| `PermissionService` 权限集合 | **重点测**（super_admin 全集 / 停用角色剔除 / 读写不对称两侧） |
| `bcryptjs` / 实体 / DTO | 不写（纯库调用与纯赋值） |
| web：auth store / 守卫 / has-permi / menu 过滤 / http 401 | 必测或重点测（复用批次三三件套：mock ElMessage、捕获型 adapter、stubEnv） |

**server e2e**（`server/test/auth.e2e-spec.ts`）：override `getRepositoryToken(...)` 为内存桩（DataSource 整体 stub 的既有模式细化到 Repository 层），覆盖：登录成功 / 失败同码 / 停用 / get-permission-info（含 super_admin 全集）/ 无 token 401 / 有 token 无权限 403 / `@Public` 放行。存量 e2e 的测试内临时控制器加 `@Public()`（签名用例的 DemoController 同时带 `@SkipSignature()` 场景不受影响）。

**浏览器 e2e**（`e2e/tests/登录链路.spec.ts`，对齐 n-2 auth.spec 覆盖面）：

1. 登录成功：跳首页 + 用户区昵称「系统管理员」+ 侧栏菜单照常渲染（`.user-entry` 契约）
2. 登录失败：错误口令弹错并停留登录页
3. 未登录重定向：直访受保护页 → `/login?redirect=` 携带来源
4. 退出登录：用户下拉 → 确认 → 回登录页，直访受保护页再被重定向

依赖后端 + 数据库种子 admin 的用例循既有「探测失败自动跳过」模式；`playwright.config.ts` 对齐 `workers: 1` + `fullyParallel: false`（批次一预告兑现；登录态用例串行最稳，规避 dev server 单实例下的会话互扰）。

## 4. 边界与不做清单

1. **不做用户 / 角色管理页面**（已拍板放批次五，本批次接口全量先行）
2. **不做刷新 token / token 撤销列表 / 多实例精撤**（ADR-003 无状态纪律；过期重登，禁用即时失效由存在性校验承担）
3. **不做在线用户枚举与逐 token 踢人**（ADR-003 能力边界；批次五以登录日志最近活跃 + 禁用承担语义）
4. **不做 remember-me / 第三方登录 / 验证码**（远期路线图）
5. **登录日志 / 操作日志埋点不落地**（批次五 `@OperateLog` 体系交付；logout 接口本期仅占位回 code 0）
6. **不给存量演示页（home / demo）挂权限**（演示载体不绑定 system 权限；权限过滤链路由单测 + 批次五管理页全链路验证）
7. **不改存量签名验证链路**（反向纪律；仅登录接口按拍板加 `@SkipSignature()` 豁免）
8. **不做部门 / 岗位 / 字典 / 参数关联**（批次五；用户表不含 dept 列）

## 5. 验收标准

1. 根目录 `pnpm check` 全绿（lint + 类型检查 + 前后端单测 + 后端 e2e，存量契约零破坏：404/401/签名等既有用例不回归）
2. 浏览器 e2e 全绿：存量 9 用例零回归 + 登录链路 4 用例新增通过
3. 无 token 访问受保护接口收 HTTP 401（code 401）；有效 token 无权限收 HTTP 403（code 403）；`GET /api/health` 匿名可达
4. 登录 → 拉权限 → 菜单 / 守卫 / 指令三层过滤链路在单测与 e2e 层面可验证
5. `migration:generate` 产出四表 DDL 迁移 + 手写种子迁移（admin / super_admin / 绑定）；本机无建表权时以生成物交付并留待办说明（同批次二）
6. 文档同步：《权限设计》新建、ADR-003 增实施定稿节、架构设计（Guard 链路）、统一响应设计（段位表补 system 行）、CLAUDE.md 当前状态、规划批次四回填 ✅、docs/README 索引

## 变更记录

| 日期 | 内容 |
| --- | --- |
| 2026-09-28 | 初版：四表数据模型、权限点注册表（TS 单层）、JWT 认证（查库校验 + 8h 定稿）、Guard 链路（签名→JWT→权限）、后端全量接口、错误码 001 段登记、前端五件套适配（N1_TOKEN / meta.permission / 菜单过滤 / 登录页 / 用户下拉）、e2e（server 认证 e2e + 浏览器 4 用例 + workers:1） |
| 2026-09-28 | **实施完成**：`pnpm check` 全绿（server 单测 119 + server e2e 27、web 单测 70）、浏览器 e2e 13 用例（存量 9 适配认证后零回归 + 新增登录链路 4）。实施差异两条留痕：① 真库迁移已闭环执行（批次二遗留「本机库账号无建表权」待办实际不存在，CreateSystemTables + InitialSeed 已在本机库真实跑通，curl 全链路验证登录 / 权限信息 / 401 / 403 语义）；② `@nestjs/jwt` 锁定 **11.x** 而非最新 12（12 为 ESM-only 包，Node 22 运行时可用但 Jest 29 CJS 模块系统无法解析；11.x 为 CJS 形态，JwtModule.registerAsync / signAsync / verifyAsync API 一致）。附带修复：`data-source.ts` 的 Windows 反斜杠 glob 缺陷（批次二遗留，`__dirname` 反斜杠在 glob 语法中是转义符导致实体零匹配）、本地 `.env` 的 `DB_SYNC` 关闭（迁移为唯一建表通道，防 watch 实例热重载建表漂移） |
