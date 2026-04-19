#!/usr/bin/env bash
# compress-context.sh — 手动触发上下文压缩
# 用法: ./compress-context.sh [openclaw_workspace_path]

set -e

WORKSPACE="${1:-$HOME/.openclaw/workspace}"
SESSIONS_DIR="$WORKSPACE/.sessions"
STATE_FILE="$WORKSPACE/STATE.md"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔍 检查上下文 ..."

# 检查是否有会话文件
if [ ! -d "$SESSIONS_DIR" ]; then
  echo "❌ 未找到会话目录: $SESSIONS_DIR"
  exit 1
fi

# 检查是否有 compressor.ts
if [ ! -f "$SKILL_DIR/src/compressor.ts" ]; then
  echo "❌ 未找到 compressor.ts: $SKILL_DIR/src/compressor.ts"
  exit 1
fi

# 检查环境变量
if [ -z "$SILICONFLOW_API_KEY" ]; then
  echo "⚠️  SILICONFLOW_API_KEY 未设置，LLM 压缩将不可用"
  echo "   export SILICONFLOW_API_KEY=your_api_key"
fi

echo "✅ 环境检查通过"
echo ""
echo "📋 上下文压缩需要在 OpenClaw 会话中调用 compressor.ts"
echo "   建议直接对小呆呆说：'压缩上下文'"
echo ""
echo "💡 压缩将通过五步算法处理："
echo "   1. Prune — 裁剪冗余工具输出"
echo "   2. Head  — 保护开头系统提示"
echo "   3. Tail  — 保护最近 ~20K tokens"
echo "   4. LLM   — DeepSeek-V3 生成摘要"
echo "   5. Iter  — 迭代更新摘要"
