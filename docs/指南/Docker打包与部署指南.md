# Docker 打包与部署指南

> **备选方案**：docker 单镜像已降为备选（[ADR-007](../决策/ADR-007-发布包直部署.md) 取代 ADR-006）；主方案为发布包直部署，见 [打包与部署指南](打包与部署指南.md)。本文在部署形态演进为多机 / 容器化平台时启用，工具链资产保留可用。

本文是 n-1 docker 打包编译工具链与服务器部署的**唯一设计依据**：镜像结构、构建流程、云效流水线配置、服务器初始化与日常发布 / 回滚操作均以本文为准。决策背景见 [ADR-006](../决策/ADR-006-部署形态与镜像打包.md)。

## 1. 部署形态与网络拓扑

```text
浏览器
  │ HTTPS / HTTP
  ▼
Ubuntu 服务器 · 全局 nginx（已有）          ← 站点配置见 deploy/nginx-gateway.conf.example
  │ proxy_pass http://127.0.0.1:8080
  ▼
Docker 容器 n1（前后端单镜像，镜像内 nginx :80）
  ├── 前端静态资源 /usr/share/nginx/html（SPA，try_files 回退）
  ├── /api、/api-docs ──反代──▶ 容器内 NestJS（node dist/main.js :3000）
  │                                 │
  │                                 ▼
  │                          外置 PostgreSQL（DB_* 配置指向）
  └── 入口脚本 entrypoint.sh：等数据库就绪 → 执行迁移 → 拉起 nginx 与应用
```

要点：

- **两级 nginx**：服务器全局 nginx 只认一个 upstream（`127.0.0.1:8080`），不感知容器内部结构；镜像内 nginx 负责静态资源与 API 分流。镜像自包含，可整体迁移。
- **端口仅本机监听**：compose 将容器 80 映射到 `127.0.0.1:8080`，外部无法绕过全局 nginx 直连容器。
- **数据库外置**：容器经 `DB_*` 环境变量连接外部 PostgreSQL；数据库与服务器同机时 `DB_HOST` 填 `host.docker.internal`（compose 已配置 host-gateway 映射）。
- **配置外置**：`deploy/server.env` 放服务器工作目录，经 compose `env_file` 注入容器——容器启动时读取宿主机文件，镜像内不含任何环境差异配置。

## 2. 工具链文件清单

| 文件 | 职责 |
| --- | --- |
| `Dockerfile`（根） | 多阶段构建：依赖安装 → 前后端编译 → 生产依赖提取 → 运行时镜像组装 |
| `.dockerignore`（根） | 排除 `.git`、`node_modules`、`dist`、`server/.env` 等，瘦身构建上下文并防止本地配置泄入镜像 |
| `docker/nginx.conf` | 镜像内 nginx 站点配置：静态资源缓存、SPA 回退、`/api` 反代 |
| `docker/entrypoint.sh` | 容器入口：等数据库 → 跑迁移 → 起 nginx → exec node（PID 1，SIGTERM 优雅关停） |
| `deploy/docker-compose.yml` | 服务器运行编排：端口映射、env_file、健康检查、重启策略（放 `/opt/n1/`） |
| `deploy/server.env.example` | 外置运行配置模板（复制为 `server.env` 后修改，放 `/opt/n1/`） |
| `deploy/nginx-gateway.conf.example` | 服务器全局 nginx 站点配置示例 |
| `deploy/deploy.sh` | 云效主机部署脚本：`docker load` + `docker compose up -d` + 清理悬空层 |

## 3. 镜像设计

### 3.1 多阶段构建（Dockerfile）

```text
阶段 build      全量安装依赖（--filter server --filter web）→ 构建前端（注入 VITE_SIGN_SECRET）→ 构建后端（nest build → dist）
阶段 prod-deps  仅安装 server 生产依赖（--prod --filter server，不含 devDependencies）
阶段 运行时     node:22-alpine + nginx；拷入 workspace 依赖布局 + server/dist + web/dist + nginx 配置与入口脚本
```

