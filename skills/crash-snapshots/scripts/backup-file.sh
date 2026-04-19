#!/bin/bash
#
# crash-snapshots 备份脚本 (Bash 独立版)
# 用于 hook 调用或手动触发。
# 自动检测 tsx/npx 来运行 backup.ts
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_TS="$SKILL_DIR/src/backup.ts"

# 检测 tsx
if command -v tsx &>/dev/null; then
  TSX_CMD="tsx"
elif command -v npx &>/dev/null; then
  TSX_CMD="npx tsx"
else
  echo "❌ 错误: 未找到 tsx 或 npx，请先运行 install.sh 安装依赖"
  exit 1
fi

# 直接透传所有参数给 backup.ts
exec "$TSX_CMD" "$BACKUP_TS" "$@"
