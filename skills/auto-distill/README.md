# auto-distill

> **T1: Auto Memory** — 会话结束后自动 distill 对话内容到 MEMORY.md

## 功能

- 自动读取当前会话的消息历史
- 调用 SiliconFlow DeepSeek-V3 提炼关键信息
- 以日期标记格式追加到 `MEMORY.md`
- 支持 Hook 触发（会话结束自动运行）

## 安装

### 方式一：自动（通过 openclaw skills）

```bash
openclaw skills install auto-distill
```

### 方式二：手动

```bash
# skill 已存在于以下路径
~/.openclaw/workspace/skills/auto-distill/
```

## 使用

### 手动触发

```bash
openclaw run auto-distill
```

### 自动触发（推荐）

在 `~/.openclaw/config.json` 中添加 session-end hook：

```json
{
  "hooks": {
    "session:end": "openclaw run auto-distill"
  }
}
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SILICONFLOW_API_KEY` | SiliconFlow API Key | 从 TOOLS.md 读取 |
| `OPENCLAW_SESSION_JSON` | 会话 JSON 文件路径 | `~/.openclaw/sessions/current/session.json` |
| `MEMORY_PATH` | MEMORY.md 路径 | `~/.openclaw/workspace/MEMORY.md` |

## 输出的 MEMORY.md 格式

```markdown
---

## [2026-04-19]

### 对话摘要
- 用户询问了如何实现某个功能
- 助手提供了详细的实现方案

### 关键决策
- 采用方案A而非方案B

### 待办/后续
- 需要进一步测试方案A的效果
```

## 注意事项

1. **不会覆盖**已有的 MEMORY.md 内容，只追加
2. **同一天不会重复追加**，避免重复记录
3. 默认只读取最近 50 条消息，避免 token 过多
4. 需要有效的 SiliconFlow API Key

## 依赖

- Node.js ≥ 18
- SiliconFlow API Key
