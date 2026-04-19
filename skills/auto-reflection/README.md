# Auto-Reflection Skill

自动反思系统，为 OpenClaw 提供 C3/C6/H3 能力：

- **C3 Task Notification** — 子代理完成时通知主会话
- **C6 并发执行优化** — 并行 subagent 的经验记录
- **H3 内置自动反思** — 错误自动记录 + 决策经验提炼

---

## 安装

```bash
# skill 目录已存在于:
~/.openclaw/workspace/skills/auto-reflection/
```

无需额外安装，OpenClaw 会自动扫描 skills 目录。

---

## 文件结构

```
auto-reflection/
├── SKILL.md                  # Skill 定义
├── README.md                  # 本文件
└── src/
    ├── reflection-logger.ts   # 记录反思条目
    └── lesson-generator.ts    # 从错误提炼经验
```

---

## 使用方法

### 记录工具执行结果

```bash
npx ts-node src/reflection-logger.ts log \
  --type tool_failure \
  --tool exec \
  --context "执行 rm -rf /tmp/test" \
  --decision "未确认路径是否正确" \
  --result "误删了不该删的文件" \
  --lessons "危险命令执行前必须警告用户确认"
```

### 记录子代理完成

```bash
npx ts-node src/reflection-logger.ts subagent \
  --task "调研 OKX API 费率" \
  --outcome "完成，发现官方文档与实际返回值有差异" \
  --lessons "API 返回格式需要先验证"
```

### Hook 模式（OpenClaw 集成）

```bash
# 工具执行后自动调用
npx ts-node src/reflection-logger.ts hook \
  --type tool_result \
  --tool exec \
  --success false \
  --error "Permission denied"
```

### 提炼经验教训（近7天）

```bash
npx ts-node src/lesson-generator.ts distill --days 7
```

### 自我诊断

```bash
npx ts-node src/lesson-generator.ts diagnose
```

### 查看今日反思

```bash
npx ts-node src/reflection-logger.ts cat
```

---

## 存储位置

| 类型 | 路径 |
|------|------|
| 每日反思 | `memory/reflections/YYYY-MM-DD.md` |
| 提炼经验 | `memory/reflections/lessons.md` |
| 统计摘要 | `memory/reflections/summary.md` |

---

## OpenClaw Hook 集成配置

在 `~/.openclaw/config.yaml` 中添加：

```yaml
hooks:
  after_tool: "npx ts-node ~/.openclaw/workspace/skills/auto-reflection/src/reflection-logger.ts hook"
```

或者通过 `crontab` 定期运行诊断：

```cron
0 2 * * * cd ~/.openclaw && npx ts-node skills/auto-reflection/src/lesson-generator.ts distill --days 7
```

---

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

---

## 经验教训格式

```markdown
## 高风险教训（需立即遵守）

- 🔴 **执行 shell 命令前应检查命令意图，危险命令需警告确认**
  触发: exec 命令执行失败
  行动: 对 exec 调用进行安全检查，特别是 rm -rf、chmod 777、/etc/ 等路径
```
