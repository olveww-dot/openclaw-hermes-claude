# Auto-Reflection Skill

> 🛡️ **OpenClaw 混合进化方案** — 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw



**Name:** auto-reflection
**Category:** infrastructure
**Version:** 1.1.0

---

## 🚀 一键安装

```bash
mkdir -p ~/.openclaw/skills && cd ~/.openclaw/skills && curl -fsSL https://github.com/olveww-dot/openclaw-hermes-claude/archive/main.tar.gz | tar xz && cp -r openclaw-hermes-claude-main/skills/hermes-auto-reflection . && rm -rf openclaw-hermes-claude-main && echo "✅ auto-reflection 安装成功"
```

## 概述

自动反思系统，整合三个能力：

- **C3 Task Notification**：子代理完成时主动通知主会话
- **C6 并发执行优化**：并行派发多个 subagent 的经验记录
- **H3 内置自动反思**：错误自动记录，决策经验提炼

每次工具执行后、每个 subagent 完成后、每次错误发生时，自动记录反思条目到 `memory/reflections/YYYY-MM-DD.md`。

## 一键安装

```bash
cd ~/.openclaw/workspace/skills/auto-reflection
bash install.sh
```

安装脚本会：
1. 创建 `memory/reflections/` 目录
2. 生成 `.hook-config.yaml`（OpenClaw hook 配置片段）
3. 设置 `scripts/log-reflection.sh` 执行权限

## 激活 Hook 配置

安装后，将以下内容添加到 `~/.openclaw/config.yaml` 的 `hooks:` 下：

```yaml
hooks:
  after_tool: "bash ~/.openclaw/workspace/skills/auto-reflection/scripts/log-reflection.sh tool"
  after_subagent: "bash ~/.openclaw/workspace/skills/auto-reflection/scripts/log-reflection.sh subagent"
```

## 手动使用

```bash
# 记录工具执行
bash scripts/log-reflection.sh tool --success false --tool exec --context "执行危险命令" --decision "未警告用户" --error "Permission denied"

# 记录子代理完成
bash scripts/log-reflection.sh subagent --task "调研 X" --outcome "完成" --lessons "需要先查文档"

# 查看今日反思
bash scripts/log-reflection.sh cat
```

## 存储位置

- 反思记录：`memory/reflections/YYYY-MM-DD.md`
- 提炼经验：`memory/reflections/lessons.md`

## 文件结构

```
auto-reflection/
├── SKILL.md                   ← This file
├── README.md                  ← 使用指南
├── install.sh                 ← 一键安装脚本
├── .hook-config.yaml          ← Hook 配置片段（安装后查看）
├── scripts/
│   └── log-reflection.sh      ← 快捷记录脚本
└── src/
    ├── reflection-logger.ts    ← 记录反思条目
    └── lesson-generator.ts     ← 从错误提炼经验
```

## 🧩 配套技能

本 skill 是 **OpenClaw 混合进化方案** 的一部分：

> 将 [Hermesagent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

> 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

🔗 GitHub 项目：[olveww-dot/openclaw-hermes-claude](https://github.com/olveww-dot/openclaw-hermes-claude)

完整技能套件（6个）：
- 🛡️ **crash-snapshots** — 崩溃防护
- 🧠 **auto-distill** — T1 自动记忆蒸馏
- 🎯 **coordinator** — 指挥官模式
- 💡 **context-compress** — 思维链连续性
- 🔍 **lsp-client** — LSP 代码智能
- 🔄 **auto-reflection** — 自动反思（本文）
