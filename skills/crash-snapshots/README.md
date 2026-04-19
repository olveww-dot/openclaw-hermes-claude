# Crash-Resistant Snapshots

🛡️ **每次 write/edit 前自动备份原文件，防止误操作导致文件丢失。**

---

## 安装

### 方法一：直接在 workspace skills 使用（推荐）

Skill 已安装在：
```
~/.openclaw/workspace/skills/crash-snapshots/
```

在 OpenClaw 对话中直接说：
```
"备份一下 src/app.ts"
"把 config.json 备份"
```

---

### 方法二：复制到全局 skills 目录

```bash
cp -r ~/.openclaw/workspace/skills/crash-snapshots ~/.openclaw/skills/
```

---

## 快速开始

### 备份文件

```bash
node ~/.openclaw/workspace/skills/crash-snapshots/src/backup.ts /path/to/file.txt
```

### 备份多个文件

```bash
node ~/.openclaw/workspace/skills/crash-snapshots/src/backup.ts file1.ts file2.md file3.json
```

---

## 自动备份工作流

### Agent 使用方式

每次修改重要文件前，告诉 Agent：
```
"帮我备份 xxx 文件再改"
```

Agent 会：
1. 调用 `backup.ts` 备份原文件到 `.openclaw/backups/`
2. 然后再执行 write/edit

### 手动触发

如果你要自己运行备份：

```bash
# 绝对路径
node ~/.openclaw/workspace/skills/crash-snapshots/src/backup.ts /Users/ec/project/src/app.ts

# 相对路径（相对于 workspace）
cd ~/.openclaw/workspace
node ~/.openclaw/workspace/skills/crash-snapshots/src/backup.ts src/app.ts
```

---

## 备份存储位置

```
{原文件所在目录}/
└── .openclaw/
    └── backups/
        ├── 2026-04-19_14-30-00_app.ts
        ├── 2026-04-19_15-45-00_app.ts
        └── ...
```

每个备份文件名包含精确到秒的时间戳，不会覆盖旧备份。

---

## 恢复备份

```bash
# 1. 找到备份文件
ls -lt /path/to/dir/.openclaw/backups/

# 2. 恢复（用 cp，不用 mv，保留备份）
cp /path/to/dir/.openclaw/backups/2026-04-19_14-30-00_app.ts /path/to/app.ts
```

---

## 规则

| 规则 | 说明 |
|------|------|
| ✅ 已存在文件 | 备份到 `.openclaw/backups/` |
| ❌ 新建文件 | 跳过（新文件无内容可备份） |
| ⏱️ 时间戳 | 精确到秒，不覆盖旧备份 |
| 📁 自动创建 | 备份目录不存在时自动创建 |

---

## 清理旧备份

备份文件会逐渐增多，建议定期清理：

```bash
# 删除 7 天前的备份
find ~/.openclaw -name ".openclaw" -type d -exec find {} -maxdepth 2 -name "backups" -type d \; 2>/dev/null | while read dir; do
  find "$dir" -mtime +7 -delete && echo "已清理: $dir"
done
```

---

## 常见问题

**Q: 为什么新文件不备份？**
A: 新文件没有历史内容，备份没有意义。备份是保护"修改"不是保护"新建"。

**Q: 备份等于版本控制吗？**
A: 不等于。备份是实时的、精细到单文件的。Git 是版本历史。建议两者结合使用。

**Q: 备份文件太多怎么办？**
A: 用上面的清理命令，或手动删除 `.openclaw/backups/` 下的旧文件。

---

## 版本

- **v1.0.0** (2026-04-19): 初始版本
