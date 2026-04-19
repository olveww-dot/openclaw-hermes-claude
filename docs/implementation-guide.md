# OpenClaw 高优先级功能实现指南

> 研究日期：2026-04-19
> 参考资料：`/tmp/hermes-agent/`、`/tmp/claude-code-analysis/`、已有 skills

---

## 目录

- [H1: Crash-Resistant Snapshots](#h1-crash-resistant-snapshots)
- [H2/C1: 记忆架构统一（四层记忆）](#h2-c1-记忆架构统一四层记忆)
- [C5: Coordinator 模式](#c5-coordinator-模式)
- [H5: 思维链连续性（增量摘要）](#h5-思维链连续性增量摘要)
- [H7: LSP代码智能](#h7-lsp代码智能)
- [C3/C6/H3: 自动反思](#c3-c6-h3-自动反思)

---

## H1: Crash-Resistant Snapshots

### 目标
在每次 `write`/`edit` 操作前自动备份原文件到 `.openclaw/backups/`，防止崩溃导致数据丢失。

### 实现步骤

1. 创建 skill 目录结构
2. 编写 `backup-wrapper.ts` 作为工具拦截层
3. 在 OpenClaw 配置中注册拦截器
4. 配置备份清理策略（可选）

### 文件结构

```
skills/crash-snapshots/
├── SKILL.md
├── src/
│   ├── backup-wrapper.ts     # 核心：write/edit 拦截器
│   ├── backup-store.ts       # 备份存储管理
│   ├── restore.ts            # 崩溃恢复逻辑
│   └── registry.ts           # 备份元数据注册表
├── bin/
│   └── restore-all.ts        # 批量恢复 CLI
└── README.md
```

### 核心代码

**`src/backup-wrapper.ts`** — 工具拦截器

```typescript
// 拦截 write/edit，在操作前备份原文件
// 集成方式：通过 OpenClaw 的工具 pre-hook 机制调用

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname, basename } from 'path'

const BACKUP_DIR = '.openclaw/backups'
const MAX_BACKUPS_PER_FILE = 50  // 每文件最多保留版本数

export interface BackupEntry {
  timestamp: number
  originalPath: string
  backupPath: string
  tool: 'write' | 'edit'
  size: number
  sessionId?: string
}

// 拦截 write 操作
export async function backupBeforeWrite(
  filePath: string,
  newContent: string,
  tool: 'write' | 'edit'
): Promise<BackupEntry | null> {
  if (!existsSync(filePath)) return null  // 新建文件无需备份

  const backupDir = join(dirname(filePath), BACKUP_DIR)
  mkdirSync(backupDir, { recursive: true })

  const timestamp = Date.now()
  const originalContent = readFileSync(filePath, 'utf-8')
  const backupName = `${timestamp}_${basename(filePath)}`
  const backupPath = join(backupDir, backupName)

  // 原子操作：先备份，再写入
  copyFileSync(filePath, backupPath)

  // 写入元数据注册表
  const entry: BackupEntry = {
    timestamp,
    originalPath: filePath,
    backupPath,
    tool,
    size: originalContent.length,
  }
  await appendToRegistry(filePath, entry)

  // 清理旧版本（保留最近 MAX_BACKUPS_PER_FILE 个）
  await pruneOldBackups(filePath, backupDir)

  return entry
}

// 崩溃恢复：从注册表读取某文件所有备份，按时间排序
export async function restoreFromBackup(
  filePath: string,
  targetTimestamp?: number  // 不指定则恢复最近版本
): Promise<void> {
  const registry = await loadRegistry()
  const entries = registry.filter(e => e.originalPath === filePath)
    .sort((a, b) => b.timestamp - a.timestamp)

  if (entries.length === 0) throw new Error(`No backups found for ${filePath}`)

  const entry = targetTimestamp
    ? entries.find(e => e.timestamp === targetTimestamp)
    : entries[0]

  if (!entry) throw new Error(`Backup at ${targetTimestamp} not found`)

  const content = readFileSync(entry.backupPath, 'utf-8')
  writeFileSync(filePath, content, 'utf-8')
}

// 编辑拦截：用 diff 信息创建更精确的备份描述
export async function backupBeforeEdit(
  filePath: string,
  oldText: string,
  newText: string
): Promise<BackupEntry> {
  // edit 操作：oldText 已知，只需备份当前文件
  const backupDir = join(dirname(filePath), BACKUP_DIR)
  mkdirSync(backupDir, { recursive: true })

  const timestamp = Date.now()
  const backupName = `${timestamp}_${basename(filePath)}.edit_backup`
  const backupPath = join(backupDir, backupName)

  copyFileSync(filePath, backupPath)

  const entry: BackupEntry = {
    timestamp,
    originalPath: filePath,
    backupPath,
    tool: 'edit',
    size: readFileSync(filePath, 'utf-8').length,
  }
  await appendToRegistry(filePath, entry)

  return entry
}
```

**`src/registry.ts`** — 备份元数据注册表

```typescript
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { BackupEntry } from './backup-wrapper'

const REGISTRY_PATH = '.openclaw/backups/registry.jsonl'

export async function appendToRegistry(filePath: string, entry: BackupEntry): Promise<void> {
  const line = JSON.stringify({ ...entry, filePath }) + '\n'
  // append 模式，OpenClaw 环境用 exec 或 write + append
  const dir = join(process.cwd(), '.openclaw/backups')
  const file = join(dir, 'registry.jsonl')
  const current = existsSync(file) ? readFileSync(file, 'utf-8') : ''
  writeFileSync(file, current + line, 'utf-8')
}

export async function loadRegistry(filePath?: string): Promise<Array<BackupEntry & { filePath: string }>> {
  const file = filePath || REGISTRY_PATH
  if (!existsSync(file)) return []
  const content = readFileSync(file, 'utf-8')
  return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
}

export async function pruneOldBackups(originalPath: string, backupDir: string): Promise<void> {
  const entries = (await loadRegistry()).filter(e => e.originalPath === originalPath)
    .sort((a, b) => b.timestamp - a.timestamp)

  // 保留最近 MAX_BACKUPS_PER_FILE 个
  const toDelete = entries.slice(MAX_BACKUPS_PER_FILE)
  for (const entry of toDelete) {
    try {
      const { unlinkSync } = await import('fs')
      unlinkSync(entry.backupPath)
    } catch {}
  }
}
```

### 集成方式

在 OpenClaw 中通过**工具 pre-hook** 调用：

```
每次 write/edit → 调用 backupBeforeWrite/backupBeforeEdit → 原工具执行
```

OpenClaw 目前不支持原生 hook，需通过 **skill 的 wrapper 脚本**实现：
- 方案A：用 `exec` 包装 `write`/`edit` 工具调用（需要修改工具调用路径）
- 方案B：修改 OpenClaw 核心工具层（需要 fork openclaw）✅ **推荐**

---

## H2/C1: 记忆架构统一（四层记忆）

### 现状
OpenClaw 已有：
- T2：memory/YYYY-MM-DD.md（每日日志）
- T4：MEMORY.md（长期精华）
- FTS5：claude-mem 语义搜索

缺口：**T1（Auto Memory / 每次会话自动 distill）**

### T1 实现：会话结束自动 distill 到 MEMORY.md

### 文件结构

```
skills/auto-distill/
├── SKILL.md
├── src/
│   ├── distill.ts            # 核心 distill 逻辑
│   ├── session-summarizer.ts # LLM 调用生成摘要
│   └── memory-merger.ts      # 合并到 MEMORY.md
└── bin/
    └── run-distill.ts        # CLI 入口
```

### 核心代码

**`src/distill.ts`** — 每次会话结束自动触发

```typescript
// 会话结束钩子： distill(session_messages) → 更新 MEMORY.md

interface SessionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls?: Array<{ function: { name: string; arguments: string } }>
}

// 蒸馏 prompt：从会话历史中提炼值得记住的内容
const DISTILL_PROMPT = `你是一个记忆提炼助手。从以下会话记录中提取值得长期记住的信息：

会话记录：
{conversation_text}

请按以下格式输出（只输出 JSON，不要其他内容）：
{{
  "decisions": ["做过的重要决定及原因"],
  "preferences": ["用户的偏好/习惯"],
  "lessons": ["从错误中学到的教训"],
  "context": ["重要的上下文信息（项目、人物、目标）"],
  "accomplishments": ["完成的成果"]
}}`

export async function distillSession(messages: SessionMessage[]): Promise<DistillResult> {
  // 1. 过滤掉 system prompt 和 tool 结果，只保留关键对话
  const meaningfulMessages = messages.filter(m =>
    m.role === 'user' || (m.role === 'assistant' && !m.tool_calls)
  )

  // 2. 截断太长内容
  const text = meaningfulMessages
    .map(m => `[${m.role}]: ${m.content}`)
    .join('\n')
    .slice(0, 8000)  // 限制输入长度

  // 3. 调用 LLM 提炼
  const response = await callLLM({
    model: 'minimax/MiniMax-M2.7',
    messages: [{
      role: 'user',
      content: DISTILL_PROMPT.replace('{conversation_text}', text)
    }],
    max_tokens: 1000,
  })

  const result = JSON.parse(response.content)

  // 4. 合并到 MEMORY.md
  await mergeIntoMemory(result)

  return result
}

async function mergeIntoMemory(result: DistillResult): Promise<void> {
  const memoryPath = join(process.cwd(), 'MEMORY.md')
  const existing = readFileSync(memoryPath, 'utf-8')

  // 解析现有 sections，追加新内容
  let updated = existing

  const sections = {
    decisions: '## 🚀 项目决策',
    preferences: '## 💬 用户偏好',
    lessons: '## 📌 教训与改进',
    context: '## 📌 重要上下文',
    accomplishments: '## ✅ 成果',
  }

  for (const [key, heading] of Object.entries(sections)) {
    const items = result[key as keyof DistillResult] || []
    if (items.length === 0) continue

    const newContent = items.map(item => `- ${item}`).join('\n')
    if (existing.includes(heading)) {
      // 追加到现有 section
      updated = updated.replace(
        heading + '\n',
        `${heading}\n${newContent}\n`
      )
    } else {
      // 新增 section
      updated += `\n\n${heading}\n${newContent}\n`
    }
  }

  writeFileSync(memoryPath, updated, 'utf-8')
}
```

**触发时机：**

```typescript
// 在 OpenClaw session end 时自动调用
// 集成到 AGENTS.md 的 "Session Startup" 流程：
//   每次会话结束前 → distillSession(session_history) → 更新 MEMORY.md
```

**与现有 memory-layer 的关系：**

```
memory-layer (已有)
  ├─ L0: memory/daily-chats/   ← 原始聊天
  ├─ L1: memory/l1-short-term/  ← 每日提取
  └─ L2: MEMORY.md              ← 精华

T1 (本 skill 新增)
  └─ 会话结束自动 distill → L2 (MEMORY.md)
```

---

## C5: Coordinator 模式

### 参考
Claude Code 的 `coordinatorMode.ts` — 主 agent 变指挥官，只调度不执行。

### 文件结构

```
skills/coordinator/
├── SKILL.md
├── src/
│   ├── coordinator-prompt.ts    # 系统提示词
│   ├── worker-spawner.ts        # 通过 subagent 调度 worker
│   └── result-aggregator.ts    # 聚合 worker 结果
└── bin/
    └── enter-coordinator.ts    # 切换到 coordinator 模式
```

### 核心代码

**`src/coordinator-prompt.ts`** — Coordinator 系统提示词

```typescript
export const COORDINATOR_SYSTEM_PROMPT = `你是一个 **Coordinator（协调者）**。

## 你的角色

你负责：
1. **理解用户目标** — 把复杂任务拆解为可并行的子任务
2. **调度 workers** — 使用 subagent 并行执行研究/实现/验证
3. **聚合结果** — 综合 worker 回报，向用户汇报

**你不需要自己执行代码**。遇到需要操作文件、运行命令时，调度 worker。

## 你的工具

- **subagent（spawn）** — 启动一个 worker
- **subagent（send）** — 继续一个已有 worker
- **subagent（stop）** — 停止失控的 worker

## 工作流

| 阶段 | 谁做 | 目的 |
|------|------|------|
| Research | Workers（并行） | 调查代码库、理解问题 |
| Synthesis | **你（coordinator）** | 读懂回报，制定实现规格 |
| Implementation | Workers | 按规格执行修改 |
| Verification | Workers | 独立验证代码是否有效 |

## 关键原则

1. **并行是你的超能力** — 独立任务同时调度，不要串行
2. **自己先理解，再分配** — worker 看不到你的对话，每个 prompt 必须自包含
3. **明确"完成"标准** — 每个 worker 指令说清楚 done 是什么
4. **验证要独立** — verifier 不要和 implementation worker 共用上下文

## Worker Prompt 模板

\`\`\`
你是一个 Worker。请完成以下任务：

[具体任务描述，包括文件路径、行号、要求]

完成标准：
- [具体验收条件]

完成后报告：
1. 具体修改了什么（文件:行号）
2. 验证结果
3. commit hash（如有）
\`\`\`

## 任务结果格式

Worker 回报格式：
\`\`\`
<task-result>
<task-id>xxx</task-id>
<status>completed|failed</status>
<result>具体回报内容</result>
</task-result>
\`\`\`
`
```

**`src/worker-spawner.ts`** — Worker 调度器

```typescript
// 通过 OpenClaw subagent 调度 worker
// 复用 OpenClaw 已有 sessions_spawn 工具

import { sessions_spawn } from 'openclaw'

export interface WorkerConfig {
  description: string       // 任务描述（用于日志）
  prompt: string           // 自包含的 worker 指令
  parallel?: boolean       // 是否并行（默认 true）
}

export async function spawnWorkers(workers: WorkerConfig[]): Promise<string[]> {
  // 并行启动所有 worker
  const results = await Promise.all(
    workers.map(w => sessions_spawn({
      prompt: w.prompt,
      name: w.description,
      // 返回 task_id 用于后续 continue
    }))
  )

  return results.map(r => r.taskId)
}

// 继续已有 worker
export async function continueWorker(
  taskId: string,
  message: string
): Promise<void> {
  await sessions_spawn({
    continue: taskId,
    prompt: message,
  })
}

// 停止 worker
export async function stopWorker(taskId: string): Promise<void> {
  await sessions_spawn({
    stop: taskId,
  })
}
```

### 集成方式

在 AGENTS.md 中添加：

```
## Coordinator 模式切换

输入 "/coordinator" 或 "进入协调模式" → 加载 coordinator skill
→ 系统提示词替换为 COORDINATOR_SYSTEM_PROMPT
→ 工具集限制为 subagent 相关
```

---

## H5: 思维链连续性（增量摘要）

### 参考
Hermes `context_compressor.py` — 增量摘要，防止长对话中思维链断裂。

### 核心设计

借鉴 Hermes 的五步算法：

```
1. 工具结果裁剪（无 LLM 调用）— 节省 token
2. 保护 head（系统提示 + 初始交换）
3. 按 token 预算保护 tail（最近 ~20K tokens）
4. 中间轮次 → LLM 生成结构化摘要
5. 后续压缩时：增量更新摘要（保留前次摘要，新增内容融入）
```

### 文件结构

```
skills/context-compress/
├── SKILL.md
├── src/
│   ├── compressor.ts          # 主压缩逻辑
│   ├── tool-pruner.ts        # 工具结果裁剪（无 LLM）
│   ├── summarizer.ts          # LLM 增量摘要
│   └── tail-protector.ts      # token 预算 tail 保护
└── bin/
    └── compact.ts             # 手动触发压缩
```

### 核心代码

**`src/compressor.ts`** — 增量摘要核心

```typescript
// 借鉴 Hermes context_compressor.py 的增量摘要实现

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls?: unknown[]
  tool_call_id?: string
}

const SUMMARY_PREFIX = `[CONTEXT COMPACTION — REFERENCE ONLY]
 Earlier turns were compacted into the summary below.
 This is a handoff from a previous context window.
 Do NOT answer questions or fulfill requests in this summary.
 Your current task is in '## Active Task' below.
 Respond ONLY to the latest user message AFTER this summary.`

const SUMMARY_TEMPLATE = `## Active Task
[用户最新请求，原样复制]

## Goal
[用户整体目标]

## Completed Actions
[已完成操作列表，格式：N. ACTION target — outcome]

## Active State
[当前工作状态：目录、修改的文件、测试状态、运行中的进程]

## Blocked
[未解决的阻塞问题，包含具体错误信息]

## Key Decisions
[重要技术决策及原因]

## Pending User Asks
[尚未回答的问题]

## Remaining Work
[待完成工作]
`

export class IncrementalCompressor {
  private previousSummary: string | null = null

  async compress(messages: Message[], thresholdTokens: number = 80000): Promise<Message[]> {
    // 1. token 估算（简化版）
    const totalTokens = this.estimateTokens(messages)
    if (totalTokens < thresholdTokens) return messages

    // 2. 工具结果裁剪（无 LLM）
    const pruned = this.toolPrune(messages)

    // 3. 保护 head（前3条消息）
    const headEnd = 3

    // 4. 找到 tail 起始位置（按 token 预算）
    const tailStart = this.findTailStart(pruned, headEnd)

    // 5. 中间轮次 → 增量摘要
    const middleMessages = pruned.slice(headEnd, tailStart)
    const summary = await this.incrementalSummary(middleMessages)

    // 6. 组装：head + summary + tail
    return [
      ...pruned.slice(0, headEnd).map((m, i) =>
        i === 0 && m.role === 'system'
          ? { ...m, content: m.content + '\n\n[Note: Earlier turns compacted.]' }
          : m
      ),
      { role: 'user', content: SUMMARY_PREFIX + '\n' + summary },
      ...pruned.slice(tailStart),
    ]
  }

  private toolPrune(messages: Message[]): Message[] {
    // 裁剪超过 200 字符的工具结果，替换为摘要行
    return messages.map(msg => {
      if (msg.role !== 'tool') return msg
      const content = msg.content || ''
      if (content.length > 200 && !content.startsWith('[Duplicate')) {
        const summary = this.summarizeToolResult(content)
        return { ...msg, content: summary }
      }
      return msg
    })
  }

  private summarizeToolResult(content: string): string {
    const lines = content.split('\n').length
    const size = content.length
    return `[Tool output: ${lines} lines, ${size} chars]`
  }

  private findTailStart(messages: Message[], headEnd: number): number {
    // 从后往前，保留约 20K tokens 的 tail
    let tokens = 0
    const TAIL_BUDGET = 20000
    for (let i = messages.length - 1; i > headEnd; i--) {
      tokens += this.estimateTokens([messages[i]])
      if (tokens > TAIL_BUDGET) return i + 1
    }
    return headEnd + 1
  }

  private async incrementalSummary(middle: Message[]): Promise<string> {
    // 调用 LLM 生成增量摘要
    const serialized = this.serializeForSummary(middle)
    const prompt = this.previousSummary
      ? `PREVIOUS SUMMARY:\n${this.previousSummary}\n\nNEW TURNS:\n${serialized}\n\nUpdate the summary above with new progress.`
      : `Summarize this conversation:\n${serialized}`

    const response = await callLLM({
      model: 'minimax/MiniMax-M2.7',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    })

    this.previousSummary = response.content
    return response.content
  }

  private serializeForSummary(messages: Message[]): string {
    return messages.map(m => {
      const role = m.role.toUpperCase()
      const content = (m.content || '').slice(0, 3000)
      return `[${role}]: ${content}`
    }).join('\n\n')
  }

  private estimateTokens(messages: Message[]): number {
    // 简化估算：4 字符 ≈ 1 token
    return messages.reduce((sum, m) => {
      const text = typeof m.content === 'string' ? m.content : ''
      return sum + Math.ceil(text.length / 4) + 20
    }, 0)
  }
}
```

**触发时机：**

```typescript
// 集成到 OpenClaw 的消息处理管道
// 当 prompt_tokens > threshold 时自动触发
// 在 AGENTS.md 中注册为 session 级别的自动机制
```

---

## H7: LSP代码智能

### 参考
Claude Code `LSPServerManager.ts` — 完整的 LSP 服务器管理。

### 限制
**需要外部 LSP 服务器**（TypeScript 需要 tsserver，Python 需要 pyright 等）。OpenClaw skill 只负责管理 LSP 客户端连接。

### 文件结构

```
skills/lsp-client/
├── SKILL.md
├── src/
│   ├── server-manager.ts       # LSP 服务器生命周期管理
│   ├── lsp-client.ts          # 发送 LSP 请求
│   ├── file-sync.ts           # 文件变化同步到 LSP
│   └── prompts.ts             # 整合 LSP 结果到 context
└── bin/
    └── install-servers.ts      # 安装推荐的 LSP 服务器
```

### 核心代码

**`src/server-manager.ts`** — 借鉴 Claude Code 的 LSPServerManager

```typescript
// LSP Server Manager — 管理多个 LSP 服务器实例
// 路由请求基于文件扩展名

import { spawn, type ChildProcess } from 'child_process'
import { readFileSync } from 'fs'

export interface LSPServerConfig {
  name: string
  command: string[]           // 启动命令，如 ['npx', 'tsserver']
  args?: string[]
  filePatterns: string[]       // 如 ['*.ts', '*.tsx']
  rootPatterns?: string[]      // 如 ['tsconfig.json', 'package.json']
}

const DEFAULT_SERVERS: LSPServerConfig[] = [
  {
    name: 'typescript',
    command: ['node', '/usr/local/lib/node_modules/typescript/lib/tsserver.js'],
    filePatterns: ['*.ts', '*.tsx'],
    rootPatterns: ['tsconfig.json'],
  },
  {
    name: 'python',
    command: ['python3', '-m', 'pyright.langserver'],
    filePatterns: ['*.py'],
    rootPatterns: ['pyrightconfig.json', 'pyproject.toml'],
  },
]

export interface LSPClient {
  sendRequest<T>(method: string, params: unknown): Promise<T | undefined>
  didOpen(path: string, content: string): void
  didChange(path: string, content: string): void
  didSave(path: string): void
  didClose(path: string): void
}

export class LSPServerManager {
  private servers = new Map<string, ChildProcess>()
  private clients = new Map<string, LSPClient>()
  private extensionMap = new Map<string, string>()  // ext → serverName

  constructor(servers: LSPServerConfig[] = DEFAULT_SERVERS) {
    // 构建扩展名 → 服务器名 的映射
    for (const s of servers) {
      for (const pattern of s.filePatterns) {
        this.extensionMap.set(pattern, s.name)
      }
    }
  }

  // 启动指定文件的 LSP 服务器
  async ensureServerStarted(filePath: string): Promise<LSPClient | undefined> {
    const ext = this.getExtension(filePath)
    const serverName = this.findServer(ext)
    if (!serverName) return undefined

    if (this.clients.has(serverName)) {
      return this.clients.get(serverName)!
    }

    const config = DEFAULT_SERVERS.find(s => s.name === serverName)
    if (!config) return undefined

    // 启动进程
    const proc = spawn(config.command[0], config.command.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.servers.set(serverName, proc)
    this.clients.set(serverName, this.createClient(proc, serverName))

    return this.clients.get(serverName)
  }

  // 发送 LSP 请求
  async sendRequest<T>(
    filePath: string,
    method: string,
    params: unknown
  ): Promise<T | undefined> {
    const client = await this.ensureServerStarted(filePath)
    if (!client) return undefined
    return client.sendRequest<T>(method, params)
  }

  // ============ 常用 LSP 方法 ============

  // 定义跳转
  async gotoDefinition(filePath: string, line: number, character: number) {
    return this.sendRequest('textDocument/definition', {
      textDocument: { uri: pathToUri(filePath) },
      position: { line, character },
    })
  }

  // 查找引用
  async findReferences(filePath: string, line: number, character: number) {
    return this.sendRequest('textDocument/references', {
      textDocument: { uri: pathToUri(filePath) },
      position: { line, character },
      context: { includeDeclaration: true },
    })
  }

  // 类型提示 / hover
  async getType(filePath: string, line: number, character: number) {
    return this.sendRequest('textDocument/hover', {
      textDocument: { uri: pathToUri(filePath) },
      position: { line, character },
    })
  }

  // 符号搜索
  async documentSymbols(filePath: string) {
    return this.sendRequest<Array<{ name: string; kind: number }>>(
      'textDocument/documentSymbol',
      { textDocument: { uri: pathToUri(filePath) } }
    )
  }

  shutdown() {
    for (const [name, proc] of this.servers) {
      proc.kill()
    }
    this.servers.clear()
    this.clients.clear()
  }

  // ---- helpers ----
  private getExtension(path: string): string {
    const i = path.lastIndexOf('.')
    return i >= 0 ? path.slice(i) : ''
  }

  private findServer(ext: string): string | undefined {
    return this.extensionMap.get(ext)
  }

  private pathToUri(path: string): string {
    return 'file://' + path
  }

  // LSP JSON-RPC 2.0 协议简化实现
  private createClient(proc: ChildProcess, serverName: string): LSPClient {
    let id = 0
    const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
    const self = this

    proc.stdout?.on('data', (data: Buffer) => {
      // 解析 JSON-RPC 消息
      const lines = data.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const msg = JSON.parse(line)
          if (msg.id && pending.has(msg.id)) {
            const p = pending.get(msg.id)!
            pending.delete(msg.id)
            if (msg.error) p.reject(new Error(msg.error.message))
            else p.resolve(msg.result)
          }
        } catch {}
      }
    })

    function sendRequest<T>(method: string, params: unknown): Promise<T | undefined> {
      return new Promise(resolve => {
        const currentId = ++id
        const payload = JSON.stringify({ jsonrpc: '2.0', id: currentId, method, params })
        proc.stdin?.write(payload + '\n')
        // 超时处理略
        pending.set(currentId, { resolve: resolve as (v: unknown) => void, reject: () => {} })
      })
    }

    function sendNotification(method: string, params: unknown) {
      const payload = JSON.stringify({ jsonrpc: '2.0', method, params })
      proc.stdin?.write(payload + '\n')
    }

    return {
      sendRequest: sendRequest as LSPClient['sendRequest'],
      didOpen(path: string, content: string) {
        sendNotification('textDocument/didOpen', {
          textDocument: { uri: self.pathToUri(path), text: content, version: 1 },
        })
      },
      didChange(path: string, content: string) {
        sendNotification('textDocument/didChange', {
          textDocument: { uri: self.pathToUri(path), version: 2 },
          contentChanges: [{ text: content }],
        })
      },
      didSave(path: string) {
        sendNotification('textDocument/didSave', { textDocument: { uri: self.pathToUri(path) } })
      },
      didClose(path: string) {
        sendNotification('textDocument/didClose', { textDocument: { uri: self.pathToUri(path) } })
      },
    }
  }
}
```

### 集成方式

在 OpenClaw 的 `read`/`write`/`edit` 工具之后，新增 LSP skill 的 `lsp` 工具：

```
用户输入 "跳转到这里定义" 或 "查找引用" → LSP skill → LSPServerManager → LSP 服务器
```

**依赖外部 LSP 服务器**，需要用户在系统上安装：
- TypeScript：`npx tsserver` 或 VSCode 的 tsserver
- Python：`pip install pyright` + `pyright.langserver`
- Rust：`rust-analyzer`

---

## C3/C6/H3: 自动反思

### 参考
- Hermes `insights.py` — 使用洞察分析
- `manager-self-evolution/self-check.py` — 已有检查逻辑

### 扩展方向
将现有的被动检查（手动运行 `self-check.py diagnose`）升级为**主动触发**（错误发生时自动记录 + 会话结束时自动反思）。

### 文件结构

```
skills/auto-reflection/
├── SKILL.md
├── src/
│   ├── reflection-trigger.ts    # 触发器（错误/会话结束）
│   ├── decision-extractor.ts    # 从会话中提取决策
│   ├── lesson-generator.ts      # LLM 生成反思/教训
│   └── lesson-store.ts          # 存储到 T3 记忆
└── bin/
    └── reflect-now.ts           # 手动触发反思
```

### 核心代码

**`src/lesson-generator.ts`** — 从错误中学习

```typescript
// 触发条件：
//   1. 工具调用失败（rate_limit, api_error, tool_not_found）
//   2. 会话结束（EC 说"就这样"、session timeout）
//   3. 用户要求（"反思一下"）

const ERROR_REFLECTION_PROMPT = `分析以下错误，提炼经验教训：

错误类型：{error_type}
错误信息：{error_message}
上下文：{context}

请输出（只输出 JSON）：
{{
  "root_cause": "根本原因",
  "lesson": "教训（一句话）",
  "preventive_action": "以后怎么避免",
  "confidence": 0-100
}}`

const SESSION_REFLECTION_PROMPT = `回顾以下会话，提炼决策经验和教训：

{conversation_text}

请输出（只输出 JSON）：
{{
  "key_decisions": [
    {{ "decision": "做了什么决定", "why": "为什么这样决定", "outcome": "结果如何" }}
  ],
  "mistakes": [
    {{ "mistake": "犯了什么错", "lesson": "教训", "correct_action": "正确做法" }}
  ],
  "what_went_well": ["做得好的地方"],
  "action_items": ["后续要改进的具体行动"]
}}`

export interface ErrorReflection {
  rootCause: string
  lesson: string
  preventiveAction: string
  confidence: number
}

export async function reflectOnError(
  errorType: string,
  errorMessage: string,
  context: string
): Promise<ErrorReflection> {
  const prompt = ERROR_REFLECTION_PROMPT
    .replace('{error_type}', errorType)
    .replace('{error_message}', errorMessage)
    .replace('{context}', context)

  const response = await callLLM({
    model: 'minimax/MiniMax-M2.7',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
  })

  return JSON.parse(response.content)
}

export interface SessionReflection {
  keyDecisions: Array<{ decision: string; why: string; outcome: string }>
  mistakes: Array<{ mistake: string; lesson: string; correctAction: string }>
  whatWentWell: string[]
  actionItems: string[]
}

export async function reflectOnSession(messages: SessionMessage[]): Promise<SessionReflection> {
  const text = messages
    .filter(m => m.role === 'user' || (m.role === 'assistant' && !m.tool_calls))
    .map(m => `[${m.role}]: ${m.content}`)
    .join('\n')
    .slice(0, 6000)

  const response = await callLLM({
    model: 'minimax/MiniMax-M2.7',
    messages: [{ role: 'user', content: SESSION_REFLECTION_PROMPT.replace('{conversation_text}', text) }],
    max_tokens: 1000,
  })

  return JSON.parse(response.content)
}
```

**`src/lesson-store.ts`** — 存储到 T3 记忆

```typescript
// 将反思结果存入 T3（结构化长期记忆）
// 与 H2/C1 的 T3 层记忆共用同一存储

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const T3_DIR = join(process.cwd(), 'memory/longterm')

interface MemoryEntry {
  type: 'lesson' | 'decision' | 'mistake' | 'insight'
  title: string
  content: string
  tags: string[]
  created: string
  source: 'error' | 'session' | 'manual'
}

export async function storeLesson(
  entry: MemoryEntry
): Promise<void> {
  mkdirSync(T3_DIR, { recursive: true })

  const filename = `${Date.now()}_${entry.type}.md`
  const frontmatter = `---
type: ${entry.type}
title: ${entry.title}
tags: [${entry.tags.join(', ')}]
created: ${entry.created}
source: ${entry.source}
---

${entry.content}
`

  writeFileSync(join(T3_DIR, filename), frontmatter, 'utf-8')
}

export async function storeSessionReflection(reflection: SessionReflection): Promise<void> {
  // 决策存入 T3
  for (const d of reflection.keyDecisions) {
    await storeLesson({
      type: 'decision',
      title: d.decision.slice(0, 60),
      content: `为什么：${d.why}\n结果：${d.outcome}`,
      tags: ['decision'],
      created: new Date().toISOString(),
      source: 'session',
    })
  }

  // 错误教训存入 T3
  for (const m of reflection.mistakes) {
    await storeLesson({
      type: 'mistake',
      title: m.mistake.slice(0, 60),
      content: `错误：${m.mistake}\n教训：${m.lesson}\n正确做法：${m.correctAction}`,
      tags: ['mistake', 'lesson'],
      created: new Date().toISOString(),
      source: 'session',
    })
  }
}
```

**触发器集成：**

```typescript
// 在工具调用失败时自动触发
// 集成到 OpenClaw 工具层
const ERROR_TRIGGERS = ['rate_limit_exceeded', 'api_error', 'tool_not_found', 'context_overflow']

export function setupAutoReflection(): void {
  // 监听工具错误
  for (const trigger of ERROR_TRIGGERS) {
    registerErrorHandler(trigger, async (error) => {
      const reflection = await reflectOnError(error.type, error.message, error.context)
      await storeLesson({
        type: 'lesson',
        title: `Error: ${error.type}`,
        content: reflection.lesson,
        tags: ['error', error.type],
        created: new Date().toISOString(),
        source: 'error',
      })
    })
  }
}
```

---

## 优先级与依赖关系

| 功能 | 优先级 | 难度 | 依赖 | 备注 |
|------|--------|------|------|------|
| **H1** Crash Snapshots | ⭐⭐⭐⭐⭐ | 中 | OpenClaw 工具层 hook | 最关键，代码修改必备 |
| **H2/C1** T1 Auto Memory | ⭐⭐⭐⭐ | 低 | 现有 memory-layer | 补充缺失的 distill 环节 |
| **C5** Coordinator | ⭐⭐⭐ | 中 | sessions_spawn | 复用 OpenClaw subagent |
| **H5** 增量摘要 | ⭐⭐⭐ | 高 | LLM API | 需深度集成消息管道 |
| **H7** LSP | ⭐⭐⭐ | 高 | 外部 LSP 服务器 | 依赖系统安装 |
| **C3/C6/H3** 自动反思 | ⭐⭐⭐ | 低 | 现有 self-check.py | 升级为主动触发 |

**推荐实现顺序：**
1. **H1** → 立即实现，防止数据丢失
2. **H2/C1 T1** → 最小改动，完善记忆系统
3. **C3/C6/H3** → 基于现有 self-check.py 快速升级
4. **C5** → 改变工作流，看 EC 需求
5. **H5** → 需要更多消息管道集成
6. **H7** → 需要外部依赖，压后

---

*文档版本：1.0 | 生成日期：2026-04-19*
