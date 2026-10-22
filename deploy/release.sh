#!/bin/sh
# 云效「主机部署」执行脚本（发布包直部署）：解包 → 覆盖 → 迁移 → 重启 → 健康探测
# 运行目录为云效下载构建产物后的目录（含 n1-release-*.tar.gz）
# 服务器一次性初始化（node 22 / /opt/n1 / server.env / n1.service / nginx 站点）见 docs/指南/打包与部署指南.md
set -e

APP_DIR=/opt/n1

TAR=$(ls n1-release-*.tar.gz 2>/dev/null | head -1)
[ -n "$TAR" ] || { echo "未找到发布包 n1-release-*.tar.gz"; exit 1; }
[ -f "$APP_DIR/server.env" ] || { echo "缺少 $APP_DIR/server.env，请参照 server.env.example 初始化"; exit 1; }
[ -f /etc/systemd/system/n1.service ] || { echo "缺少 /etc/systemd/system/n1.service（首次初始化见部署指南 §4）"; exit 1; }

# 解包到同盘暂存目录（失败即退出，线上服务不受影响）
STAGE=$APP_DIR/.staging
rm -rf "$STAGE" && mkdir -p "$STAGE"
echo "== 解包 $TAR =="
tar -xzf "$TAR" -C "$STAGE"
cat "$STAGE/release-info"

echo "== 覆盖发布 =="
rsync -a --delete "$STAGE/web-dist/" "$APP_DIR/web-dist/"
rsync -a --delete "$STAGE/server/" "$APP_DIR/server/"
rm -rf "$STAGE"

echo "== 执行数据库迁移（ADR-005：迁移是唯一建表通道）=="
cd "$APP_DIR/server"
set -a && . "$APP_DIR/server.env" && set +a
./node_modules/.bin/typeorm migration:run -d dist/data-source.js

echo "== 重启服务 =="
systemctl restart n1

echo "== 健康探测 =="
for i in $(seq 1 10); do
  if curl -sf http://127.0.0.1:3000/api/health >/dev/null; then
    echo "健康检查通过（/api/health）"
    systemctl --no-pager status n1 | head -5
    exit 0
  fi
  sleep 2
done
echo "警告：健康探测未通过，查看日志：journalctl -u n1 -e" >&2
exit 1
