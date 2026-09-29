# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 最高优先级规则

**[rules/base.md](rules/base.md) 是本仓库最高优先级的 AI 工作规则，任何任务开始前先遵循该文件。**

规则文件经 `@` 导入语法随本文件自动注入上下文（会话启动即全文生效，无需主动读取；`base.md` 优先级最高）：

@rules/base.md
@rules/code-style.md
@rules/testing.md

## 项目现状

底座能力已全部落地并通过验证（截至 2026-09-29），n-1 可作为独立项目直接使用与二次开发：

**后端**（`server/src/`）：全局 Guard 链**签名 → JWT 认证 → 权限**（`@Public()` 豁免 JWT、`@SkipSignature()` 豁免签名、`@RequirePermissions` OR 语义）；无状态 JWT（Bearer + 逐请求查库存在性校验，禁用 / 删除即时失效，8h 有效期，ADR-003）；权限点注册表**多模块聚合**（模块 `permissions.ts` + `onModuleInit` 中 `registerModule` 接入，启动期 fail-fast：模块重名 / 首段不符 / 权限串冲突即抛错；现行 34 项，super_admin 全集 = `allCodes()` 后端收敛）；system 模块九域（认证 / 用户 / 角色 / 部门 / 岗位 / 字典 / 参数 / 操作日志 / 登录日志）+ demo 样板商品模块（新业务模块照 `modules/demo` 执行，八步清单见 [新模块接入指南](docs/指南/新模块接入指南.md)）；横切设施——`BaseEntity`（uuid 主键 + 审计列 + 软删，业务实体一律继承）、`AuditSubscriber` 审计填充、蛇形命名、异步任务队列 `AsyncTaskQueue`（并发 4 / 队容 200 / 队满降级当场执行）、`@OperateLog` 操作日志拦截器（参数序列化截 2000 + password 掩敏）、访问日志与安全响应头中间件、九位分段错误码（通用 000 / system 001 / demo 002，ADR-002）。

**前端**（`web/src/`）：主布局系统（顶栏一整条 / 白卡片侧栏可收起 / 多标签页 fullPath 一签 / 连体内容卡唯一滚动容器，视觉方案「青碧卡片浮起」见 [布局与风格设计](docs/前端/布局与风格设计.md)）；`--n1-*` 设计 token 明暗双套 + 三态主题 + 992px 断点自动收起；组件槽位注册表（6 槽位，业务 `registerComponentOverride` 覆盖）；登录链路（登录页 / 五分支路由守卫 / `v-hasPermi` 指令 / http 层 401 清令牌整页接管 / auth store）；dict 三件套（store / `DictTag` / `DictSelect`）；系统管理八页与商品管理页；**路由 name 一律 PascalCase**（keep-alive 缓存键契约：路由 name ↔ 页面 `defineOptions({ name })` ↔ 缓存名单）；业务组件只消费 `--n1-*` token，不硬编码色值。

**关键约定**：种子账号 admin / admin123（初始口令经参数 `system.user.init-password` → env → admin123 三级兜底）；**迁移为唯一建表通道**（本地 `.env` 的 `DB_SYNC` 已关，生产强制关闭并告警）；前端端口 **5180**（`strictPort`，避开 Vite 默认 5173 的本机多项目冲突）；`@nestjs/jwt` 锁 **11.x**（12 为 ESM-only，Jest CJS 不兼容）。

**验证基线**：`pnpm check` 全绿（server 单测 202 + e2e 41、web 单测 84）、浏览器 e2e 23 用例（首页 / 登录链路 / 布局与多标签 / 系统管理 / 开发示例 / 后端连通性）。

## 语言约定

**全局使用中文思考和对话**：与用户的交流、思考过程一律使用中文。

所有文档、代码注释、接口描述、提交信息均使用**中文**撰写。

## 项目概述

n-1：企业级全栈项目框架底座，面向 **vibe coding first** 的 AI 编程范式（为 AI 编码服务的工程基座，非 AI Agent 项目）。pnpm workspace 单仓库（monorepo）：

- `server/` —— NestJS 11 + TypeORM + PostgreSQL 后端 API
- `web/` —— Vue 3 + Pinia + Element Plus 前端 SPA
- `e2e/` —— Playwright 浏览器端到端测试（页面 → Vite 代理 → 后端 API 全链路验收）
- `docs/` —— 中文开发文档
- `rules/` —— AI 工作规则（base.md 最高优先级）
- `scripts/` —— 工程化脚本

## 常用命令

在仓库根目录执行（必须使用 pnpm，不要用 npm/yarn）：

| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 安装全部依赖（自动安装 lefthook 提交钩子） |
| `pnpm dev` | 并行启动前后端开发服务 |
| `pnpm dev:server` / `pnpm dev:web` | 单独启动后端（watch 模式）/ 前端 |
| `pnpm build` | 构建前后端 |
| `pnpm test` | 前后端单元测试（server Jest / web Vitest） |
| `pnpm --filter server test -- app.controller` | 运行单个测试（按名称匹配测试文件） |
| `pnpm test:e2e` | 后端 e2e 测试（无需真实数据库，DataSource 已打桩） |
| `pnpm test:e2e:web` | 浏览器端到端测试（Playwright，条件双 webServer 自动拉起前后端、复用本机 Chrome/Edge；无库环境自动回退为仅前端，全链路用例跳过；`E2E_BROWSER=msedge` 可切 Edge） |
| `pnpm --filter server migration:run` | 数据库迁移：执行未跑的迁移（另有 `migration:generate -- src/migrations/<名称>` 生成、`migration:revert` 回退） |
| `pnpm check` | 一键自检：lint + 类型检查 + 单测 + 后端 e2e（完成定义，见 rules/base.md） |
| `pnpm lint` | 前后端 ESLint 检查并修复 |
| `pnpm type-check` | 前端 vue-tsc 类型检查 |
| `pnpm --filter web run format` | 前端 CSS 格式化（prettier；ts/vue 格式由 ESLint 负责） |

VS Code 调试：`.vscode/launch.json` 提供三个一键配置（仅前端 / 仅后端 / 前后端同步）。后端为 `launch` 模式直接以调试方式运行 `pnpm --filter server run dev:debug`，停止调试即终止进程；前端调试主体是浏览器页面，Vite 经 `preLaunchTask`（任务 `dev:web`）后台启动、`postDebugTask` 随会话终止。

## 架构

### 整体

- 前后端同仓库、独立构建，pnpm workspace 管理
- 端口约定：后端 **3000**（全局路由前缀 `/api`，Swagger 在 `/api-docs`）、前端 **5180**（Vite 将 `/api` 代理到 3000；避开 Vite 默认 5173 防本机多项目冲突，`strictPort` 占用即失败）、PostgreSQL **独立部署**（连接信息经 `server/.env` 配置，本机已部署实例的口令与模板默认值不同）
- 请求链路：浏览器 → Vite 代理 → NestJS Controller → Service → TypeORM Repository → PostgreSQL

### 工程化设施

- **提交门禁**（lefthook，钩子随 `pnpm install` 自动安装）：pre-commit 对暂存代码文件自动修复格式——server 走 ESLint 修复并重新暂存，web 走 lint-staged（ESLint 修复 + CSS prettier）；commit-msg 校验提交信息格式 **`【动作】模块 - 内容概述`**（动作两字为主：新增 / 修改 / 修复 / 移除 / 重构 / 优化；模块如 `server` / `web` / `e2e` / `文档` / `工程化` / 业务模块名）
- **编辑器一致性**：`.editorconfig`（缩进 / 换行 / 文件末尾）+ `.vscode/settings.json`（保存即 ESLint 自动修复、LF 统一）
- **测试分层**：单元测试（server Jest / web Vitest，`*.spec.ts` 与源码同目录）→ 后端 API e2e（`server/test/`，supertest，DataSource 打桩）→ 浏览器全链路 e2e（`e2e/`，Playwright）；**写不写、写到什么程度按风险分级取舍，不逐文件配 spec**，细则见 [rules/testing.md](rules/testing.md)
- **完成定义**：改动完成的标志是根目录 `pnpm check` 全绿（详见 [rules/base.md](rules/base.md)）

### 后端（server/）

