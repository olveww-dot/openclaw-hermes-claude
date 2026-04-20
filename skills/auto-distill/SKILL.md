---
name: auto-distill
description: "T1: 将对话内容提炼到 MEMORY.md。对小呆呆说「提炼记忆」即可触发。"
author: "小呆呆"
version: 2.0.1
---

# Auto Memory Distill

> 🛡️ **OpenClaw 混合进化方案** — 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

**T1: Auto Memory** — 将对话内容提炼到 MEMORY.md

## 这个 Skill 做什么？

将对话内容提炼，追加到 `MEMORY.md`，不覆盖已有内容。

## 🚀 一键安装

```bash
mkdir -p ~/.openclaw/skills && cd ~/.openclaw/skills && curl -fsSL https://github.com/olveww-dot/openclaw-hermes-claude/archive/main.tar.gz | tar xz && cp -r openclaw-hermes-claude-main/skills/auto-distill . && rm -rf openclaw-hermes-claude-main && echo "✅ auto-distill 安装成功"
```

## 触发方式

### 方式一：直接输入文本（推荐）
```
EC 说：「提炼记忆」并提供对话内容
小呆呆 读取剪贴板内容，调用 distill
```

### 方式二：手动运行脚本
```bash
# 方式A：从剪贴板读取
pbpaste | bash ~/.openclaw/skills/auto-distill/scripts/distill-session.sh

# 方式B：指定文件
cat 对话记录.txt | bash ~/.openclaw/skills/auto-distill/scripts/distill-session.sh
```

### 方式三：定时自动（每天提炼）
```bash
openclaw cron add --name "auto-distill-daily" \
  --schedule "0 23 * * *" \
  --command "bash ~/.openclaw/skills/auto-distill/scripts/distill-session.sh"
```

## 工作流程

1. 读取输入文本（管道或剪贴板）
2. 调用 SiliconFlow DeepSeek-V3 API 提炼关键信息
3. 以 `[YYYY-MM-DD]` 标记格式追加到 `MEMORY.md`

## 输出格式

```markdown
## [2026-04-20]

### 对话摘要
- 要点1
- 要点2

### 关键决策
- 决策1

### 待办/后续
- 待办1
```

## 依赖

- Node.js ≥ 18 或 Python3
- SiliconFlow API Key（通过 `SILICONFLOW_API_KEY` 环境变量）

## 🧩 配套技能

完整技能套件（6个）：
- 🛡️ **crash-snapshots** — 崩溃防护
- 🧠 **auto-distill** — T1 自动记忆蒸馏（本文）
- 🎯 **hermes-coordinator** — 指挥官模式
- 💡 **context-compress** — 思维链连续性
- 🔍 **hermes-lsp-client** — LSP 代码智能
- 🔄 **hermes-auto-reflection** — 自动反思

🔗 GitHub 项目：[olveww-dot/openclaw-hermes-claude](https://github.com/olveww-dot/openclaw-hermes-claude)
