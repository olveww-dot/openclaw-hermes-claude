# LSP Client Skill

> 🛡️ **OpenClaw 混合进化方案** — 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw



**Skill Name:** lsp-client

**Description:** Provides code intelligence (goto definition, find references, hover, document symbols) by connecting to external LSP servers via stdio.

**Trigger Keywords:** `跳转到定义`, `查找引用`, `悬停提示`, `符号搜索`, `goto definition`, `find references`, `hover`, `document symbol`

---

## 🚀 一键安装

```bash
mkdir -p ~/.openclaw/skills && cd ~/.openclaw/skills && curl -fsSL https://github.com/olveww-dot/openclaw-hermes-claude/archive/main.tar.gz | tar xz && cp -r openclaw-hermes-claude-main/skills/hermes-lsp-client . && rm -rf openclaw-hermes-claude-main && echo "✅ lsp-client 安装成功"
```

## What This Skill Does

This skill acts as an **LSP client** that communicates with external Language Server Protocol (LSP) servers. LSP is the protocol VSCode uses for code intelligence — this skill gives OpenClaw the same capabilities.

## Requirements

**You must install LSP servers yourself.** This skill is just the client.

### Supported LSP Servers

| Language | Server | Install |
|----------|--------|---------|
| TypeScript/JavaScript | `typescript-language-server` | `npm i -g typescript-language-server` |
| Python | `pyright` or `jedi-language-server` | `pip install pyright` |
| Rust | `rust-analyzer` | `rustup component add rust-analyzer` |
| Go | `gopls` | `go install golang.org/x/tools/gopls@latest` |
| C/C++ | `clangd` | Install via LLVM or your package manager |
| Vue | `volar` | `npm i -g @vue/language-server` |

## Configuration

Add LSP server configs to your `TOOLS.md` or skill config:

```typescript
const LSP_SERVERS = {
  'typescript': {
    command: 'typescript-language-server',
    args: ['--stdio'],
    extensionToLanguage: {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
    },
  },
}
```

## Commands

### Goto Definition
- **Trigger:** "跳转到定义", "goto definition"
- **Args:** `filePath:line:character`
- **Returns:** File path and line/column of the definition

### Find References
- **Trigger:** "查找引用", "find references"
- **Args:** `filePath:line:character`
- **Returns:** List of all reference locations

### Hover
- **Trigger:** "悬停提示", "hover"
- **Args:** `filePath:line:character`
- **Returns:** Type information and documentation

### Document Symbols
- **Trigger:** "符号搜索", "document symbols", "outline"
- **Args:** `filePath`
- **Returns:** Tree of symbols (functions, classes, etc.)

## Architecture

```
lsp-commands.ts   — High-level commands (gotoDef, findRefs, etc.)
server-manager.ts  — LSP server lifecycle & routing
protocol.ts        — LSP protocol type definitions
```

## Limitations

- Requires external LSP servers to be installed
- Servers communicate via stdio (not sockets)
- Only supports one server per file extension

## 🧩 配套技能

本 skill 是 **OpenClaw 混合进化方案** 的一部分：

> 将 [Hermesagent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

> 将 [Hermes-agent](https://github.com/NousResearch/hermes-agent)（100K ⭐）+ [Claude Code](https://github.com/liuup/claude-code-analysis) 核心能力移植到 OpenClaw

🔗 GitHub 项目：[olveww-dot/openclaw-hermes-claude](https://github.com/olveww-dot/openclaw-hermes-claude)

完整技能套件（6个）：
- 🛡️ **crash-snapshots** — 崩溃防护
- 🧠 **auto-distill** — T1 自动记忆蒸馏
- 🎯 **coordinator** — 指挥官模式
- 💡 **context-compress** — 思维链连续性
- 🔍 **lsp-client** — LSP 代码智能（本文）
- 🔄 **auto-reflection** — 自动反思
