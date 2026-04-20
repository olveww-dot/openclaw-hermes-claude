#!/usr/bin/env bash
# auto-distill/install.sh — 一键安装 auto-distill skill
#
# 功能:
#   1. 创建 memory/reflections/ 目录
#   2. 写入 config.json 配置文件
#   3. 在 openclaw.json 中注册 session:end hook
#   4. 验证安装
#
# 用法:
#   cd ~/research/openclaw-hermes-claude/skills/auto-distill
#   ./install.sh
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$SCRIPT_DIR"
CONFIG_DIR="${HOME}/.openclaw"
OPENCLAW_CONFIG="${CONFIG_DIR}/openclaw.json"
REFLECTIONS_DIR="${HOME}/.openclaw/workspace/memory/reflections"

echo "=========================================="
echo "  auto-distill 安装脚本"
echo "=========================================="

# 1. 创建 memory/reflections/ 目录
echo ""
echo "[1/4] 创建 memory/reflections/ 目录..."
mkdir -p "$REFLECTIONS_DIR"
echo "      ✓ $REFLECTIONS_DIR"

# 2. 创建 config.json
echo ""
echo "[2/4] 配置文件..."
CONFIG_FILE="${SKILL_DIR}/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  cp "${SKILL_DIR}/config.json.example" "$CONFIG_FILE" 2>/dev/null || true
fi
if [ -f "$CONFIG_FILE" ]; then
  echo "      ✓ config.json 已存在，跳过"
else
  # 从环境变量或 TOOLS.md 读取默认值
  SILICONFLOW_KEY="${SILICONFLOW_API_KEY:-}"
  MEMORY_PATH="${MEMORY_PATH:-${HOME}/.openclaw/workspace/MEMORY.md}"

  cat > "$CONFIG_FILE" << EOF
{
  "siliconflow_api_key": "${SILICONFLOW_KEY}",
  "memory_path": "${MEMORY_PATH}",
  "session_json": "${HOME}/.openclaw/sessions/current/session.json",
  "reflections_dir": "${REFLECTIONS_DIR}",
  "model": "deepseek-ai/DeepSeek-V3",
  "max_messages": 50
}
EOF
  echo "      ✓ config.json 已创建"
fi

# 3. 注册 session:end hook
echo ""
echo "[3/4] 注册 session:end hook..."

# 读取现有 openclaw.json
if [ ! -f "$OPENCLAW_CONFIG" ]; then
  echo "      ✗ openclaw.json 不存在: $OPENCLAW_CONFIG"
  exit 1
fi

# 检查是否已有 external hooks
if grep -q '"hooks"' "$OPENCLAW_CONFIG" && grep -q 'auto-distill' "$OPENCLAW_CONFIG"; then
else
  # 用 python3 添加 hook（保持 JSON 格式）
  python3 << 'PYEOF'
import json
import sys
import os

config_path = os.path.expanduser("~/.openclaw/openclaw.json")
with open(config_path, "r") as f:
    config = json.load(f)

# 添加 external hooks
if "hooks" not in config:
    config["hooks"] = {}

# 检查是否已有 session:end
if "session:end" not in config.get("hooks", {}):
    config["hooks"]["session:end"] = []

# 转换为数组形式（支持多个 hook）
hooks_list = config["hooks"]["session:end"]
if isinstance(hooks_list, str):
    hooks_list = [hooks_list]

# 添加 auto-distill hook（如果不存在）
hook_cmd = "bash \"" + SCRIPT_DIR + "/scripts/distill-session.sh\""
if hook_cmd not in hooks_list:
    hooks_list.append(hook_cmd)

config["hooks"]["session:end"] = hooks_list

with open(config_path, "w") as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

PYEOF
fi

# 4. 验证
echo ""
echo "[4/4] 验证安装..."
ERRORS=0

# 检查必需文件
for f in "src/distill.ts" "scripts/distill-session.sh" "config.json"; do
  if [ -f "${SKILL_DIR}/${f}" ]; then
    echo "      ✓ ${f}"
  else
    echo "      ✗ ${f} 不存在"
    ERRORS=$((ERRORS + 1))
  fi
done

# 检查 config.json 格式
if command -v python3 &> /dev/null; then
  python3 -c "import json; json.load(open('${CONFIG_FILE}'))" 2>/dev/null && echo "      ✓ config.json 格式正确" || echo "      ✗ config.json 格式错误"
fi

# 检查 hook
if grep -q "auto-distill" "$OPENCLAW_CONFIG" 2>/dev/null; then
  echo "      ✓ session:end hook 已配置"
else
  echo "      ✗ session:end hook 未找到"
  ERRORS=$((ERRORS + 1))
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "=========================================="
  echo "  ✓ 安装完成!"
  echo ""
  echo "  下次会话结束时，auto-distill 会自动运行。"
  echo "  你也可以手动触发:"
  echo "    bash ${SKILL_DIR}/scripts/distill-session.sh"
  echo "=========================================="
else
  echo "=========================================="
  echo "  ✗ 安装有问题，请检查上面错误"
  echo "=========================================="
  exit 1
fi
