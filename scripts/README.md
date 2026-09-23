# 工程化脚本

本目录存放工程辅助脚本（代码生成、构建辅助、环境检查、CI 支撑等）。

## 约定

1. 跨平台脚本统一使用 Node.js 编写，文件后缀 `.mjs`（ESM）
2. 脚本需携带文件头部注释（见 `rules/base.md`）
3. 通用脚本通过根目录 `package.json` 的 `scripts` 挂载为 npm 命令，避免直接 `node scripts/xxx.mjs` 使用

## 当前状态

- `wait-for-server.mjs`：轮询后端端口直至就绪后退出，供 VS Code 组合调试的 preLaunchTask（任务 `wait:server`）使用，属调试工作流内部部件，不挂载为 npm 命令
- `verify-commit-msg.mjs`：校验提交信息格式「【动作】模块 - 内容概述」（见 `rules/base.md`），由 lefthook 的 commit-msg 钩子调用（见 `lefthook.yml`），属提交门禁内部部件，不挂载为 npm 命令

其余日常命令（开发、构建、测试）均已在根目录 `package.json` 中提供，见根 [README.md](../README.md)。