- 基础镜像 `node:22-alpine`、pnpm 锁 `11.6.0`，与开发环境（node 22 + pnpm 11）对齐——pnpm 11 的 lockfile 须同代 pnpm 消费。
- pnpm workspace 的 `server/node_modules` 以符号链接指向根 `node_modules/.pnpm`，运行时镜像按 workspace 布局整体拷贝（`COPY --from=prod-deps /app /app`），工作目录 `/app/server`。
- 前端签名密钥经构建参数注入：`VITE_SIGN_SECRET` 未传时回退到与 `web/.env.production` 相同的占位值（Vite 规则：进程环境变量优先于 `.env` 文件）。

### 3.2 容器启动流程（entrypoint.sh）

1. 用 `pg` 探测数据库连通性，每 2 秒重试，超时上限 `DB_WAIT_TIMEOUT`（默认 120s）；
2. 执行 `typeorm migration:run -d dist/data-source.js`（生产态迁移，延续 [ADR-005](../决策/ADR-005-数据库迁移策略.md)「迁移是唯一建表通道」）；
3. 拉起 nginx（daemon 模式）承载静态资源与 API 反代；
4. `exec node dist/main.js` 作为 PID 1——`docker stop` 的 SIGTERM 直达应用进程，触发 `enableShutdownHooks` 优雅关停。

迁移失败（数据库不可达 / 迁移冲突）时容器启动即退出，由 `restart: unless-stopped` 自动重试，故障显性化。

### 3.3 健康检查

后端 `/api/health` 为 `@Public` 健康检查接口（`app.controller.ts`），compose 以 `wget http://127.0.0.1/api/health` 探活（经镜像内 nginx 转发到应用）。

## 4. 服务器初始化（一次性）

以下命令均在 Ubuntu 服务器上以 root / sudo 执行：

```bash
# 1. 安装 Docker（已装可跳过；官方源自带 docker compose 插件）
curl -fsSL https://get.docker.com | sh

# 2. 创建部署目录，放入编排与配置文件（文件内容取自仓库 deploy/ 目录）
mkdir -p /opt/n1
#   - deploy/docker-compose.yml      → /opt/n1/docker-compose.yml
#   - deploy/server.env.example      → /opt/n1/server.env（务必修改占位值）
vim /opt/n1/server.env

# 3. 全局 nginx 站点配置（按实际域名 / 证书补全后软链或拷入 conf.d）
#   deploy/nginx-gateway.conf.example → /etc/nginx/conf.d/n1.conf
nginx -t && nginx -s reload

# 4. 首次拉起（镜像由流水线分发后自动完成；也可先手动拉起验证链路）
docker compose -f /opt/n1/docker-compose.yml up -d
```

