/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: Git 提交信息格式校验：统一格式「【动作】模块 - 内容概述」，
 *       由 lefthook 的 commit-msg 钩子调用（见 lefthook.yml 与 rules/base.md）
 */

import { readFileSync } from 'node:fs'

// lefthook 传入 commit-msg 文件路径（内容第一行为提交标题）
const msgFile = process.argv[2]
if (!msgFile) {
  process.stderr.write('用法: node scripts/verify-commit-msg.mjs <commit-msg 文件路径>\n')
  process.exit(1)
}

const title = readFileSync(msgFile, 'utf8').split('\n')[0].trim()

// 自动生成的提交（合并 / 还原 / 压缩）不做格式校验
if (/^(Merge |Revert |fixup!|squash!)/.test(title)) {
  process.exit(0)
}

// 格式：【动作】模块 - 内容概述（动作以两字为主，校验容忍 2~4 字）
const pattern = /^【[^】]{2,4}】.+ - .+/
if (!pattern.test(title)) {
  process.stderr.write('提交信息格式不符合规范，应为：【动作】模块 - 内容概述\n')
  process.stderr.write('示例：【新增】用户模块 - 登录接口与 JWT 鉴权（动作如：新增 / 修改 / 修复 / 移除 / 重构 / 优化）\n')
  process.stderr.write(`当前提交信息：${title}\n`)
  process.exit(1)
}
