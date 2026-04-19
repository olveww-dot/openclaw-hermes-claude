# OpenClaw Hybrid Evolution
# OpenClaw 混合进化方案

> 让 OpenClaw 融合 Hermes-agent 和 Claude Code 的核心能力

[![Stars](https://img.shields.io/github/stars/olveww-dot/openclaw-hermes-claude)](https://github.com/olveww-dot/openclaw-hermes-claude)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 项目目标

将 Hermes-agent（10万星）和 Claude Code 的核心功能移植到 OpenClaw，让每个 OpenClaw 用户都能免费获得：

- 🛡️ 崩溃防护（Crash-Resistant Snapshots）
- 🧠 四层记忆系统（Memory T1-T4）
- 🔄 自动反思机制（Auto-Reflection）
- 🎯 Coordinator 指挥官模式
- 💡 思维链连续性
- 🔍 LSP 代码智能

---

## 📚 文档结构

```
docs/
├── 13-items-analysis.md    # 13项功能详细分析
├── implementation-guide.md  # 6个高优先级功能实施方案
└── roadmap.md             # 实施路线图

skills/
├── crash-snapshots/        # H1 崩溃防护备份
├── auto-distill/           # H2/C1 自动记忆蒸馏
└── coordinator/           # C5 指挥官模式
```

---

## 🚀 快速开始

### 1. 安装基础进化包

```bash
# 安装崩溃防护 Skill
openclaw skills install crash-snapshots

# 安装自动记忆蒸馏 Skill
openclaw skills install auto-distill

# 安装 Coordinator 指挥官模式
openclaw skills install coordinator
```

### 2. 配置定时自检

```bash
# 设置每4小时自动运行自我诊断
openclaw cron add --name "自我进化诊断" \
  --schedule "0 */4 * * *" \
  --task "python3 skills/manager-self-evolution/self-check.py diagnose"
```

---

## 📋 13项功能进度

| 功能 | 状态 | 优先级 | 说明 |
|------|------|--------|------|
| H1 Crash-Resistant Snapshots | ✅ 已完成 | ⭐⭐⭐⭐⭐ | `skills/crash-snapshots/` |
| H2 超强记忆 T1-T4 | ✅ 已完成 | ⭐⭐⭐⭐⭐ | `skills/auto-distill/`（T1层） |
| C1 分层记忆系统 | ✅ 已完成 | ⭐⭐⭐⭐⭐ | `skills/auto-distill/`（T1层） |
| C5 Coordinator 模式 | ✅ 已完成 | ⭐⭐⭐⭐ | `skills/coordinator/` |
| H5 思维链连续性 | 🔨 开发中 | ⭐⭐⭐⭐ | `skills/context-compress/` |
| H3 内置自动反思 | 🔨 开发中 | ⭐⭐⭐ | 整合到 auto-distill |
| C3 Task Notification | 🔨 开发中 | ⭐⭐⭐ | 整合到 coordinator |
| C6 并发执行优化 | 🔨 开发中 | ⭐⭐⭐ | OpenClaw sessions_spawn |
| H7 LSP 代码智能 | 📋 规划中 | ⭐⭐⭐ | 需要 LSP 服务器 |
| C2 Priority Queue | 📋 规划中 | ⭐⭐⭐ | Task Registry 后续 |
| C4 Task Registry | 📋 规划中 | ⭐⭐⭐ | 任务注册表 |
| H6 NVIDIA 向量检索 | 📋 规划中 | ⭐⭐ | 需 GPU 基础设施 |
| H4 Iteration Budget Refund | ❌ 搁置 | ⭐ | 价值不清晰 |

**状态说明**：
- ✅ 已完成（可直接安装使用）
- 🔨 开发中（子代理运行中）
- 📋 规划中
- ❌ 搁置

---

## 🛠️ 已实现的 Skills

### crash-snapshots（H1）
每次 write/edit 前自动备份原文件，防止误操作导致数据丢失。
```
skills/crash-snapshots/
├── SKILL.md
├── README.md
└── src/backup.ts
```

### auto-distill（H2/C1 T1）
会话结束后自动调用 LLM 蒸馏对话关键信息，写入 MEMORY.md。
```
skills/auto-distill/
├── SKILL.md
├── README.md
└── src/distill.ts
```

### coordinator（C5）
主 agent 变成指挥官，只调度不执行，所有工作交给子代理。
```
skills/coordinator/
├── SKILL.md
├── README.md
└── src/
    ├── coordinator-prompt.ts
    └── worker-prompt.ts
```

---

## 🏗️ 技术架构

```
OpenClaw
├── Hermes-agent 内核
│   ├── MemoryProvider 记忆抽象
│   ├── context_compressor 上下文压缩
│   └── cron 调度系统
│
└── Claude Code 引擎
    ├── Coordinator 指挥官模式
    ├── 分层记忆系统
    ├── Task Registry
    └── LSP 代码智能
```

---

## 📖 学习资源

- [Hermes-agent 官方仓库](https://github.com/NousResearch/hermes-agent)（10万星）
- [Claude Code 架构分析](https://github.com/liuup/claude-code-analysis)
- [OpenClaw 官方文档](https://docs.openclaw.ai)

---

## 🤝 贡献

欢迎提交 Issue 和 PR！

---

## 📝 许可

本项目基于 MIT 许可开源。

**注意**：本项目参考了 Hermes-agent 和 Claude Code 的设计思想，但实现代码为原创。如需引用相关设计，请注明来源。
