# n-1 前后端单镜像打包：设计见 docs/指南/Docker打包与部署指南.md

# ---------- 构建阶段：安装依赖并编译前后端 ----------
FROM node:22-alpine AS build
WORKDIR /app

# pnpm 与开发环境对齐（pnpm 11 的 lockfile 须同代 pnpm 消费）
RUN npm install -g pnpm@11.6.0

# 先拷包清单再安装，命中层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
COPY e2e/package.json e2e/package.json

RUN pnpm install --frozen-lockfile --filter server --filter web

# 拷贝源码并构建
COPY . .

# 前端构建：VITE_SIGN_SECRET 经构建参数注入（Vite 规则：进程环境变量优先于 .env 文件）
ARG VITE_SIGN_SECRET=
RUN VITE_SIGN_SECRET="${VITE_SIGN_SECRET:-prod-sign-secret-change-me}" pnpm --filter web run build

# 后端构建（nest build → dist）
RUN pnpm --filter server run build

# ---------- 生产依赖阶段：仅安装 server 生产依赖 ----------
FROM node:22-alpine AS prod-deps
WORKDIR /app

RUN npm install -g pnpm@11.6.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
COPY e2e/package.json e2e/package.json

RUN pnpm install --frozen-lockfile --prod --filter server

# ---------- 运行时镜像：node + nginx 单镜像 ----------
FROM node:22-alpine

# apk 换阿里云镜像源（dl-cdn 在国内网络环境可达性差）
RUN sed -i 's#https://dl-cdn.alpinelinux.org/alpine#https://mirrors.aliyun.com/alpine#g' /etc/apk/repositories \
  && apk add --no-cache nginx

# pnpm workspace 依赖布局：server/node_modules 符号链接指向根 node_modules/.pnpm，须整体拷贝
COPY --from=prod-deps /app /app
COPY --from=build /app/server/dist /app/server/dist
COPY --from=build /app/web/dist /usr/share/nginx/html

# 覆盖 alpine nginx 默认站点（http.d/default.conf 原为 404 兜底）
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app/server
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
