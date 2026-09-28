# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 最高优先级规则

**[rules/base.md](rules/base.md) 是本仓库最高优先级的 AI 工作规则，任何任务开始前先遵循该文件。**

规则文件经 `@` 导入语法随本文件自动注入上下文（会话启动即全文生效，无需主动读取；`base.md` 优先级最高）：

@rules/base.md
@rules/code-style.md
@rules/testing.md

## 当前状态

**前端门面（批次三）已完成**（2026-09-28，设计见 [docs/规划/批次三-前端门面设计.md](docs/规划/批次三-前端门面设计.md)，视觉细则见 [布局与风格设计](docs/前端/布局与风格设计.md)）：主布局系统落地（顶栏一整条 / 白卡片侧栏可收起 / 标签栏 / 连体白卡片内容区唯一滚动容器）；`--n1-*` 设计 token 明暗双套 + 三态主题（浅 / 深 / 跟随系统）+ 992px 断点自动收起；多标签页（fullPath 一签、右键批量关闭、redirect 中转刷新、N1_TAGS 持久化恢复、keep-alive 缓存跟随页签）；组件槽位注册表（6 槽位，业务 `registerComponentOverride` 覆盖）；工具件（storage / menu-icon / format / menu）。**视觉差异化定稿「青碧卡片浮起」**（主色 #0D9488、近纯色浅灰画布、白卡片分区、10px 圆角、舒适密度，不与 n-2 视觉同质）。web 依赖升至 n-2 同代：vue-router 5 / pinia 4 / vite 8 / TS 6 / ESLint 10 / vue-tsc 3（ESLint 10 下 plugin-vue 须以 parser 方式接入、TS 6 用自写 tsconfig，均照 n-2 验证形态；根级 ESLint 9 供 server lint 链路不动）。路由 name 升 **PascalCase**（keep-alive 缓存键契约：路由 name ↔ 页面 `defineOptions({ name })` ↔ 缓存名单）；侧栏菜单由 Layout 静态子路由树生成（`utils/menu.ts`，ADR-001 落地，批次四在此层加权限过滤）。新增「组件演示」两页（缓存 / 页签演示，批次六由样板模块吸收）。`pnpm check` 全绿、浏览器 e2e 9 用例通过（存量 3 零回归 + 新增 6）。

**数据层基建已完成**（2026-09-28，设计见 [docs/规划/批次二-数据层基建设计.md](docs/规划/批次二-数据层基建设计.md)，批次规划见 [n-2 消化吸收规划](docs/规划/n-2消化吸收规划.md)）：审计公共实体 `BaseEntity`（uuid 主键 + timestamptz 审计列 + TypeORM 原生软删，ADR-004 实施，业务实体一律继承）；请求上下文（AsyncLocalStorage 中间件）+ `AuditSubscriber` 审计自动填充（creator / updater，批次四接 JWT 后由 Guard 激活）；蛇形命名策略（自写 `SnakeNamingStrategy`）；TypeORM 迁移体系落地（`server/src/data-source.ts` + `migration:generate / run / revert` 三命令 + 空基线 `InitialBaseline`，ADR-005 实施）；`DB_SYNC` 生产强制关闭并告警；建表类型规约（PG 优先版：uuid / boolean / timestamptz / numeric）并入架构文档。新增 `dotenv` 一项事实依赖（迁移 CLI 读 `.env`）。`pnpm check` 全绿、浏览器 e2e 不回归（后端真实拉起验证装配正常）。**待办**：真库迁移闭环因本机库账号无建表权未跑，授权 SQL 见批次二设计文档 §5。

**工程化快赢与契约定稿已完成**（2026-09-28，设计见 [docs/规划/批次一-工程化快赢与契约定稿.md](docs/规划/批次一-工程化快赢与契约定稿.md)）：错误码升级为九位分段体系（模块 / 子域 / 序号各 3 位，通用段数值等于 HTTP 语义码，`BusinessError` 默认未分类业务码 999，前端判定改 `code !== 0`，ADR-002 实施定稿）；新增请求访问日志（含业务 code 回填）与安全响应头两个中间件；web vitest 切 jsdom + `@vue/test-utils`（组件测试链路解锁）；prettier + lint-staged 落地（ts/vue 归 ESLint，prettier 只兜 CSS）；浏览器 e2e 升级双 webServer（后端可拉起性探测自动拉起，无库环境回退为跳过）。`pnpm check` 全绿、浏览器 e2e 不回归，存量契约零破坏（404/401 等框架级 code 数值不变）。

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
- 端口约定：后端 **3000**（全局路由前缀 `/api`，Swagger 在 `/api-docs`）、前端 **5173**（Vite 将 `/api` 代理到 3000）、PostgreSQL **独立部署**（连接信息经 `server/.env` 配置，本机已部署实例的口令与模板默认值不同）
- 请求链路：浏览器 → Vite 代理 → NestJS Controller → Service → TypeORM Repository → PostgreSQL

### 工程化设施

