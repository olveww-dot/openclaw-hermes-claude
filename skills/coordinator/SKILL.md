# Coordinator Mode Skill

**Skill Name:** coordinator
**Version:** 1.0.0
**Trigger:** Manual activation — say "进入协调模式" or "启用 coordinator"

## Overview

Turns the main agent into a **Coordinator** — a commander that only dispatches tasks, never executes them directly. All execution is delegated to Worker subagents. Results flow back via `<task-notification>` messages.

This is inspired by Claude Code's C5 Coordinator mode (`COORDINATOR_MODE`).

## How It Works

When activated, the agent's system prompt is replaced with the Coordinator prompt. The agent gains a clean role:

1. **Analyze** the user's goal
2. **Break down** into independent tasks
3. **Fan out** — spawn Workers in parallel
4. **Wait** for `<task-notification>` results
5. **Synthesize** and report to user

**Workers** are spawned via the `spawn` tool with `subagent_type: "worker"`. They receive a limited toolset and a focused task prompt.

## Activation

To activate: load this skill's system prompt override into the session context.

## Tool Set (Coordinator)

Only these tools are available in Coordinator mode:

| Tool | Purpose |
|------|---------|
| `spawn` / `sessions_spawn` | Launch a Worker subagent |
| `message` (send) | Continue an existing Worker |
| `task_notification` | (receive only) Worker results |
| `sessions_yield` | End turn and wait for results |

**Coordinator never calls tools directly to do work. Only to dispatch.**

## Tool Set (Worker)

Workers get a constrained tool context:

- `exec` — run shell commands
- `read` — read files
- `write` / `edit` — write/edit files
- `web_fetch` / `browser` — web access
- Subagent-specific tools as needed

## Prompt Files

- `src/coordinator-prompt.ts` — Coordinator system prompt (drop-in override)
- `src/worker-prompt.ts` — Worker agent prompt template

## Usage

### Activating Coordinator Mode

```
User: 进入协调模式
→ Agent loads coordinator-prompt.ts as system override
→ Now operates as Coordinator
```

### Dispatching a Task

```
User: 帮我研究一下这个代码库，然后写测试

Coordinator:
1. 分析任务：研究(code inspection) + 写测试(implementation)
2. Spawn workers:
   - Worker-A: 研究代码库，报告结构
   - Worker-B: (等待研究结果后) 写测试
3. 汇总结果给用户
```

### Worker Result Flow

Workers complete → `<task-notification>` arrives as a message → Coordinator synthesizes and continues or reports.

## Key Principles

- **Never thank workers** in results
- **Never predict worker results** — wait for actual `<task-notification>`
- **Be verbose in prompts** — workers can't see the coordinator's conversation
- **Fan out aggressively** — parallel workers are free
- **Synthesize before delegating** — understand results before sending follow-ups

## Files

```
coordinator/
├── SKILL.md              ← This file
├── README.md             ← User-facing install guide
└── src/
    ├── coordinator-prompt.ts  ← Coordinator system prompt
    └── worker-prompt.ts       ← Worker agent prompt
```
