# Context Compress Skill

> 🛡️ **OpenClaw 混合进化方案** — 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw



防止长对话中思维链断裂的增量摘要工具。

## 触发方式

- **手动触发**: 对我说 "压缩上下文" 或 "compact"
- **自动触发**: 当上下文超过模型 context window 的 50% 时自动压缩

## 五步算法

1. **Prune** — 裁剪旧工具输出（无 LLM 调用，廉价预检）
2. **Head** — 保护开头的系统提示和前几轮对话
3. **Tail** — 按 token 预算保护最近几轮（~20K tokens）
4. **LLM Summarize** — 中间部分调用 DeepSeek-V3 压缩
5. **Iterative** — 后续压缩迭代更新摘要

## 摘要格式

保留以下结构化字段：
- **Active Task** — 当前任务（最重要）
- **Goal** — 总体目标
- **Completed Actions** — 已完成操作（含工具、目标、结果）
- **Active State** — 当前工作状态
- **Blocked** — 阻塞问题
- **Key Decisions** — 关键决策
- **Pending User Asks** — 未完成请求
- **Remaining Work** — 剩余工作

## 使用 SiliconFlow API

- 模型: `deepseek-ai/DeepSeek-V3`
- API Base: `https://api.siliconflow.cn/v1`
- 通过中转商调用，API Key 存储在环境变量

## 🧩 配套技能

本 skill 是 **OpenClaw 混合进化方案** 的一部分：

> 将 [Hermesagent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

> 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

🔗 GitHub 项目：[olveww-dot/openclaw-hermes-claude](https://github.com/olveww-dot/openclaw-hermes-claude)

完整技能套件（6个）：
- 🛡️ **crash-snapshots** — 崩溃防护
- 🧠 **auto-distill** — T1 自动记忆蒸馏
- 🎯 **coordinator** — 指挥官模式
- 💡 **context-compress** — 思维链连续性（本文）
- 🔍 **lsp-client** — LSP 代码智能
- 🔄 **auto-reflection** — 自动反思

## 输出文件

- `src/compressor.ts` — 核心压缩逻辑（TypeScript）
