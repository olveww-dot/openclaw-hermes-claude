# Coordinator Mode — OpenClaw Skill

将主 Agent 变成**指挥官**，只调度任务，不亲自执行。所有工作交给 Worker 子代理完成。

## 安装（一键）

```bash
cd ~/.openclaw/workspace/skills/coordinator
bash install.sh
```

## 激活方式

### 方式1: 对 EC 说
```
进入协调模式
```

### 方式2: 运行激活脚本
```bash
bash ~/.openclaw/workspace/skills/coordinator/scripts/activate-coordinator.sh
```
脚本会输出完整的 Coordinator system prompt，复制替换当前 session 的 system prompt 即可。

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
├── install.sh                 ← 一键安装脚本
├── scripts/
│   └── activate-coordinator.sh ← 激活脚本
└── src/
    ├── coordinator-prompt.ts ← Coordinator system prompt
    └── worker-prompt.ts       ← Worker prompt 模板
```

## 同步到 GitHub

```bash
cd ~/research/openclaw-hermes-claude
cp -r ~/.openclaw/workspace/skills/coordinator skills/
git add skills/coordinator/ && git commit -m "feat: coordinator skill"
```
