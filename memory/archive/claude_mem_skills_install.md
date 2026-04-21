# claude-mem Skills 安装报告

## 问题原因

`claude-mem` 插件的 skills 文件位于 `plugin/skills/` 子目录下：
- `~/.openclaw/extensions/claude-mem/plugin/skills/make-plan/SKILL.md`
- `~/.openclaw/extensions/claude-mem/plugin/skills/do/SKILL.md`

但 OpenClaw 在加载插件 skills 时，直接在扩展根目录查找：
- `~/.openclaw/extensions/claude-mem/skills/make-plan`
- `~/.openclaw/extensions/claude-mem/skills/do`

`plugin/` 子目录被忽略了，导致 `plugin skill path not found` 警告。

## 修复方案

在扩展根目录创建 `skills/` 目录，并通过符号链接指向 `plugin/skills/` 下的实际 skill 目录：

```bash
EXTENSION_DIR="/Users/ec/.openclaw/extensions/claude-mem"
mkdir -p "$EXTENSION_DIR/skills"
for skill in do knowledge-agent make-plan mem-search smart-explore timeline-report version-bump; do
  ln -sf "../plugin/skills/$skill" "$EXTENSION_DIR/skills/$skill"
done
```

创建的 symlinks：
- `do` → `../plugin/skills/do`
- `knowledge-agent` → `../plugin/skills/knowledge-agent`
- `make-plan` → `../plugin/skills/make-plan`
- `mem-search` → `../plugin/skills/mem-search`
- `smart-explore` → `../plugin/skills/smart-explore`
- `timeline-report` → `../plugin/skills/timeline-report`
- `version-bump` → `../plugin/skills/version-bump`

## 验证结果

```bash
$ openclaw skills list 2>&1 | grep -c "plugin skill path not found"
0
```

- `make-plan` → ✓ ready (openclaw-extra)
- `do` → ✓ ready (openclaw-extra)

**警告已消失，skills 已正常加载。**

## 根本原因分析

`openclaw.plugin.json` 中声明的路径：
```json
"skills": ["skills/make-plan", "skills/do"]
```

OpenClaw 在解析时直接拼接为 `{extension_root}/skills/make-plan`，但实际上 skills 藏在 `plugin/skills/` 子目录里。这可能是插件打包时的一个 bug —— 正确的结构应该是在扩展根目录下有 `skills/` 目录，而不是嵌套在 `plugin/` 下。Symlink 方式是最小改动、最安全的修复。
