# Auto-Reflection Skill

**Name:** auto-reflection
**Category:** infrastructure
**Triggers:** tool execution result, subagent completion, error detection

---

## 概述

自动反思系统，整合三个能力：

- **C3 Task Notification**：子代理完成时主动通知主会话
- **C6 并发执行优化**：并行派发多个 subagent 的经验记录
- **H3 内置自动反思**：错误自动记录，决策经验提炼

每次工具执行后、每个 subagent 完成后、每次错误发生时，自动记录反思条目到 `memory/reflections/YYYY-MM-DD.md`。

---

## 核心模块

### `src/reflection-logger.ts`

记录反思条目，格式：

```
## [HH:MM:SS] {type} — {outcome}

**情境**: ...
**决策**: ...
**结果**: ...
**教训**: ...
```

**类型**：
- `tool_success` — 工具执行成功
- `tool_failure` — 工具执行失败
- `subagent_complete` — 子代理完成
- `decision` — 重要决策
- `error_recovery` — 错误恢复
- `lesson_learned` — 经验教训

**自动触发 Hook**：
- 工具执行后（通过 `promitheus_event` + 文件记录）
- subagent 完成后（通过主会话 sessions_yield 回调）

### `src/lesson-generator.ts`

从错误履历中提炼可操作的经验，格式：

```typescript
interface Lesson {
  id: string;
  timestamp: string;
  category: 'tool' | 'decision' | 'context' | 'safety';
  trigger: string;        // 什么触发了这个教训
  lesson: string;         // 核心教训（一句话）
  action: string;          // 具体行动项
  recurrenceRisk: 'high' | 'medium' | 'low';
}
```

---

## 使用方式

### 手动调用

```bash
# 记录工具执行结果
npx ts-node src/reflection-logger.ts log --type tool_success --tool "exec" --context "运行 ls 命令" --decision "用 exec 而非 read" --result "成功列出文件"

# 记录子代理完成
npx ts-node src/reflection-logger.ts subagent --task "调研 X" --outcome "完成，发现 Y" --lessons "需要先查文档"

# 从历史提炼经验
npx ts-node src/lesson-generator.ts distill --days 7

# 自我诊断检查
npx ts-node src/lesson-generator.ts diagnose
```

### OpenClaw Hook 集成

在 OpenClaw 配置中添加 hook：

```yaml
hooks:
  after_tool: "npx ts-node skills/auto-reflection/src/reflection-logger.ts hook --type tool_result"
  after_subagent: "npx ts-node skills/auto-reflection/src/reflection-logger.ts subagent"
```

---

## 存储位置

- 反思记录：`memory/reflections/YYYY-MM-DD.md`
- 提炼经验：`memory/reflections/lessons.md`
- 统计摘要：`memory/reflections/summary.md`

---

## 集成说明

本 skill 通过以下方式与 OpenClaw 集成：

1. **promitheus_event** — 每个重要事件调用 `promitheus_event()` 记录情感状态变化
2. **sessions_yield** — subagent 完成后主会话收到回调通知
3. **定时诊断** — 通过 cron 每天运行 `lesson-generator.ts diagnose` 检查最近错误
