# Coordinator Mode — OpenClaw Skill

将主 Agent 变成**指挥官**，只调度任务，不亲自执行。所有工作交给 Worker 子代理完成。

## 安装

```bash
# 技能已安装到 ~/.openclaw/workspace/skills/coordinator/
ls ~/.openclaw/workspace/skills/coordinator/
```

## 激活方式

对 EC 说：

```
进入协调模式
```

EC 会加载 `src/coordinator-prompt.ts` 作为 system prompt 覆盖，进入 Coordinator 模式。

## 工作原理

```
用户 → Coordinator → [Worker-A, Worker-B, Worker-C] (并行)
                        ↓           ↓           ↓
                   <task-notification>  ← 结果推送给 Coordinator
                                           ↓
                                       汇总报告
                                           ↓
                                        用户
```

## 核心原则

1. **不亲自执行** — 只派发任务，不做工作
2. **不感谢 Worker** — 结果是内部信号，不是对话
3. **不预测结果** — 等 `<task-notification>` 到来
4. **并行派发** — 独立任务同时执行
5. **先综合再派发** — 自己理解结果，不说"基于你的发现"

## 工具限制

**Coordinator 可用工具：**
- `spawn` / `sessions_spawn` — 启动 Worker
- `message` (send) — 继续已有 Worker
- `sessions_yield` — 结束本轮，等待结果

**Worker 可用工具：**
- `exec` — shell 命令
- `read/write/edit` — 文件操作
- `web_fetch/browser` — 网页访问
- 等等

## 使用示例

```
用户: 帮我分析这个代码库的安全漏洞，然后修复最严重的那个

Coordinator:
  1. [Spawn Worker-A] 安全审计
  2. [Spawn Worker-B] 并行调研其他方面
  3. 等待结果...

  <task-notification> Worker-A 报告3个漏洞

  4. [Continue Worker-A] 修复最高优先级
  5. [Spawn Worker-C] 验证修复

  <task-notification> Worker-C 验证通过

  6. 汇总报告给用户
```

## 文件结构

```
coordinator/
├── SKILL.md                   ← Skill 定义
├── README.md                  ← 本文档
└── src/
    ├── coordinator-prompt.ts ← Coordinator system prompt
    └── worker-prompt.ts       ← Worker prompt 模板
```

## 文件说明

### `src/coordinator-prompt.ts`

完整的 Coordinator system prompt，包含：
- 角色定义
- 核心原则（不感谢、不预测、并行、综合）
- `<task-notification>` 格式说明
- Spawn/Continue 的使用指南
- 反模式警告

### `src/worker-prompt.ts`

Worker 的 base prompt，包含：
- 角色定义
- 执行规则
- 报告格式
- 辅助函数 `createWorkerPrompt(task, context)`

## 与 Claude Code Coordinator 的区别

| 特性 | Claude Code | OpenClaw Skill |
|------|-------------|----------------|
| 激活方式 | `export CLAUDE_CODE_COORDINATOR_MODE=1` | 说"进入协调模式" |
| Worker 类型 | `subagent_type: "worker"` | 同 |
| 结果格式 | `<task-notification>` | 同 |
| 工具限制 | 环境变量控制 | system prompt 约束 |
| 状态切换 | env var 切换 | prompt 覆盖 |

## 自定义

修改 Worker 可用工具：在 `worker-prompt.ts` 的 `WORKER_BASE_PROMPT` 中增删工具描述。

修改 Coordinator 行为：编辑 `coordinator-prompt.ts` 中的 `COORDINATOR_PROMPT`。

## 同步到 GitHub

```bash
cp -r ~/.openclaw/workspace/skills/coordinator ~/research/openclaw-hermes-claude/skills/
cd ~/research/openclaw-hermes-claude && git add skills/coordinator/ && git commit -m "feat: add coordinator skill"
```
