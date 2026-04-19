#!/bin/bash
# log-reflection.sh — 反思记录快捷脚本
# 用法:
#   bash log-reflection.sh tool [--success true|false] [--tool name] [--context "..."] [--decision "..."] [--error "..."]
#   bash log-reflection.sh subagent [--task "..."] [--outcome "..."] [--lessons "..."]
#   bash log-reflection.sh cat
#   bash log-reflection.sh init

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE="${OPENCLAW_WORKSPACE:-/Users/ec/.openclaw/workspace}"
REFLECTIONS_DIR="$WORKSPACE/memory/reflections"

# 初始化目录
init() {
  mkdir -p "$REFLECTIONS_DIR"
  echo "✅ 反思目录已创建: $REFLECTIONS_DIR"
  exit 0
}

# 记录反思
log_tool() {
  local success="true"
  local tool=""
  local context=""
  local decision=""
  local error_msg=""

  while [[ $# -gt 0 ]]; do
    case $1 in
      --success) success="$2"; shift 2 ;;
      --tool) tool="$2"; shift 2 ;;
      --context) context="$2"; shift 2 ;;
      --decision) decision="$2"; shift 2 ;;
      --error) error_msg="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  local type="tool_success"
  if [ "$success" = "false" ]; then
    type="tool_failure"
  fi

  # 检查是否有 ts-node
  if command -v npx &>/dev/null; then
    npx ts-node --skip-project "$SKILL_DIR/src/reflection-logger.ts" log \
      --type "$type" \
      --tool "$tool" \
      --context "$context" \
      --decision "$decision" \
      --result "$( [ "$success" = "true" ] && echo "执行成功" || echo "$error_msg" )" \
      --lessons "$( [ "$success" = "false" ] && echo "错误: $error_msg" || echo "" )" \
      2>/dev/null || fallback_log_tool "$type" "$tool" "$context" "$decision" "$error_msg"
  else
    fallback_log_tool "$type" "$tool" "$context" "$decision" "$error_msg"
  fi
}

fallback_log_tool() {
  local type="$1"; shift
  local tool="$1"; shift
  local context="$1"; shift
  local decision="$1"; shift
  local error_msg="$1"

  mkdir -p "$REFLECTIONS_DIR"
  local date="$(date '+%Y-%m-%d')"
  local time="$(date '+%H:%M:%S')"
  local emoji="✅"
  if [ "$type" = "tool_failure" ]; then emoji="❌"; fi

  local file="$REFLECTIONS_DIR/${date}.md"
  if [ ! -f "$file" ]; then
    echo "# 反思记录 — $date" >> "$file"
    echo "" >> "$file"
  fi

  cat >> "$file" << EOF
## [$time] $emoji $type — ${tool:-unknown}

| 字段 | 内容 |
|------|------|
| **情境** | ${context:-—} |
| **决策** | ${decision:-—} |
| **结果** | $([ "$type" = "tool_success" ] && echo "执行成功" || echo "$error_msg") |
| **教训** | $([ "$type" = "tool_failure" ] && echo "错误: $error_msg" || echo "—") |

---
EOF
  echo "📝 反思已记录: $file"
}

log_subagent() {
  local task=""
  local outcome=""
  local lessons=""

  while [[ $# -gt 0 ]]; do
    case $1 in
      --task) task="$2"; shift 2 ;;
      --outcome) outcome="$2"; shift 2 ;;
      --lessons) lessons="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  if command -v npx &>/dev/null; then
    npx ts-node --skip-project "$SKILL_DIR/src/reflection-logger.ts" subagent \
      --task "$task" \
      --outcome "$outcome" \
      --lessons "$lessons" \
      2>/dev/null || fallback_log_subagent "$task" "$outcome" "$lessons"
  else
    fallback_log_subagent "$task" "$outcome" "$lessons"
  fi
}

fallback_log_subagent() {
  local task="$1"; shift
  local outcome="$1"; shift
  local lessons="$1"

  mkdir -p "$REFLECTIONS_DIR"
  local date="$(date '+%Y-%m-%d')"
  local time="$(date '+%H:%M:%S')"

  local file="$REFLECTIONS_DIR/${date}.md"
  if [ ! -f "$file" ]; then
    echo "# 反思记录 — $date" >> "$file"
    echo "" >> "$file"
  fi

  cat >> "$file" << EOF
## [$time] 🤖 subagent_complete — ${task:-unknown}

| 字段 | 内容 |
|------|------|
| **任务** | ${task:-—} |
| **结果** | ${outcome:-—} |
| **经验** | ${lessons:-—} |

---
EOF
  echo "📝 反思已记录: $file"
}

cat_today() {
  local date="$(date '+%Y-%m-%d')"
  local file="$REFLECTIONS_DIR/${date}.md"
  if [ -f "$file" ]; then
    cat "$file"
  else
    echo "今日暂无反思记录"
  fi
}

# 主入口
CMD="${1:-}"
case "$CMD" in
  init)
    init
    ;;
  tool)
    shift; log_tool "$@"
    ;;
  subagent)
    shift; log_subagent "$@"
    ;;
  cat)
    cat_today
    ;;
  *)
    echo "用法:"
    echo "  bash log-reflection.sh init                      # 初始化反思目录"
    echo "  bash log-reflection.sh tool --success false --tool exec --context '...' --decision '...' --error '...'"
    echo "  bash log-reflection.sh subagent --task '...' --outcome '...' --lessons '...'"
    echo "  bash log-reflection.sh cat                       # 查看今日反思"
    ;;
esac
