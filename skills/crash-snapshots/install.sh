#!/bin/bash
#
# crash-snapshots 一键安装脚本
# 用法: bash <(curl -sL https://...) /path/to/skill
# 或直接: bash install.sh
#

set -e

SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_SCRIPT="$SKILL_DIR/scripts/backup-file.sh"

echo ""
echo "🛡️  crash-snapshots 安装程序"
echo "================================"

# ── 1. 验证环境 ──────────────────────────────────────
echo ""
echo "📋 检查环境..."

# 检查 node
if ! command -v node &>/dev/null; then
  echo "❌ 错误: 未找到 node，请先安装 Node.js"
  exit 1
fi

# 检查 tsx (用于运行 .ts 文件)
if ! command -v tsx &>/dev/null; then
  echo "⚙️  安装 tsx (用于运行 TypeScript 脚本)..."
  npm install -g tsx 2>/dev/null || npx --yes tsx --version &>/dev/null || true
fi

# 检查 tsx 或 npx 可用
if ! command -v tsx &>/dev/null && ! command -v npx &>/dev/null; then
  echo "❌ 错误: 未找到 tsx 或 npx"
  exit 1
fi

# ── 2. 设置文件权限 ──────────────────────────────────
echo ""
echo "🔧 设置文件权限..."
chmod +x "$SKILL_DIR/install.sh" 2>/dev/null || true
chmod +x "$BACKUP_SCRIPT" 2>/dev/null || true
chmod +x "$SKILL_DIR/src/backup.ts" 2>/dev/null || true

# ── 3. 验证备份脚本可运行 ─────────────────────────────
echo ""
echo "🧪 验证安装..."

# 用 tsx 运行备份脚本的 --version 或 --help
if command -v tsx &>/dev/null; then
  TSX_CMD="tsx"
elif command -v npx &>/dev/null; then
  TSX_CMD="npx tsx"
fi

# 测试 tsx 能运行 backup.ts (用 --help 参数)
if "$TSX_CMD" "$SKILL_DIR/src/backup.ts" --help 2>&1 | grep -q "用法"; then
  echo "✅ backup.ts 运行正常 (tsx)"
else
  # 尝试直接 node 运行（如果已有编译后的 js）
  if [ -f "$SKILL_DIR/dist/backup.js" ]; then
    node "$SKILL_DIR/dist/backup.js" --help &>/dev/null && echo "✅ backup.js (编译版) 运行正常" || echo "⚠️  backup.js 运行失败"
  else
    echo "⚠️  警告: 无法验证 backup.ts，请确保 tsx 已安装: npm install -g tsx"
  fi
fi

# 测试 bash 脚本
if "$BACKUP_SCRIPT" --help 2>&1 | grep -q "用法"; then
  echo "✅ backup-file.sh 运行正常"
else
  echo "⚠️  警告: backup-file.sh 运行失败"
fi

# ── 4. 输出结果 ──────────────────────────────────────
echo ""
echo "================================"
echo "✅ crash-snapshots 安装完成！"
echo ""
echo "📁 安装位置: $SKILL_DIR"
echo ""
echo "📖 使用方式:"
echo "   1. 手动备份单个文件:"
echo "      $BACKUP_SCRIPT /path/to/file.txt"
echo ""
echo "   2. 手动备份多个文件:"
echo "      $BACKUP_SCRIPT file1.ts file2.md"
echo ""
echo "   3. 通过 hook 自动备份:"
echo "      在 OpenClaw 配置文件添加 hook (见 SKILL.md)"
echo ""
echo "   4. 列出备份:"
echo "      ls ~/.openclaw/backups/"
echo ""
echo "📖 详细文档: $SKILL_DIR/SKILL.md"
echo ""
