# Coordinator Mode Skill

> 🛡️ **OpenClaw 混合进化方案** — 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw



**Skill Name:** coordinator
**Version:** 1.1.0
**Trigger:** Manual activation

## 🚀 一键安装

```bash
mkdir -p ~/.openclaw/skills && cd ~/.openclaw/skills && curl -fsSL https://github.com/olveww-dot/openclaw-hermes-claude/archive/main.tar.gz | tar xz && cp -r openclaw-hermes-claude-main/skills/hermes-coordinator . && rm -rf openclaw-hermes-claude-main && echo "✅ coordinator 安装成功"
```

## Overview

Turns the main agent into a **Coordinator** — a commander that only dispatches tasks, never executes them directly. All execution is delegated to Worker subagents. Results flow back via `<task-notification>` messages.

## 一键安装

```bash
cd ~/.openclaw/workspace/skills/coordinator
bash install.sh
```

安装后激活 Coordinator 模式：

```bash
# 方式1: 运行激活脚本（查看并复制 prompt 到 session）
bash ~/.openclaw/workspace/skills/coordinator/scripts/activate-coordinator.sh

# 方式2: 直接对 EC 说
进入协调模式
```

## How It Works

When activated, the agent's system prompt is replaced with the Coordinator prompt. The agent gains a clean role:

1. **Analyze** the user's goal
2. **Break down** into independent tasks
3. **Fan out** — spawn Workers in parallel
4. **Wait** for `<task-notification>` results
5. **Synthesize** and report to user

## Tool Set (Coordinator)

Only these tools are available in Coordinator mode:

| Tool | Purpose |
|------|---------|
| `spawn` / `sessions_spawn` | Launch a Worker subagent |
| `message` (send) | Continue an existing Worker |
| `sessions_yield` | End turn and wait for results |

**Coordinator never calls tools directly to do work. Only to dispatch.**

## Key Principles

- **Never thank workers** in results
- **Never predict worker results** — wait for actual `<task-notification>`
- **Be verbose in prompts** — workers can't see the coordinator's conversation
- **Fan out aggressively** — parallel workers are free
- **Synthesize before delegating** — understand results before sending follow-ups

## Files

```
coordinator/
├── SKILL.md                   ← This file
├── README.md                  ← User-facing guide
├── install.sh                 ← 一键安装脚本
├── scripts/
│   └── activate-coordinator.sh ← 激活脚本
└── src/
    ├── coordinator-prompt.ts  ← Coordinator system prompt
    └── worker-prompt.ts       ← Worker agent prompt template
```

## 🧩 配套技能

本 skill 是 **OpenClaw 混合进化方案** 的一部分：

> 将 [Hermesagent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

> 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

🔗 GitHub 项目：[olveww-dot/openclaw-hermes-claude](https://github.com/olveww-dot/openclaw-hermes-claude)

完整技能套件（6个）：
- 🛡️ **crash-snapshots** — 崩溃防护
- 🧠 **auto-distill** — T1 自动记忆蒸馏
- 🎯 **coordinator** — 指挥官模式（本文）
- 💡 **context-compress** — 思维链连续性
- 🔍 **lsp-client** — LSP 代码智能
- 🔄 **auto-reflection** — 自动反思

## 重新安装 / 更新

```bash
bash ~/.openclaw/workspace/skills/coordinator/install.sh
```
