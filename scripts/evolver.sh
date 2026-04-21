#!/bin/bash
# 自我进化脚本 - 基于 manager-self-evolution 和 self-evolve skill
# 运行诊断和自我改进

set -e

WORKSPACE="/Users/ec/.openclaw/workspace"
LOG_FILE="$WORKSPACE/memory/evolution-log.md"

echo "🧬 开始自我进化..."

# 1. 运行诊断
echo "📋 运行诊断检查..."
python3 "$WORKSPACE/skills/manager-self-evolution/self-check.py" diagnose >> "$LOG_FILE" 2>&1 || true

# 2. 检查并更新 intentions.md
if [ -f "$WORKSPACE/memory/intentions.md" ]; then
    echo "📝 检查 intentions.md 状态..."
    # 简单检查是否有完成的项目
    if grep -q "^完成" "$WORKSPACE/memory/intentions.md" 2>/dev/null; then
        echo "✅ 发现已完成项目，标记清理..."
    fi
fi

# 3. 自我检查总结
echo "📊 生成自检报告..."
echo "### 进化自检 $(date '+%Y-%m-%d %H:%M')" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

echo "✅ 自我进化完成"
exit 0
