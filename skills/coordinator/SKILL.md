# Coordinator Mode Skill

**Skill Name:** coordinator
**Version:** 1.1.0
**Trigger:** Manual activation

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

## 重新安装 / 更新

```bash
bash ~/.openclaw/workspace/skills/coordinator/install.sh
```
