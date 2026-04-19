#!/bin/bash
# Coordinator 模式激活脚本
# 用法: bash activate-coordinator.sh
# 然后复制输出的 prompt 内容到当前 session 的 system prompt

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
PROMPT_FILE="$SKILL_DIR/src/coordinator-prompt.ts"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "❌ 未找到 coordinator-prompt.ts: $PROMPT_FILE"
  exit 1
fi

echo ""
echo "🔄 Coordinator 模式激活"
echo "========================"
echo ""
echo "Coordinator Prompt 内容（复制以下全部内容到 session system prompt）："
echo ""
echo "---COORDINATOR-PROMPT-START---"

# 提取 TS 文件中的 prompt 字符串（去掉 export 语句）
node -e "
const fs = require('fs');
const content = fs.readFileSync('$PROMPT_FILE', 'utf-8');
// 去掉 export const XXX = \` 和最后的 \`; 以及 export default
const match = content.match(/\/\*\*[\s\S]*?\`([\s\S]*?)\`\s*export/m);
if (match) {
  console.log(match[1].trim());
} else {
  // fallback: 直接输出去掉头尾的内容
  const lines = content.split('\n');
  let inBlock = false;
  let result = [];
  for (const line of lines) {
    if (line.includes('\`')) {
      if (!inBlock) { inBlock = true; continue; }
      else break;
    }
    if (inBlock) result.push(line);
  }
  console.log(result.join('\n').trim());
}
"

echo ""
echo "---COORDINATOR-PROMPT-END---"
echo ""
echo "📋 操作步骤："
echo "  1. 复制上面 ---COORDINATOR-PROMPT-START--- 和 ---COORDINATOR-PROMPT-END--- 之间的全部内容"
echo "  2. 在当前 OpenClaw session 中用/system-prompt 命令或通过 skill 激活接口替换 system prompt"
echo ""
echo "💡 提示：直接对 EC（小呆呆）说「进入协调模式」即可自动加载"
