# auto-distill

> 🛡️ **OpenClaw 混合进化方案** — 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw



**T1: Auto Memory** — 会话结束后自动 distill 对话内容到 MEMORY.md

## 🚀 一键安装

```bash
mkdir -p ~/.openclaw/skills && cd ~/.openclaw/skills && curl -fsSL https://github.com/olveww-dot/openclaw-hermes-claude/archive/main.tar.gz | tar xz && cp -r openclaw-hermes-claude-main/skills/auto-distill . && rm -rf openclaw-hermes-claude-main && echo "✅ auto-distill 安装成功"
```

## 触发方式

### 方式一：手动调用
```bash
openclaw run auto-distill
# 或
npx ts-node ~/.openclaw/workspace/skills/auto-distill/src/distill.ts
```

### 方式二：Hook 触发（推荐）
在 `~/.openclaw/config.json` 中添加 session-end hook：

```json
{
  "hooks": {
    "session:end": "openclaw run auto-distill"
  }
}
```

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

> 将 [Hermesagent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

> 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

🔗 GitHub 项目：[olveww-dot/openclaw-hermes-claude](https://github.com/olveww-dot/openclaw-hermes-claude)

完整技能套件（6个）：
- 🛡️ **crash-snapshots** — 崩溃防护
- 🧠 **auto-distill** — T1 自动记忆蒸馏（本文）
- 🎯 **coordinator** — 指挥官模式
- 💡 **context-compress** — 思维链连续性
- 🔍 **lsp-client** — LSP 代码智能
- 🔄 **auto-reflection** — 自动反思

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SILICONFLOW_API_KEY` | SiliconFlow API Key | 从 TOOLS.md 读取 |
| `OPENCLAW_SESSION_JSON` | 当前会话 JSON 文件路径 | `~/.openclaw/sessions/current/session.json` |
| `MEMORY_PATH` | MEMORY.md 路径 | `~/.openclaw/workspace/MEMORY.md` |
