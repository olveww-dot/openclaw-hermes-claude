---
name: auto-distill
description: "T1: 会话结束后将对话内容提炼到 MEMORY.md。每次会话结束对 EC 说「提炼记忆」即可触发。"
author: "小呆呆"
version: "2.0.0"
---

# Auto Memory Distill

> 🛡️ **OpenClaw 混合进化方案** — 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

**T1: Auto Memory** — 会话结束后提炼对话内容到 MEMORY.md

## 这个 Skill 做什么？

将当前会话的对话内容自动提炼，追加到 `MEMORY.md`，不覆盖已有内容。

## 🚀 一键安装

```bash
mkdir -p ~/.openclaw/skills && cd ~/.openclaw/skills && curl -fsSL https://github.com/olveww-dot/openclaw-hermes-claude/archive/main.tar.gz | tar xz && cp -r openclaw-hermes-claude-main/skills/auto-distill . && rm -rf openclaw-hermes-claude-main && echo "✅ auto-distill 安装成功"
```

## 触发方式

### 方式一：手动触发（最简单）
```
EC 说：「提炼记忆」
小呆呆 执行：bash ~/.openclaw/skills/auto-distill/scripts/distill-session.sh
```

### 方式二：定时自动（可选）
设置 cron 任务，每天自动提炼：
```bash
openclaw cron add --name "auto-distill" \
  --schedule "0 23 * * *" \
  --command "bash ~/.openclaw/skills/auto-distill/scripts/distill-session.sh"
```

### 方式三：会话结束时自动触发
如果 OpenClaw 支持 session compact 钩子，会话压缩前会自动提炼。

## 工作流程

1. 从当前会话 JSON 文件读取消息历史
2. 提取用户和助手的核心对话内容
3. 调用 SiliconFlow DeepSeek-V3 API 提炼关键信息
4. 以 `[YYYY-MM-DD]` 标记格式追加到 `MEMORY.md`
5. 不覆盖已有内容，只追加

## 输出格式

追加到 MEMORY.md 的内容格式：

```markdown
---

## [2026-04-19]

### 对话摘要
- 要点1
- 要点2

### 关键决策
- 决策1

### 待办/后续
- 待办1
```

## 依赖

- Node.js ≥ 18
- SiliconFlow API Key（通过 `SILICONFLOW_API_KEY` 环境变量）
- 当前会话 JSON 文件路径（通过 `OPENCLAW_SESSION_JSON` 环境变量传入）

## 🧩 配套技能

本 skill 是 **OpenClaw 混合进化方案** 的一部分：

🔗 GitHub 项目：[olveww-dot/openclaw-hermes-claude](https://github.com/olveww-dot/openclaw-hermes-claude)

完整技能套件（6个）：
- 🛡️ **crash-snapshots** — 崩溃防护
- 🧠 **auto-distill** — T1 自动记忆蒸馏（本文）
- 🎯 **hermes-coordinator** — 指挥官模式
- 💡 **context-compress** — 思维链连续性
- 🔍 **hermes-lsp-client** — LSP 代码智能
- 🔄 **hermes-auto-reflection** — 自动反思

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SILICONFLOW_API_KEY` | SiliconFlow API Key | 从 TOOLS.md 读取 |
| `OPENCLAW_SESSION_JSON` | 当前会话 JSON 文件路径 | `~/.openclaw/sessions/current/session.json` |
| `MEMORY_PATH` | MEMORY.md 路径 | `~/.openclaw/workspace/MEMORY.md` |
