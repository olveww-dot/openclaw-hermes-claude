#!/usr/bin/env bash
# lsp-client install.sh
# 一键安装 lsp-client skill

set -e

SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCLAW_SKILLS_DIR="${OPENCLAW_SKILLS_DIR:-$HOME/.openclaw/skills}"
TARGET_DIR="$OPENCLAW_SKILLS_DIR/lsp-client"

echo "📦 Installing lsp-client to $TARGET_DIR ..."

# 复制 skill 文件
mkdir -p "$TARGET_DIR/scripts"
cp "$SKILL_DIR/SKILL.md" "$TARGET_DIR/"
cp "$SKILL_DIR/README.md" "$TARGET_DIR/"
cp -r "$SKILL_DIR/src/" "$TARGET_DIR/"
cp "$SKILL_DIR/scripts/test-lsp.sh" "$TARGET_DIR/scripts/"

# 确保脚本可执行
chmod +x "$TARGET_DIR/scripts/test-lsp.sh"
chmod +x "$SKILL_DIR/scripts/test-lsp.sh"

echo "✅ lsp-client installed!"
echo ""
echo "⚠️  重要：你需要先安装 LSP 服务器！"
echo ""
echo "支持的语言和安装命令："
echo "  TypeScript/JS:  npm i -g typescript-language-server"
echo "  Python:          pip install pyright"
echo "  Rust:            rustup component add rust-analyzer"
echo "  Go:              go install golang.org/x/tools/gopls@latest"
echo "  C/C++:           clangd (via LLVM or package manager)"
echo ""
echo "🔧 安装后验证："
echo "   $TARGET_DIR/scripts/test-lsp.sh --check-all"
echo ""
echo "📖 使用方式："
echo "   对小呆呆说：'跳转到定义 main.ts:10:5'"
echo "             '查找引用 app.ts:5:10'"
echo "             '悬停提示 index.ts:20:3'"
echo "             '符号搜索 main.ts'"
