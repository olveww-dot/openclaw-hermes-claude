# LSP Client Skill for OpenClaw

Provides code intelligence by connecting to external LSP (Language Server Protocol) servers.

## Features

- **Goto Definition** — Jump to where a symbol is defined
- **Find References** — Find all usages of a symbol
- **Hover** — Get type info and docs on hover
- **Document Symbols** — Get the file outline (functions, classes, etc.)

## Prerequisites: Install LSP Servers

This skill is an LSP **client** — you need to install LSP **servers** yourself.

### Quick Install

```bash
# TypeScript / JavaScript
npm i -g typescript-language-server

# Python
pip install pyright

# Rust
rustup component add rust-analyzer

# Go
go install golang.org/x/tools/gopls@latest

# C / C++
# Install clangd via LLVM or package manager
```

### Full Server List

| Language | Server | Install Command |
|----------|--------|-----------------|
| TypeScript/JS | `typescript-language-server` | `npm i -g typescript-language-server` |
| Python | `pyright` | `pip install pyright` |
| Python | `jedi-language-server` | `pip install jedi-language-server` |
| Rust | `rust-analyzer` | `rustup component add rust-analyzer` |
| Go | `gopls` | `go install golang.org/x/tools/gopls@latest` |
| C/C++ | `clangd` | OS package manager or LLVM |
| Vue | `volar` | `npm i -g @vue/language-server` |

### Verify Installation

```bash
# Check the server is in your PATH
which typescript-language-server
typescript-language-server --version
```

## Usage

### Goto Definition

```
EC: 跳转到定义 main.ts:10:5
小呆呆: → /path/to/main.ts:25:1
```

### Find References

```
EC: 查找引用 app.ts:5:10
小呆呆:
1. /path/to/main.ts:10:5
2. /path/to/utils.ts:3:8
3. /path/to/app.ts:5:10
```

### Hover

```
EC: 悬停提示 index.ts:20:3
小呆呆:
function greet(name: string): string
Says hello to the named person.
```

### Document Symbols

```
EC: 符号搜索 main.ts
小呆呆:
main (Function) :1:0
  greet (Function) :5:0
  App (Class) :10:0
    constructor (Method) :12:0
    render (Method) :15:0
```

## Configuration

Configure LSP servers in your OpenClaw config:

```typescript
// In your skill config or TOOLS.md
const lspServers = {
  typescript: {
    command: 'typescript-language-server',
    args: ['--stdio'],
    extensionToLanguage: {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
    },
    // Optional: workspace folder
    // workspaceFolder: '/path/to/project',
    // Optional: startup timeout (ms)
    // startupTimeout: 30000,
  },
  python: {
    command: 'pyright-langserver',
    args: ['--stdio'],
    extensionToLanguage: {
      '.py': 'python',
    },
  },
}
```

## How It Works

```
┌──────────────────────────────────────────────────────┐
│  OpenClaw                                           │
│  ┌────────────────────────────────────────────────┐  │
│  │  lsp-commands.ts (your commands)               │  │
│  │  - gotoDefinition()                           │  │
│  │  - findReferences()                           │  │
│  │  - hover()                                    │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │                              │
│  ┌────────────────────▼───────────────────────────┐  │
│  │  server-manager.ts (LSP client)                │  │
│  │  - manages server lifecycle                    │  │
│  │  - routes requests by file extension           │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │ stdio (JSON-RPC)              │
│  ┌────────────────────▼───────────────────────────┐  │
│  │  typescript-language-server (external)         │  │
│  │  rust-analyzer                                 │  │
│  │  pyright-langserver                           │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Troubleshooting

### "No LSP server found for this file type"

- Make sure the file extension is mapped in `extensionToLanguage`
- Verify the server command is in your PATH

### Server fails to start

- Check the server is installed: `which <server-name>`
- Try running the server manually to see error output:
  ```bash
  typescript-language-server --stdio
  ```

### Timeout errors

- Increase `startupTimeout` in the server config (default: 30000ms)

### macOS: "cannot open" security error

- Go to System Preferences → Security & Privacy → allow the terminal app

## Files

```
lsp-client/
├── SKILL.md           — Skill definition
├── README.md          — This file
└── src/
    ├── protocol.ts    — LSP protocol types
    ├── server-manager.ts — Server lifecycle & communication
    └── lsp-commands.ts  — High-level commands
```
