#!/usr/bin/env bash
# context-compress install.sh
# 一键安装 context-compress skill

set -e

SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCLAW_SKILLS_DIR="${OPENCLAW_SKILLS_DIR:-$HOME/.openclaw/skills}"
TARGET_DIR="$OPENCLAW_SKILLS_DIR/context-compress"

echo "📦 Installing context-compress to $TARGET_DIR ..."

# 复制 skill 文件
mkdir -p "$TARGET_DIR/scripts"
cp "$SKILL_DIR/SKILL.md" "$TARGET_DIR/"
cp "$SKILL_DIR/README.md" "$TARGET_DIR/"
cp "$SKILL_DIR/src/compressor.ts" "$TARGET_DIR/src/"
cp "$SKILL_DIR/scripts/compress-context.sh" "$TARGET_DIR/scripts/"

# 确保脚本可执行
chmod +x "$TARGET_DIR/scripts/compress-context.sh"
chmod +x "$SKILL_DIR/scripts/compress-context.sh"

echo "✅ context-compress installed!"
echo ""
echo "⚠️  需要配置环境变量才能使用 LLM 压缩功能："
echo "   export SILICONFLOW_API_KEY=your_api_key"
echo ""
echo "📖 使用方式："
echo "   对小呆呆说：'压缩上下文' 或 'compact'"
echo "   或手动运行：$TARGET_DIR/scripts/compress-context.sh"
