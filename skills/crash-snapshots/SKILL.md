---
name: crash-snapshots
description: "每次 write/edit 前自动备份原文件到 .openclaw/backups/，防止误操作导致文件丢失。"
author: "小呆呆"
version: "1.0.0"
---

# Crash-Resistant Snapshots

> 🛡️ **OpenClaw 混合进化方案** — 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw



> 🛡️ 写文件前自动备份，崩溃也不怕。

## 这个 Skill 做什么？

在你使用 `write` / `edit` 工具修改文件前，自动把原文件复制一份到 `.openclaw/backups/` 目录。

- ✅ 只备份**已存在的文件**（新文件不备份）
- ✅ 备份路径：`{原文件目录}/.openclaw/backups/{timestamp}_{原文件名}`
- ✅ 时间戳精确到秒，不会覆盖旧备份
- ✅ 备份目录不存在时自动创建

## 工作原理

在执行 `write` / `edit` 之前，Agent 会先调用 `backup.ts` 备份原文件。

## 🚀 一键安装

```bash
mkdir -p ~/.openclaw/skills && cd ~/.openclaw/skills && curl -fsSL https://github.com/olveww-dot/openclaw-hermes-claude/archive/main.tar.gz | tar xz && cp -r openclaw-hermes-claude-main/skills/crash-snapshots . && rm -rf openclaw-hermes-claude-main && echo "✅ crash-snapshots 安装成功"
```
## 使用方式

### 方式一：作为 OpenClaw Skill 直接调用

在对话中直接说：
```
"备份一下 src/utils.ts"
"帮我把 memory/notes.md 备份"
```

Agent 会调用 `backup.ts` 执行备份。

### 方式二：手动运行脚本

```bash
# 备份单个文件
node ~/.openclaw/workspace/skills/crash-snapshots/src/backup.ts /path/to/file.txt

# 备份多个文件
node ~/.openclaw/workspace/skills/crash-snapshots/src/backup.ts file1.ts file2.md

# 列出最近备份
ls -lt ~/.openclaw/workspace/skills/crash-snapshots/backups/
```

## 备份恢复

```bash
# 找到备份文件
ls -lt /path/to/dir/.openclaw/backups/

# 恢复（copy back，不要 mv）
cp /path/to/dir/.openclaw/backups/2026-04-19_22-30-00_file.txt /path/to/file.txt
```

## 备份目录结构

```
{文件所在目录}/
└── .openclaw/
    └── backups/
        ├── 2026-04-19_14-30-00_config.json
        ├── 2026-04-19_15-45-00_config.json
        └── ...
```

## API

### `backup.ts`

```
Usage: backup.ts <file1> [file2] ...

备份一个或多个文件到 .openclaw/backups/
- 只备份已存在的文件
- 新建文件跳过（无内容可备份）
- 备份路径：{dir}/.openclaw/backups/{timestamp}_{basename}
```

## 注意事项

- 备份是**额外保险**，不等于版本控制
- 建议同时使用 Git 进行真正的版本控制
- 备份文件多了记得定期清理

## 🧩 配套技能

本 skill 是 **OpenClaw 混合进化方案** 的一部分：

> 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

🔗 GitHub 项目：[olveww-dot/openclaw-hermes-claude](https://github.com/olveww-dot/openclaw-hermes-claude)

完整技能套件（6个）：
- 🛡️ **crash-snapshots** — 崩溃防护（本文）
- 🧠 **auto-distill** — T1 自动记忆蒸馏
- 🎯 **coordinator** — 指挥官模式
- 💡 **context-compress** — 思维链连续性
- 🔍 **lsp-client** — LSP 代码智能
- 🔄 **auto-reflection** — 自动反思

## 版本历史

- **v1.0.0** (2026-04-19): 初始版本
  - 支持 write/edit 前自动备份
  - 时间戳精确到秒，防止覆盖
  - 自动创建备份目录
