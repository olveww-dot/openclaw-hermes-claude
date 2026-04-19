# Auto-Reflection Skill

自动反思系统，为 OpenClaw 提供 C3/C6/H3 能力：

- **C3 Task Notification** — 子代理完成时通知主会话
- **C6 并发执行优化** — 并行 subagent 的经验记录
- **H3 内置自动反思** — 错误自动记录 + 决策经验提炼

## 安装（一键）

```bash
cd ~/.openclaw/workspace/skills/auto-reflection
bash install.sh
```

安装后查看 hook 配置：
```bash
cat ~/.openclaw/workspace/skills/auto-reflection/.hook-config.yaml
```

## 激活 Hook

将生成的 hook 配置添加到 `~/.openclaw/config.yaml`：

```yaml
hooks:
  after_tool: "bash ~/.openclaw/workspace/skills/auto-reflection/scripts/log-reflection.sh tool"
  after_subagent: "bash ~/.openclaw/workspace/skills/auto-reflection/scripts/log-reflection.sh subagent"
```

## 存储位置

| 类型 | 路径 |
|------|------|
| 每日反思 | `memory/reflections/YYYY-MM-DD.md` |
| 提炼经验 | `memory/reflections/lessons.md` |

## 快捷命令

```bash
# 记录工具执行结果
bash scripts/log-reflection.sh tool \
  --success false \
  --tool exec \
  --context "执行 rm -rf /tmp/test" \
  --decision "未确认路径是否正确" \
  --error "误删了不该删的文件"

# 记录子代理完成
bash scripts/log-reflection.sh subagent \
  --task "调研 OKX API 费率" \
  --outcome "完成，发现文档与实际返回值有差异" \
  --lessons "API 返回格式需要先验证"

# 查看今日反思
bash scripts/log-reflection.sh cat

# 初始化目录
bash scripts/log-reflection.sh init
```

## Hook 自动触发格式

当 OpenClaw 调用 hook 时，`log-reflection.sh` 会自动从环境变量和参数中提取信息并记录。

## 反思条目格式

```markdown
## [23:45:12] ❌ tool_failure — exec

| 字段 | 内容 |
|------|------|
| **情境** | 执行 rm -rf /tmp/test |
| **决策** | 未确认路径是否正确 |
| **结果** | 误删了不该删的文件 |
| **教训** | 危险命令执行前必须警告用户确认 |
```

## 文件结构

```
auto-reflection/
├── SKILL.md                   ← Skill 定义
├── README.md                  ← 本文档
├── install.sh                 ← 一键安装脚本
├── .hook-config.yaml          ← Hook 配置片段
├── scripts/
│   └── log-reflection.sh      ← 快捷记录脚本（核心）
└── src/
    ├── reflection-logger.ts    ← TS 版记录器（功能完整）
    └── lesson-generator.ts     ← 经验提炼工具
```

## 同步到 GitHub

```bash
cd ~/research/openclaw-hermes-claude
cp -r ~/.openclaw/workspace/skills/auto-reflection skills/
git add skills/auto-reflection/ && git commit -m "feat: auto-reflection skill"
```
