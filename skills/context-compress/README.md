# Context Compress Skill

增量摘要工具，防止长对话中思维链断裂。

## 功能

- **五步算法**: Prune → Head → Tail → LLM Summarize → Iterative
- **保护关键信息**: 系统提示、最新对话、关键决策不丢失
- **DeepSeek-V3 压缩**: 通过 SiliconFlow API 调用
- **工具输出裁剪**: 保留有用摘要，移除冗余

## 安装

```bash
# 技能目录已存在，直接使用
ls ~/.openclaw/workspace/skills/context-compress/
```

## 使用方式

### 手动触发

```
你: 压缩上下文
你: compact
```

### 代码调用

```typescript
import { compressMessages, createCompressor } from "./src/compressor";

// 简单调用
const compressed = await compressMessages(messages);

// 自定义配置
const compressor = createCompressor({
  protectFirstN: 3,
  tailTokenBudget: 20000,
  summaryTargetRatio: 0.20,
  focusTopic: "auth module refactor",
});

const result = await compressor.compress(messages);
console.log(result.compressedTokens, result.originalTokens);
```

## API

### `compressMessages(messages, config?)`

- `messages: Message[]` — OpenAI 格式的会话消息
- `config?: CompressorConfig` — 可选配置
- 返回: `Promise<Message[]>` — 压缩后的消息

### `createCompressor(config?)`

- 返回 `ContextCompressor` 实例，支持多次调用

### `CompressorConfig`

| 字段 | 默认值 | 描述 |
|------|--------|------|
| `protectFirstN` | 3 | 保护开头消息数 |
| `protectLastN` | 20 | 保护结尾消息数（备用） |
| `tailTokenBudget` | 20000 | Tail token 预算 |
| `summaryTargetRatio` | 0.20 | 摘要占压缩内容比例 |
| `maxSummaryTokens` | 12000 | 最大摘要 token 数 |
| `focusTopic` | - | 聚焦主题（引导压缩） |

### `CompressionResult`

```typescript
interface CompressionResult {
  messages: Message[];       // 压缩后的消息
  prunedCount: number;       // 裁剪的工具输出数
  summaryTokens: number;     // 摘要 token 数
  originalTokens: number;   // 原始 token 数
  compressedTokens: number;  // 压缩后 token 数
}
```

## 五步算法详解

### 1. Prune（裁剪）
- 工具输出 → 1行摘要（如 `[exec] ran npm test -> exit 0, 47 lines`）
- 去重相同内容
- 裁剪大型 tool_call arguments JSON

### 2. Head（保护开头）
- 系统提示 + 前 N 轮对话完整保留

### 3. Tail（保护结尾）
- 按 token 预算保护最近对话（约 20K tokens）
- 确保最后一条 user message 在 tail 内

### 4. LLM Summarize（压缩）
- 调用 DeepSeek-V3（SiliconFlow API）
- 生成结构化摘要：
  - Active Task（最重要）
  - Goal / Completed Actions / Active State
  - Blocked / Key Decisions / Pending User Asks
  - Remaining Work / Critical Context

### 5. Iterative（迭代）
- 后续压缩时，更新而非重写
- 保留已有信息，添加新进度

## 环境变量

```bash
SILICONFLOW_API_KEY=your_api_key
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1  # 可选
```

## 摘要格式示例

```
## Active Task
User asked: "Refactor the auth module to use JWT instead of sessions"

## Goal
Replace session-based auth with JWT token auth across all API endpoints

## Completed Actions
1. READ auth.py — found 3 session references [tool: read]
2. EDIT auth.py:45-67 — replaced session middleware with JWT.verify [tool: edit]
3. RUN `pytest tests/auth/` — 2/10 failed: test_token_expiry, test_refresh [tool: exec]

## Active State
- auth.py refactored, 2 failing tests
- tests/auth/test_token.py needs update

## Blocked
- JWT refresh token logic not yet implemented

## Key Decisions
- Using HS256 for symmetric signing (simpler ops)
- Refresh token stored in HTTP-only cookie

## Remaining Work
- Implement refresh token flow
- Fix test_token_expiry and test_refresh

## Critical Context
- Old session secret: `SECRET_KEY=old_value_here`
- JWT config location: config.py:JWT_CONFIG
```

## 同步到 GitHub

```bash
# 复制到 GitHub 同步目录
cp -r ~/.openclaw/workspace/skills/context-compress/ \
  ~/research/openclaw-hermes-claude/skills/context-compress/
```
