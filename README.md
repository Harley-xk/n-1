<div align="center">

# n-1

**企业级全栈项目框架底座 · 为 vibe coding first 的 AI 编程范式而生**

NestJS 11 · TypeORM · PostgreSQL ｜ Vue 3 · Pinia · Element Plus

[快速开始](#快速开始) · [常用命令](#常用命令) · [开发文档](docs/) · [AI 工作规则](rules/base.md) · [许可证](#许可证)

</div>

---

## 项目简介

n-1 是一套**企业级全栈项目框架底座**，面向 **vibe coding first** 的 AI 编程范式：

- **框架底座**：pnpm 单仓库（monorepo）管理前后端，开箱即用的开发、构建、测试、调试链路
- **成熟技术栈**：全部选用经过大规模生产验证的开源框架，无自研魔改依赖，代码以 MIT 许可证开源共享
- **为 AI 编程而生**：规则目录（rules/）+ 文档先行 + ESLint 保存即修复 + lefthook 提交门禁 + `pnpm check` 一键自检 + Playwright 自动验收，让 vibe coding 产出的代码风格统一、质量可控
- **约定优于配置**：统一的目录结构、配置管理与编码约定，降低团队协作与 AI 辅助开发成本

## 技术栈

| 端 | 技术 | 说明 |
| --- | --- | --- |
| 后端 | Node.js 20+ / NestJS 11 | 模块化企业级后端框架 |
| ORM | TypeORM | 数据库访问与实体建模 |
| 数据库 | PostgreSQL（默认） | 生产级关系型数据库；仅承诺主流数据库，不做国产化适配 |
| 前端 | Vue 3 / Vite / TypeScript | 组合式 API + 渐进式框架 |
| 状态管理 | Pinia | Vue 官方推荐状态管理 |
| UI 组件库 | Element Plus | 企业级 Vue 3 组件库 |
| 接口文档 | Swagger（OpenAPI） | 随代码自动生成 |
| 包管理 | pnpm workspace | 单仓库多包管理 |

## 仓库结构

```text
n-1/
├── server/               # 后端服务（NestJS 11 + TypeORM + PostgreSQL）
│   ├── src/
│   │   ├── config/       # 环境配置工厂
│   │   ├── modules/      # 业务模块（按领域拆分）
│   │   ├── app.module.ts # 根模块：配置 + 数据库装配
│   │   └── main.ts       # 应用入口：全局管道 / Swagger / 启动
│   ├── test/             # e2e 测试
│   └── .env.example      # 环境变量模板
├── web/                  # 前端应用（Vue 3 + Pinia + Element Plus）
│   └── src/
│       ├── api/          # axios 实例与接口封装
│       ├── router/       # 路由
│       ├── stores/       # Pinia 状态
│       ├── views/        # 页面
│       └── main.ts       # 应用入口
├── e2e/                  # 浏览器端到端测试（Playwright，全链路验收）
│   └── tests/            # 用例：首页展示（纯前端）、后端连通性（服务就绪时执行）
├── docs/                 # 开发文档（中文维护）
├── rules/                # AI 工作规则（base.md 为最高优先级）
├── scripts/              # 工程化脚本
├── .vscode/              # VS Code 调试配置（launch / tasks / 推荐扩展 / 仓库设置）
├── .editorconfig         # 编辑器一致性配置（缩进 / 换行 / 文件末尾）
├── LICENSE               # MIT 开源许可证
├── lefthook.yml          # Git 提交门禁（pre-commit 自动 lint / commit-msg 校验）
└── pnpm-workspace.yaml   # monorepo 工作区配置
```

## 环境要求

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 20 | 前后端构建运行基础 |
| pnpm | ≥ 9 | 包管理器（`npm i -g pnpm`） |
| PostgreSQL（默认） | 16+ | 数据库独立部署，连接信息在 `server/.env` 配置 |

## 快速开始

```bash
# 1. 克隆仓库
git clone <仓库地址> && cd n-1

# 2. 安装依赖
pnpm install

# 3. 准备后端环境变量（按独立部署的 PostgreSQL 实际连接信息修改）
cp server/.env.example server/.env    # Windows: copy server\.env.example server\.env

# 4. 并行启动前后端开发服务
pnpm dev
```

### 访问入口

| 入口 | 地址 |
| --- | --- |
| 前端应用 | http://localhost:5173 |
| 后端 API | http://localhost:3000/api |
| 健康检查 | http://localhost:3000/api/health |
| Swagger 接口文档 | http://localhost:3000/api-docs |

> 首页中的「后端连通性检查」卡片可用于验证前后端链路是否打通。

## 常用命令

在仓库根目录执行：

| 命令 | 说明 |
| --- | --- |
| `pnpm install` | 安装全部依赖（并自动安装 Git 提交钩子） |
| `pnpm dev` | 并行启动前后端 |
| `pnpm dev:server` / `pnpm dev:web` | 单独启动后端 / 前端 |
| `pnpm build` | 构建前后端产物 |
| `pnpm check` | **一键自检**：lint + 类型检查 + 前后端单元测试 + 后端 API e2e |
| `pnpm test` | 运行前后端单元测试（server Jest / web Vitest） |
| `pnpm test:e2e` | 运行后端 API e2e 测试（无需真实数据库） |
| `pnpm test:e2e:web` | 运行浏览器端到端测试（Playwright，自动拉起前端，复用本机 Chrome / Edge，无需下载浏览器） |
| `pnpm lint` | 前后端 ESLint 检查并自动修复 |
| `pnpm type-check` | 前端类型检查（vue-tsc） |

运行单个测试文件：`pnpm --filter server test -- app.controller`

## 开发指南

### 新增后端业务模块

推荐使用 NestJS CLI 生成骨架，随后补充实现：

```bash
pnpm --filter server exec nest g resource modules/users
```

模块内通过 `TypeOrmModule.forFeature([User])` 注册实体后即被自动加载。开发环境下 `DB_SYNC=true` 会自动同步表结构；**生产环境必须关闭并改用迁移**。

### 新增前端页面

在 `web/src/views/` 下新建组件，并在 `web/src/router/index.ts` 注册路由；页面标题取自 `RouteMeta.title`。

### VS Code 一键调试

仓库内置 `.vscode/launch.json`，按 **F5** 即可选择三个调试配置（适用于 VS Code 及其衍生编辑器）：

| 配置 | 行为 |
| --- | --- |
| 前端：仅调试前端 | 后台任务启动 Vite 并打开 Chrome 调试（断点生效），不等待后端 |
| 后端：仅调试后端 | 以调试模式直接启动 NestJS（`launch` 模式），断点生效 |
| 前后端：同步调试 | 并行启动以上两项；浏览器会等后端 3000 端口就绪后再打开（[wait-for-server.mjs](scripts/wait-for-server.mjs)），避免首屏接口报错 |

**停止即收尾**：后端会话由 VS Code 终止整个进程树；前端会话停止时 Vite 经 `postDebugTask` 一并终止——不会残留后台任务或占用端口的进程。

**常用调试快捷键**（VS Code 默认键位，Windows 与 macOS 一致；若本机已自定义键位，请以实际为准）：

| 操作 | 快捷键（默认） |
| --- | --- |
| 启动 / 继续 | `F5` |
| 停止调试 | `Shift+F5` |
| 重启调试 | `Ctrl / ⌘ + Shift+F5` |
| 单步跳过 | `F10` |
| 单步进入 | `F11` |
| 单步跳出 | `Shift+F11` |

命令行等价调试命令：`pnpm --filter server run dev:debug`（后端，监听 9229，可手动附加）。

### 配置管理

- **后端**：配置统一经环境变量注入（模板 `server/.env.example`），在 `server/src/config/configuration.ts` 汇总后经 `ConfigService` 读取，业务代码不直接访问 `process.env`
- **前端**：环境变量以 `VITE_` 前缀声明（`.env.development` / `.env.production`），类型见 `web/env.d.ts`

### 换行符（跨平台协作）

本仓库通过根目录 [.gitattributes](.gitattributes) 统一换行符：**文本文件一律以 LF 入库与检出**，Windows 批处理脚本（`.bat` / `.cmd` / `.ps1`）保持 CRLF，二进制文件不做转换。macOS 与 Windows 混合开发无需额外配置本机 `core.autocrlf`。

编辑器实时输入行为（缩进、换行、文件末尾空行、行尾空白）由 [.editorconfig](.editorconfig) 约束（VS Code 配合 EditorConfig 扩展，见 [.vscode/extensions.json](.vscode/extensions.json)）；代码文件保存时的 ESLint 自动修复由 [.vscode/settings.json](.vscode/settings.json) 驱动。

### 提交信息与提交门禁

提交信息统一使用固定格式（详见 [rules/base.md](rules/base.md)）：

```text
【动作】模块 - 内容概述
```

- **动作**以两个字为主：新增 / 修改 / 修复 / 移除 / 重构 / 优化 等
- 示例：`【新增】用户模块 - 登录接口与 JWT 鉴权`

提交门禁由 [lefthook.yml](lefthook.yml) 定义，`pnpm install` 时自动安装钩子：

- **pre-commit**：对暂存的代码文件（`.ts` / `.js` / `.vue` 等）自动执行 ESLint 修复并重新暂存，存在无法自动修复的问题时中断提交
- **commit-msg**：校验提交信息格式（[verify-commit-msg.mjs](scripts/verify-commit-msg.mjs)），合并 / 还原等自动生成的提交不受限

## 开发文档

文档集中维护在 [docs/](docs/) 目录，全部使用中文撰写，按模块和功能分门别类（目录导航见 [docs/README.md](docs/README.md)）：

- [架构设计](docs/架构设计.md) —— 总体架构、分层设计、配置与数据访问约定

业务开发遵循**文档先行**（[rules/base.md](rules/base.md)）：先在 `docs/` 对应模块目录下编写设计文档，再写代码。

## AI 工作规则

针对 AI 辅助开发的工作规则维护在 [rules/](rules/) 目录，AI 生成代码必须遵循：

- [base.md](rules/base.md) —— 最高优先级基础约定：文档先行、完成定义（`pnpm check`）、提交信息规范、文件头部注释（仅代码文件署名）、MIT 开源许可
- [code-style.md](rules/code-style.md) —— 代码风格：无分号、单引号、2 空格缩进、import 分组排序、后端 Nest Logger 等，由 ESLint（`@stylistic` + `import-x`）自动强制

## 路线图

- [ ] 统一响应结构与全局异常处理
- [ ] 认证与授权（JWT + RBAC）
- [ ] 数据库迁移（TypeORM Migrations）
- [ ] 前端按需引入与构建优化
- [ ] CI/CD 与代码质量门禁

## 许可证

本项目以 [MIT 许可证](LICENSE)开源，许可证全文见仓库根目录 [LICENSE](LICENSE)。
