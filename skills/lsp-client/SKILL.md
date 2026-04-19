# LSP Client Skill

**Skill Name:** lsp-client

**Description:** Provides code intelligence (goto definition, find references, hover, document symbols) by connecting to external LSP servers via stdio.

**Trigger Keywords:** `跳转到定义`, `查找引用`, `悬停提示`, `符号搜索`, `goto definition`, `find references`, `hover`, `document symbol`

---

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
