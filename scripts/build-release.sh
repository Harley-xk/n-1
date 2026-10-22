#!/bin/sh
# n-1 发布包构建脚本（CI 与本地通用，不依赖 docker）：构建前后端 → 提取生产依赖 → 打版本化 tar.gz
# 用法：仓库根执行 sh scripts/build-release.sh；产物输出 release/n1-release-<时间戳>.tar.gz
# 设计见 docs/指南/发布包打包与部署指南.md
set -e
cd "$(dirname "$0")/.."

# CI 环境无 pnpm 时自动安装（版本与开发环境对齐，pnpm 11 的 lockfile 须同代 pnpm 消费）
command -v pnpm >/dev/null 2>&1 || npm install -g pnpm@11.6.0

echo "== 1/5 安装依赖 =="
pnpm install --frozen-lockfile

echo "== 2/5 构建前端（环境变量 VITE_SIGN_SECRET 存在时自动覆盖 .env.production 占位值）=="
pnpm --filter web run build

echo "== 3/5 构建后端 =="
pnpm --filter server run build

echo "== 4/5 提取 server 生产依赖（pnpm deploy 自包含产物，不影响本地依赖）=="
STAGE=release/staging
rm -rf release "$STAGE" && mkdir -p "$STAGE"
pnpm --filter server deploy --prod --legacy "$STAGE/server"

# 清理开发态文件：pnpm deploy 会拷贝包目录全部内容，本地 .env（含口令）绝不能进发布包
rm -f "$STAGE/server/.env" "$STAGE/server/.env.example"
rm -rf "$STAGE/server/src" "$STAGE/server/test"
rm -f "$STAGE/server"/{eslint.config.mjs,nest-cli.json,tsconfig*.json,tsconfig.build.tsbuildinfo}

# deploy --prod 会把 workspace 依赖状态标记为 production 态，出包后本地 pnpm run 系列命令
# （含 pnpm check）会因依赖状态校验失败；幂等恢复一次（CI=true 跳过 modules 清理确认交互）
CI=true pnpm install --frozen-lockfile

echo "== 5/5 打包 =="
cp -a web/dist "$STAGE/web-dist"
VERSION=$(date +%Y%m%d%H%M%S)
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
printf 'version=%s\ncommit=%s\ntime=%s\n' "$VERSION" "$COMMIT" "$(date '+%F %T')" > "$STAGE/release-info"
tar -czf "release/n1-release-$VERSION.tar.gz" -C "$STAGE" server web-dist release-info
# 部署脚本随产物上传（产物自包含，部署阶段执行 sh release.sh 即可）
cp deploy/release.sh release/
echo "== 完成: release/n1-release-$VERSION.tar.gz =="
