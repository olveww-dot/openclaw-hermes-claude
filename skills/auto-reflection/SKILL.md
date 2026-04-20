# Auto Reflection

> 🛡️ **OpenClaw 混合进化方案** — 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

**Name:** hermes-auto-reflection
**Category:** infrastructure
**Version:** 2.0.0

## 这个 Skill 做什么？

帮小呆呆自动反思：记录错误教训、提炼决策经验、优化工作方式。

## 🚀 一键安装

```bash
mkdir -p ~/.openclaw/skills && cd ~/.openclaw/skills && curl -fsSL https://github.com/olveww-dot/openclaw-hermes-claude/archive/main.tar.gz | tar xz && cp -r openclaw-hermes-claude-main/skills/auto-reflection . && rm -rf openclaw-hermes-claude-main && echo "✅ hermes-auto-reflection 安装成功"
```

## 概述

整合三个能力：

- **C3 Task Notification**：子代理完成时主动通知主会话
- **C6 并发执行优化**：并行派发多个 subagent 的经验记录
- **H3 内置自动反思**：错误自动记录，决策经验提炼

## 触发方式

### 方式一：手动触发（最简单）
```
EC 说：「反思一下」
小呆呆 执行：bash ~/.openclaw/skills/auto-reflection/scripts/log-reflection.sh tool --success true --tool <工具名> --context <做什么> --decision <为什么这么做>
```

### 方式二：错误发生后自动记录
当小呆呆犯错或 EC 纠正时，自动记录反思：
```
bash ~/.openclaw/skills/auto-reflection/scripts/log-reflection.sh tool --success false --tool <工具名> --context <错误描述> --decision <应该怎么做>
```

### 方式三：子代理完成后记录
```
bash ~/.openclaw/skills/auto-reflection/scripts/log-reflection.sh subagent --task <任务名> --outcome <结果> --lessons <教训>
```

## 存储位置

- 反思记录：`memory/reflections/YYYY-MM-DD.md`
- 提炼经验：`memory/reflections/lessons.md`

## 查看今日反思

```bash
bash ~/.openclaw/skills/auto-reflection/scripts/log-reflection.sh cat
```

## 查看经验教训

```bash
cat ~/.openclaw/workspace/memory/reflections/lessons.md
```

## 文件结构

```
auto-reflection/
├── SKILL.md                   ← This file
├── README.md                  ← 使用指南
├── install.sh                 ← 一键安装脚本
└── scripts/
    └── log-reflection.sh      ← 反思记录脚本
```

## 🧩 配套技能

本 skill 是 **OpenClaw 混合进化方案** 的一部分：

🔗 GitHub 项目：[olveww-dot/openclaw-hermes-claude](https://github.com/olveww-dot/openclaw-hermes-claude)

完整技能套件（6个）：
- 🛡️ **crash-snapshots** — 崩溃防护
- 🧠 **auto-distill** — T1 自动记忆蒸馏
- 🎯 **hermes-coordinator** — 指挥官模式
- 💡 **context-compress** — 思维链连续性
- 🔍 **hermes-lsp-client** — LSP 代码智能
- 🔄 **hermes-auto-reflection** — 自动反思（本文）
