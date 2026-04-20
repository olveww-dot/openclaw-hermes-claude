#!/bin/bash
# Auto-Reflection Skill — 一键安装脚本
# 用法: bash install.sh

set -e

SKILL_NAME="auto-reflection"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="${OPENCLAW_WORKSPACE:-${HOME}/.openclaw/workspace}"
TARGET_DIR="$WORKSPACE/skills/$SKILL_NAME"
SKILL_TARGET="$SKILL_DIR"
# RESEARCH_DIR is no longer hardcoded - use SKILL_DIR which is dynamic
REFLECTIONS_DIR="$WORKSPACE/memory/reflections"

echo "📦 安装 Auto-Reflection Skill..."

# 1. 创建目录结构
mkdir -p "$TARGET_DIR/scripts"
mkdir -p "$TARGET_DIR/memory/reflections"
mkdir -p "$TARGET_DIR/src"

# 2. 复制所有文件
cp "$SRC_DIR/SKILL.md" "$TARGET_DIR/"
cp "$SRC_DIR/README.md" "$TARGET_DIR/"
cp "$SRC_DIR/install.sh" "$TARGET_DIR/"

# 复制 src/ 内容
cp "$SRC_DIR/src/"* "$TARGET_DIR/src/"

# 复制 scripts/
cp "$SRC_DIR/scripts/"* "$TARGET_DIR/scripts/" 2>/dev/null || true

# 3. 创建 memory/reflections/ 目录结构（workspace 级）
mkdir -p "$REFLECTIONS_DIR"
touch "$REFLECTIONS_DIR/.gitkeep"

# 4. 设置执行权限
chmod +x "$TARGET_DIR/install.sh"
chmod +x "$TARGET_DIR/scripts/log-reflection.sh" 2>/dev/null || true

# 5. 生成 OpenClaw hook 配置片段
HOOK_CONFIG="$TARGET_DIR/.hook-config.yaml"
cat > "$HOOK_CONFIG" << 'EOF'
# === auto-reflection hook 配置 ===
# 将以下内容添加到 ~/.openclaw/config.yaml 的 hooks 下

hooks:
  after_tool: "bash ~/.openclaw/workspace/skills/auto-reflection/scripts/log-reflection.sh tool"
  after_subagent: "bash ~/.openclaw/workspace/skills/auto-reflection/scripts/log-reflection.sh subagent"
EOF

# 6. 同步到 research 目录
if [ -d "$RESEARCH_DIR/../.." ]; then
  rsync -a --exclude='.git' --exclude='memory/' "$TARGET_DIR/" "$RESEARCH_DIR/" 2>/dev/null || {
    echo "⚠️  research 目录同步失败，跳过"
  }
  echo "✅ 已同步到 $RESEARCH_DIR"
fi

echo ""
echo "✅ Auto-Reflection Skill 安装完成！"
echo ""
echo "📂 目录结构："
echo "  $TARGET_DIR/"
echo "  $TARGET_DIR/scripts/log-reflection.sh"
echo "  $TARGET_DIR/src/reflection-logger.ts"
echo "  $TARGET_DIR/src/lesson-generator.ts"
echo ""
echo "💾 反思存储："
echo "  $REFLECTIONS_DIR/YYYY-MM-DD.md"
echo ""
echo "🪝 Hook 配置（添加到 ~/.openclaw/config.yaml）："
echo ""
cat "$HOOK_CONFIG"
echo ""
echo "📝 手动记录反思："
echo "  bash $TARGET_DIR/scripts/log-reflection.sh tool --success false --tool exec --context '...'"
echo ""
echo "📖 查看今日反思："
echo "  bash $TARGET_DIR/scripts/log-reflection.sh cat"