`server.env` 必改项见 [§7 配置参考](#7-配置参考参考-serverenv)；占位密钥未改时应用会启动失败（fail-fast 校验），属预期防护。

## 5. 云效流水线配置

流水线结构：**源码触发 → 构建（docker build + save）→ 主机部署（分发 tar + 执行部署脚本）**。

### 5.1 创建流水线

1. 云效 Flow 新建空流水线，源选择代码仓库（Codeup / GitHub / Gitee 等），触发器开启**代码提交自动触发**（push 到 `main` 分支）。
2. 添加**变量**（流水线设置 → 变量和缓存）：`VITE_SIGN_SECRET`（服务变量，加密存储）——值为前端签名密钥，**必须与 `server.env` 中 `SIGNATURE_SECRET` 完全一致**，不一致表现为登录后所有写请求被签名校验拒绝。

### 5.2 构建阶段

添加「执行命令」步骤（运行环境需具备 docker CLI 与 daemon，云效公共构建集群默认可用；若不可用请更换为含 docker 的自定义构建镜像），命令：

```bash
set -e

# 构建镜像：latest 供 compose 引用，编号 tag 供服务器侧回滚定位
docker build -t n1:latest -t "n1:${BUILD_NUMBER:-local}" \
  --build-arg VITE_SIGN_SECRET="$VITE_SIGN_SECRET" .

# 导出压缩 tar 作为构建产物（同时保留两个 tag）
docker save n1:latest "n1:${BUILD_NUMBER:-local}" | gzip > n1-image.tar.gz
```

构建产物勾选上报：`n1-image.tar.gz` 与 `deploy/` 目录（后者供首次初始化与部署脚本使用）。

### 5.3 主机部署阶段

1. 主机组中添加 Ubuntu 服务器（阿里云 ECS 可自动安装 Agent，其他机器按云效指引手动安装 Agent 或配置 SSH 授权）。
2. 制品选择上一阶段的构建产物，部署脚本执行：

```bash
sh deploy/deploy.sh
```

部署脚本逻辑：校验 `/opt/n1/server.env` 与 `docker-compose.yml` 就位 → `docker load -i n1-image.tar.gz` → `docker compose up -d` → 清理悬空层（保留带 tag 的历史镜像供回滚）→ 输出容器状态。

## 6. 日常发布与回滚

- **发布**：push 到 `main` 即全链路自动执行；进度与日志在云效流水线页查看。
- **验证**：部署后访问全局 nginx 域名的 `/api/health` 应返回健康信息；服务器上 `docker ps` 应见 `n1` 容器 `(healthy)`。
- **回滚（快速）**：服务器上历史镜像以流水线编号为 tag 保留，执行：
  ```bash
  docker tag n1:<历史编号> n1:latest
  docker compose -f /opt/n1/docker-compose.yml up -d
  ```
- **回滚（重建）**：在云效流水线中重跑历史某次成功运行（或 revert 提交后重新触发），适合历史镜像已被清理的场景。

## 7. 配置参考（server.env）

| 变量 | 必改 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | — | 固定 `production` |
| `PORT` | — | 容器内 NestJS 端口，固定 `3000`（镜像内 nginx 按此转发） |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | ✅ | 外置 PostgreSQL 连接信息；同机部署 `DB_HOST=host.docker.internal`，独立数据库填内网 IP |
| `DB_SYNC` | — | 保持 `false`：生产强制关闭，建表与升级由启动迁移执行（ADR-005） |
| `JWT_SECRET` | ✅ | 长随机串；沿用开发默认值会启动失败（fail-fast） |
| `USER_INIT_PASSWORD` | ✅ | 种子账号 admin 的初始口令 |
| `SIGNATURE_ENABLED` / `SIGNATURE_SECRET` | ✅ | 签名开关与密钥；开启时密钥须与前端构建注入的 `VITE_SIGN_SECRET` 一致 |
| `SIGNATURE_EXPIRE_MS` | — | 签名时间窗，默认 300000（5 分钟） |
| `SWAGGER_ENABLED` | — | 生产建议 `false`（关闭 `/api-docs`） |

修改 `server.env` 后需重启容器生效：`docker compose -f /opt/n1/docker-compose.yml up -d`（重建容器读取新配置）。

## 8. 常见问题

| 现象 | 排查 |
| --- | --- |
| 容器反复重启，日志含数据库等待超时 | `server.env` 的 `DB_*` 配置有误或数据库未放行容器访问；同机数据库确认 PostgreSQL 监听地址包含 docker 网桥（`listen_addresses` 与 `pg_hba.conf`） |
| 登录成功但所有写请求失败 | 前端 `VITE_SIGN_SECRET`（构建期注入）与后端 `SIGNATURE_SECRET`（运行期注入）不一致，两边对齐后重新构建 / 重启 |
| 页面白屏 / 静态资源 404 | 全局 nginx 与镜像内 nginx 均约定部署在域名根路径（`/`），子路径部署需调整 Vite `base` 与两份 nginx 配置 |
| 上传文件 413 | 两级 nginx 均已设 `client_max_body_size 20m`，超限自行上调（`deploy/nginx-gateway.conf.example` 与 `docker/nginx.conf` 同步改） |
| 发版后页面未更新 | 浏览器缓存了旧 `index.html`；镜像内 nginx 已对该文件设 `no-cache`，强制刷新一次即可 |