- **提交门禁**（lefthook，钩子随 `pnpm install` 自动安装）：pre-commit 对暂存代码文件自动修复格式——server 走 ESLint 修复并重新暂存，web 走 lint-staged（ESLint 修复 + CSS prettier）；commit-msg 校验提交信息格式 **`【动作】模块 - 内容概述`**（动作两字为主：新增 / 修改 / 修复 / 移除 / 重构 / 优化；模块如 `server` / `web` / `e2e` / `文档` / `工程化` / 业务模块名）
- **编辑器一致性**：`.editorconfig`（缩进 / 换行 / 文件末尾）+ `.vscode/settings.json`（保存即 ESLint 自动修复、LF 统一）
- **测试分层**：单元测试（server Jest / web Vitest，`*.spec.ts` 与源码同目录）→ 后端 API e2e（`server/test/`，supertest，DataSource 打桩）→ 浏览器全链路 e2e（`e2e/`，Playwright）；**写不写、写到什么程度按风险分级取舍，不逐文件配 spec**，细则见 [rules/testing.md](rules/testing.md)
- **完成定义**：改动完成的标志是根目录 `pnpm check` 全绿（详见 [rules/base.md](rules/base.md)）

### 后端（server/）

- **配置**：环境变量（`.env`，模板 `.env.example`）→ `src/config/configuration.ts` 汇总 → `ConfigService` 读取。业务代码**不直接读 `process.env`**
- **数据库**：`TypeOrmModule.forRootAsync` 装配；`autoLoadEntities: true` —— 新实体只需在业务模块中 `forFeature([...])` 注册；业务实体**一律继承** `common/orm/base.entity.ts` 的 `BaseEntity`（uuid 主键 + 审计字段自动填充 + 软删，ADR-004）；表 / 列名蛇形小写（`SnakeNamingStrategy`）；`DB_SYNC=true`（仅开发）自动同步表结构，**生产强制关闭并告警**，建表与升级走 `migration:run`（实体为 schema 唯一事实源，见 [docs/决策/ADR-005](docs/决策/ADR-005-数据库迁移策略.md)）。默认与首选 PostgreSQL，**仅承诺主流数据库，不做国产数据库适配**（TypeORM 理论上支持多库切换，但不在本项目保障范围）
- **业务模块**：按领域放 `server/src/modules/<领域>/`，生成骨架：`pnpm --filter server exec nest g resource modules/<领域>`
- **全局设施**（main.ts）：路由前缀 `/api`、ValidationPipe（transform + whitelist + forbidNonWhitelisted）、CORS、Swagger（`SWAGGER_ENABLED` 控制）
- **横切中间件**（`common/middleware/`，经 AppModule 的 NestModule 注册，e2e 自动继承）：请求上下文（每请求开启 AsyncLocalStorage 域，供审计填充读取操作人）→ 安全响应头（全部响应注入 6 个防御头）→ 请求访问日志（`/api` 业务接口输出一行：方法 / 路径 / 状态码 / 业务 code / 耗时；业务 code 由拦截器与异常过滤器回填到 request）
- **错误码**：九位分段体系（模块 / 子域 / 序号各 3 位，`ErrorCode` 常量为唯一出处，通用段见 `common/errors/error-code.ts`；`BusinessError` 默认未分类业务码 999），详见 [统一响应与异常处理设计](docs/指南/统一响应与异常处理设计.md)
- **测试**：Jest。单元测试与源码同目录（`*.spec.ts`）；e2e 在 `test/`，通过 `overrideProvider(getDataSourceToken())` 打桩跳过真实数据库

### 前端（web/）

- 入口 `src/main.ts`：装配 Pinia、路由守卫、Element Plus（中文 locale，全量引入 + 暗色 css-vars）
- **主布局 `src/layouts/default/`**（顶栏 / 侧栏 / 标签栏 / 内容卡片）+ **槽位注册表 `src/framework/slots/`**（业务覆盖机制），设计与视觉 token 见 [布局与风格设计](docs/前端/布局与风格设计.md)；业务组件只消费 `--n1-*` token，不硬编码色值
- **API 调用统一走 `src/api/http.ts` 的 axios 实例**（baseURL 来自 `VITE_API_BASE_URL`），组件内不直接创建 axios
- 状态按领域拆分至 `src/stores/`（app 外观 / tags-view 多标签）；路由在 `src/router/index.ts` 静态注册（菜单由 Layout 子路由树生成，ADR-001），守卫在 `router/guard.ts`；**路由 name 一律 PascalCase**（keep-alive 缓存键契约）
- `@` 别名指向 `src/`；TypeScript 项目引用结构（自写 tsconfig.app / tsconfig.node），类型检查用 `vue-tsc --build`
- 单元测试用 Vitest（jsdom 环境 + `@vue/test-utils` 支持组件测试；配置内嵌 `vite.config.ts` 的 `test` 字段，用例与源码同目录 `*.spec.ts`）

### 代码规范

**风格细则见 [rules/code-style.md](rules/code-style.md)，由 ESLint（`@stylistic` + `import-x`）强制，改完代码运行 `pnpm lint` 自动修复。** 要点：结尾无分号、字符串单引号、2 空格缩进、import 分组排序、多行保留尾逗号；**后端日志必须用 Nest `Logger`**（`console.*` 被 lint 禁止）；前端开发期允许 `console.warn`/`console.error`。

- ESLint 9 扁平配置：server 为 typescript-eslint 类型感知检查；web 为 eslint-plugin-vue + typescript-eslint
- 修改文件时保留原头部注释中的作者与创建时间，不据为己有
