# OpenClaw Hybrid Evolution | OpenClaw 混合进化方案

> 让 OpenClaw 融合 Hermes-agent 和 Claude Code 的核心能力
> Bringing Hermes-agent & Claude Code capabilities to OpenClaw

[![Stars](https://img.shields.io/github/stars/olveww-dot/openclaw-hermes-claude)](https://github.com/olveww-dot/openclaw-hermes-claude)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![中文](https://img.shields.io/badge/README-中文-blue.svg)](README.md)
[![English](https://img.shields.io/badge/README-English-green.svg)](README_EN.md)

---

[English](#english-section) | [中文](#中文-section)

---

## 🎯 Project Goals | 项目目标

### English
This project ports the core capabilities of **Hermes-agent** (100K stars) and **Claude Code** to OpenClaw, making advanced AI agent features freely available to all OpenClaw users.

### 中文
将 **Hermes-agent**（10万星）和 **Claude Code** 的核心功能移植到 OpenClaw，让每个 OpenClaw 用户都能免费获得高级 AI Agent 能力。

Features included | 功能包括：
- 🛡️ Crash-Resistant Snapshots | 崩溃防护
- 🧠 Four-Layer Memory System (T1-T4) | 四层记忆系统
- 🔄 Auto-Reflection | 自动反思
- 🎯 Coordinator Mode | 指挥官模式
- 💡 Continuous Thought Chains | 思维链连续性
- 🔍 LSP Code Intelligence | LSP 代码智能

---

## 📂 Project Structure | 项目结构

```
docs/
├── 13-items-analysis.md      # 13项功能详细分析 | Detailed analysis
├── implementation-guide.md    # 实施方案 | Implementation guide
└── roadmap.md               # 路线图 | Roadmap

skills/
├── crash-snapshots/         # H1 崩溃防护 | Crash protection
├── auto-distill/            # H2/C1 自动记忆蒸馏 | Auto memory distill
├── coordinator/             # C5 指挥官模式 | Coordinator mode
├── context-compress/        # H5 思维链连续性 | Thought chain
├── lsp-client/             # H7 LSP代码智能 | LSP code intelligence
└── auto-reflection/         # C3/C6/H3 自动反思 | Auto reflection
```

---

## 🚀 Quick Start | 快速开始

### English
```bash
# Install skills | 安装技能
openclaw skills install crash-snapshots
openclaw skills install auto-distill
openclaw skills install coordinator

# Configure auto-check every 4 hours | 设置每4小时自动检查
openclaw cron add --name "self-evolution" \
  --schedule "0 */4 * * *" \
  --task "python3 skills/manager-self-evolution/self-check.py diagnose"
```

### 中文
```bash
# 安装技能
openclaw skills install crash-snapshots
openclaw skills install auto-distill
openclaw skills install coordinator
```

---

## 📋 Progress | 进度

| Feature | 功能 | Status | 状态 | Priority | 优先级 |
|---------|------|--------|------|----------|------|
| H1 Crash-Resistant Snapshots | 崩溃防护 | ✅ Done | 已完成 | ⭐⭐⭐⭐⭐ |
| H2/C1 Four-Layer Memory | 四层记忆 | ✅ Done | 已完成 | ⭐⭐⭐⭐⭐ |
| C5 Coordinator Mode | 指挥官模式 | ✅ Done | 已完成 | ⭐⭐⭐⭐ |
| H5 Thought Chain Continuity | 思维链连续性 | ✅ Done | 已完成 | ⭐⭐⭐⭐ |
| H7 LSP Code Intelligence | LSP代码智能 | ✅ Done | 已完成 | ⭐⭐⭐ |
| C3/C6/H3 Auto-Reflection | 自动反思 | ✅ Done | 已完成 | ⭐⭐⭐ |
| C2 Priority Queue | 优先级队列 | 📋 Planned | 规划中 | ⭐⭐⭐ |
| C4 Task Registry | 任务注册表 | 📋 Planned | 规划中 | ⭐⭐⭐ |
| H6 NVIDIA Vector Search | 向量检索 | 📋 Planned | 规划中 | ⭐⭐ |
| H4 Iteration Budget Refund | 迭代预算退回 | ❌ Paused | 搁置 | ⭐ |

**8/13 completed | 已完成 8/13** ✅

---

## 🛠️ Implemented Skills | 已实现的技能

### crash-snapshots (H1)
Auto-backup files before write/edit operations.
> 每次 write/edit 前自动备份原文件，防止误操作导致数据丢失。

### auto-distill (H2/C1)
Auto-distill conversation into MEMORY.md after each session.
> 会话结束后自动蒸馏对话内容到 MEMORY.md。

### coordinator (C5)
Main agent becomes Coordinator, delegates all execution to workers.
> 主 agent 变成指挥官，只调度不执行，所有工作交给子代理。

### context-compress (H5)
Incremental summarization to prevent thought chain breaks.
> 增量摘要，防止长对话中思维链断裂。

### lsp-client (H7)
LSP client for code intelligence (goto definition, find references, hover).
> LSP 客户端，支持定义跳转、引用查找、悬停提示。

### auto-reflection (C3/C6/H3)
Auto-log reflections, lessons learned, and subagent notifications.
> 自动记录反思、经验教训、子代理完成通知。

---

## 🏗️ Architecture | 技术架构

```
OpenClaw
├── Hermes-agent Kernel | Hermes-agent 内核
│   ├── MemoryProvider abstraction | 记忆抽象
│   ├── context_compressor | 上下文压缩
│   └── cron scheduler | 调度系统
│
└── Claude Code Engine | Claude Code 引擎
    ├── Coordinator mode | 指挥官模式
    ├── Layered memory | 分层记忆
    ├── Task Registry | 任务注册
    └── LSP code intelligence | LSP代码智能
```

---

## 📖 Resources | 学习资源

- [Hermes-agent](https://github.com/NousResearch/hermes-agent) ⭐ 100K
- [Claude Code Analysis](https://github.com/liuup/claude-code-analysis)
- [OpenClaw Docs](https://docs.openclaw.ai)

---

## 🤝 Contributing | 贡献

Issues and PRs welcome! | 欢迎提交 Issue 和 PR！

---

## 📝 License | 许可

MIT License | MIT 许可

**Note | 注意**: This project references design ideas from Hermes-agent and Claude Code. Implementation code is original. | 本项目参考了 Hermes-agent 和 Claude Code 的设计思想，实现代码为原创。

---

*This README is bilingual Chinese/English | 本 README 为中英双语版*