- **配置**：环境变量（`.env`，模板 `.env.example`）→ `src/config/configuration.ts` 汇总 → `ConfigService` 读取。业务代码**不直接读 `process.env`**
- **数据库**：`TypeOrmModule.forRootAsync` 装配；`autoLoadEntities: true` —— 新实体只需在业务模块中 `forFeature([...])` 注册；业务实体**一律继承** `common/orm/base.entity.ts` 的 `BaseEntity`（uuid 主键 + 审计字段自动填充 + 软删，ADR-004）；表 / 列名蛇形小写（`SnakeNamingStrategy`）；`DB_SYNC=true`（仅开发）自动同步表结构，**生产强制关闭并告警**，建表与升级走 `migration:run`（实体为 schema 唯一事实源，见 [docs/决策/ADR-005](docs/决策/ADR-005-数据库迁移策略.md)）。默认与首选 PostgreSQL，**仅承诺主流数据库，不做国产数据库适配**（TypeORM 理论上支持多库切换，但不在本项目保障范围）
- **业务模块**：按领域放 `server/src/modules/<领域>/`，生成骨架：`pnpm --filter server exec nest g resource modules/<领域>`；**新模块从 0 到 1 照 `modules/demo` 样板执行**（八步清单见 [docs/指南/新模块接入指南.md](docs/指南/新模块接入指南.md)）
- **全局设施**（main.ts）：路由前缀 `/api`、ValidationPipe（transform + whitelist + forbidNonWhitelisted）、CORS、Swagger（`SWAGGER_ENABLED` 控制）
- **横切中间件**（`common/middleware/`，经 AppModule 的 NestModule 注册，e2e 自动继承）：请求上下文（每请求开启 AsyncLocalStorage 域，供审计填充读取操作人）→ 安全响应头（全部响应注入 6 个防御头）→ 请求访问日志（`/api` 业务接口输出一行：方法 / 路径 / 状态码 / 业务 code / 耗时；业务 code 由拦截器与异常过滤器回填到 request）
- **认证与权限**（`modules/system/`，详见 [权限设计](docs/指南/权限设计.md)）：全局 Guard 链 **签名 → JWT 认证 → 权限**（APP_GUARD 数组顺序）；`@Public()` 豁免 JWT、`@SkipSignature()` 豁免签名（登录接口双豁免）；接口挂 `@RequirePermissions(...权限点常量)`（OR 语义）；无状态 JWT（Bearer + 逐请求查库存在性校验，ADR-003）；权限点注册表为**多模块聚合**——新模块在模块自己的 `permissions.ts` 登记清单、模块 `onModuleInit` 中 `registerModule` 接入（首段 = 模块名，启动期 fail-fast），错误码常量在 `error-codes.ts` 登记（模块段唯一，登记表见接入指南）
- **错误码**：九位分段体系（模块 / 子域 / 序号各 3 位，`ErrorCode` 常量为唯一出处，通用段见 `common/errors/error-code.ts`；`BusinessError` 默认未分类业务码 999），详见 [统一响应与异常处理设计](docs/指南/统一响应与异常处理设计.md)
- **测试**：Jest。单元测试与源码同目录（`*.spec.ts`）；e2e 在 `test/`，通过 `overrideProvider(getDataSourceToken())` 打桩跳过真实数据库

### 前端（web/）

- 入口 `src/main.ts`：装配 Pinia、路由守卫、Element Plus（中文 locale，全量引入 + 暗色 css-vars）
- **主布局 `src/layouts/default/`**（顶栏 / 侧栏 / 标签栏 / 内容卡片）+ **槽位注册表 `src/framework/slots/`**（业务覆盖机制），设计与视觉 token 见 [布局与风格设计](docs/前端/布局与风格设计.md)；业务组件只消费 `--n1-*` token，不硬编码色值
- **API 调用统一走 `src/api/http.ts` 的 axios 实例**（baseURL 来自 `VITE_API_BASE_URL`），组件内不直接创建 axios；token 自动注入（读 N1_TOKEN），401 清令牌整页跳 `/login?redirect=`，业务错误 reject `ApiError`（携分段 code）
- 状态按领域拆分至 `src/stores/`（app 外观 / tags-view 多标签 / auth 认证）；路由在 `src/router/index.ts` 静态注册（业务模块拆 `router/modules/` 文件后合并），守卫在 `router/guard.ts`（登录态校验 + `meta.permission` 无权直链跳 404）；菜单由 Layout 子路由树**按权限过滤**生成（ADR-001）；页内按钮粒度用 `v-hasPermi` 指令；**路由 name 一律 PascalCase**（keep-alive 缓存键契约）
- `@` 别名指向 `src/`；TypeScript 项目引用结构（自写 tsconfig.app / tsconfig.node），类型检查用 `vue-tsc --build`
- 单元测试用 Vitest（jsdom 环境 + `@vue/test-utils` 支持组件测试；配置内嵌 `vite.config.ts` 的 `test` 字段，用例与源码同目录 `*.spec.ts`）

### 代码规范

**风格细则见 [rules/code-style.md](rules/code-style.md)，由 ESLint（`@stylistic` + `import-x`）强制，改完代码运行 `pnpm lint` 自动修复。** 要点：结尾无分号、字符串单引号、2 空格缩进、import 分组排序、多行保留尾逗号；**后端日志必须用 Nest `Logger`**（`console.*` 被 lint 禁止）；前端开发期允许 `console.warn`/`console.error`。

- ESLint 9 扁平配置：server 为 typescript-eslint 类型感知检查；web 为 eslint-plugin-vue + typescript-eslint
- 修改文件时保留原头部注释中的作者与创建时间，不据为己有
