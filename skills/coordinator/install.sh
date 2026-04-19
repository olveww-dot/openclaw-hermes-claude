#!/bin/bash
# Coordinator Skill — 一键安装脚本
# 用法: bash install.sh

set -e

SKILL_NAME="coordinator"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="${OPENCLAW_WORKSPACE:-/Users/ec/.openclaw/workspace}"
TARGET_DIR="$WORKSPACE/skills/$SKILL_NAME"
RESEARCH_DIR="/Users/ec/research/openclaw-hermes-claude/skills/$SKILL_NAME"

echo "📦 安装 Coordinator Skill..."

# 1. 创建目标目录
mkdir -p "$TARGET_DIR/scripts"

# 2. 复制文件（保留 src/ 原有结构）
cp "$SRC_DIR/SKILL.md" "$TARGET_DIR/"
cp "$SRC_DIR/README.md" "$TARGET_DIR/"
cp "$SRC_DIR/install.sh" "$TARGET_DIR/"

# 复制 src/ 目录内容
mkdir -p "$TARGET_DIR/src"
cp "$SRC_DIR/src/"* "$TARGET_DIR/src/"

# 3. 创建 scripts/
cp "$SRC_DIR/scripts/"* "$TARGET_DIR/scripts/" 2>/dev/null || true

# 4. 设置执行权限
chmod +x "$TARGET_DIR/install.sh"
chmod +x "$TARGET_DIR/scripts/activate-coordinator.sh" 2>/dev/null || true

# 5. 同步到 research 目录
if [ -d "$RESEARCH_DIR/../.." ]; then
  rsync -a --exclude='.git' "$TARGET_DIR/" "$RESEARCH_DIR/" 2>/dev/null || {
    echo "⚠️  research 目录同步失败，跳过（可能目录不存在）"
  }
  echo "✅ 已同步到 $RESEARCH_DIR"
fi

echo ""
echo "✅ Coordinator Skill 安装完成！"
echo ""
echo "激活方式："
echo "  bash $TARGET_DIR/scripts/activate-coordinator.sh"
echo ""
echo "或对 EC 说：进入协调模式"
