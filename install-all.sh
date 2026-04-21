#!/bin/bash
# OpenClaw Hermes-Claude Skills 一键安装脚本
# 用法: bash <(curl -fsSL https://raw.githubusercontent.com/olveww-dot/openclaw-hermes-claude/main/install-all.sh)

set -e

SKILLS_DIR="${HOME}/.openclaw/workspace/skills"
GITHUB_RAW="https://raw.githubusercontent.com/olveww-dot/openclaw-hermes-claude/main/skills"

echo "🛠️ OpenClaw Hermes-Claude Skills 安装器"
echo "========================================"
echo ""
echo "📂 安装目录: $SKILLS_DIR"
echo ""

mkdir -p "$SKILLS_DIR"

# 6个核心技能
SKILLS=(
  "crash-snapshots"
  "auto-distill"
  "coordinator"
  "context-compress"
  "lsp-client"
  "auto-reflection"
)

for skill in "${SKILLS[@]}"; do
  echo "📦 安装 $skill..."
  rm -rf "$SKILLS_DIR/$skill"
  curl -fsSL "$GITHUB_RAW/$skill.tar.gz" -o /tmp/$skill.tar.gz 2>/dev/null && \
    tar -xzf /tmp/$skill.tar.gz -C "$SKILLS_DIR" 2>/dev/null && \
    mv "$SKILLS_DIR/openclaw-hermes-claude-main/skills/$skill" "$SKILLS_DIR/$skill" 2>/dev/null && \
    rm -rf "$SKILLS_DIR/openclaw-hermes-claude-main" /tmp/$skill.tar.gz && \
    echo "  ✅ $skill" || \
    echo "  ⚠️  $skill (可能需要手动安装)"
done

echo ""
echo "========================================"
echo "✅ 安装完成！"
echo ""
echo "📖 使用方式："
echo "   • crash-snapshots — 说「备份 XXX」"
echo "   • auto-distill — 说「提炼记忆」"
echo "   • coordinator — 说「指挥官模式」"
echo "   • context-compress — 说「压缩上下文」"
echo "   • lsp-client — 代码跳转/查找引用"
echo "   • auto-reflection — 说「反思」"
echo ""
echo "📝 如需卸载：rm -rf $SKILLS_DIR/{crash-snapshots,auto-distill,coordinator,context-compress,lsp-client,auto-reflection}"
echo ""
