#!/usr/bin/env bash
# auto-distill/scripts/distill-session.sh
# 独立运行脚本 — 从 hook 或 cron 调用
#
# 用法:
#   bash ~/research/openclaw-hermes-claude/skills/auto-distill/scripts/distill-session.sh
#
# 环境变量（优先级从高到低）:
#   SILICONFLOW_API_KEY   — API Key
#   OPENCLAW_SESSION_JSON — 会话 JSON 路径
#   MEMORY_PATH           — MEMORY.md 路径
#
set -e

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="${SKILL_DIR}/config.json"
REFLECTIONS_DIR="${HOME}/.openclaw/workspace/memory/reflections"

# 读取 config.json（如果存在）
if [ -f "$CONFIG_FILE" ]; then
  _cfg_key=$(python3 -c "
import json, sys
try:
    d=json.load(open('${CONFIG_FILE}'))
    print(d.get('siliconflow_api_key',''))
except:
    print('')
" 2>/dev/null)
  _cfg_mem=$(python3 -c "
import json, sys
try:
    d=json.load(open('${CONFIG_FILE}'))
    print(d.get('memory_path',''))
except:
    print('')
" 2>/dev/null)
  _cfg_ses=$(python3 -c "
import json, sys
try:
    d=json.load(open('${CONFIG_FILE}'))
    print(d.get('session_json',''))
except:
    print('')
" 2>/dev/null)
  SILICONFLOW_API_KEY="${SILICONFLOW_API_KEY:-${_cfg_key}}"
  MEMORY_PATH="${MEMORY_PATH:-${_cfg_mem}}"
  SESSION_JSON="${OPENCLAW_SESSION_JSON:-${_cfg_ses}}"
fi

# 默认值
SILICONFLOW_API_KEY="${SILICONFLOW_API_KEY:-sk-cp-2nm48iYywu6lfibn8wAH8g6h4EYTffEaPGQmPo4WA2Y3ByiX1eJrp5eu6EExhvYYt6SwT0NAzPR5vdYTbn50421vojSNeQO4P1fPEmUsU8jXVO1NQYYqQZY}"
MEMORY_PATH="${MEMORY_PATH:-${HOME}/.openclaw/workspace/MEMORY.md}"
SESSION_JSON="${OPENCLAW_SESSION_JSON:-${HOME}/.openclaw/sessions/current/session.json}"

# 尝试定位 session.json（支持 current 和最近目录）
locate_session() {
  if [ -f "$SESSION_JSON" ]; then
    echo "$SESSION_JSON"
    return
  fi

  # 尝试 recent sessions
  local recent_dir="${HOME}/.openclaw/sessions"
  if [ -d "$recent_dir" ]; then
    local latest
    latest=$(find "$recent_dir" -name "session.json" -type f 2>/dev/null | xargs -r ls -t 2>/dev/null | head -1)
    if [ -n "$latest" ]; then
      echo "$latest"
      return
    fi
  fi

  echo ""
}

SESSION_FILE="$(locate_session)"

echo "[auto-distill] 开始 distill..."
echo "[auto-distill] 会话文件: ${SESSION_FILE:-未找到}"
echo "[auto-distill] MEMORY文件: ${MEMORY_PATH}"

if [ -z "$SESSION_FILE" ]; then
  echo "[auto-distill] 错误: 找不到 session.json"
  exit 1
fi

# 读取消息（从 Python 处理 JSON）
read_messages() {
  python3 << 'PYEOF'
import json
import sys
import os

session_file = os.environ.get('SESSION_FILE', '')
if not session_file or not os.path.exists(session_file):
    print("[]")
    sys.exit(0)

try:
    with open(session_file, 'r') as f:
        data = json.load(f)

    messages = []

    # 支持多种格式
    def extract(obj):
        if isinstance(obj, list):
            for m in obj:
                extract(m)
        elif isinstance(obj, dict):
            if 'role' in obj and 'content' in obj:
                content = obj.get('content', '')
                if content:
                    messages.append({
                        'role': obj.get('role', 'unknown'),
                        'content': content
                    })
            elif 'messages' in obj:
                extract(obj['messages'])
            elif 'history' in obj:
                extract(obj['history'])
            elif 'events' in obj:
                for e in obj['events']:
                    if e.get('type') in ('message', 'text'):
                        c = e.get('content') or e.get('text', '')
                        if c:
                            messages.append({
                                'role': e.get('role', e.get('speaker', 'unknown')),
                                'content': c
                            })

    extract(data)

    # 只取最近50条
    messages = messages[-50:]

    print(json.dumps(messages, ensure_ascii=False))

except Exception as e:
    print(f"[]", file=sys.stderr)
    print(f"读取错误: {e}", file=sys.stderr)
    sys.exit(0)
PYEOF
}

MESSAGES_JSON=$(read_messages)
MSG_COUNT=$(echo "$MESSAGES_JSON" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

echo "[auto-distill] 读取到 ${MSG_COUNT} 条消息"

if [ "$MSG_COUNT" -eq 0 ] 2>/dev/null; then
  echo "[auto-distill] 无消息可处理，退出"
  exit 0
fi

# 调用 SiliconFlow API 提炼
DISTILLED=$(python3 << 'PYEOF'
import json
import os
import sys

api_key = os.environ.get('SILICONFLOW_API_KEY', '')
messages_raw = os.environ.get('MESSAGES_JSON', '[]')

try:
    messages = json.loads(messages_raw)
except:
    messages = []

if not messages:
    print("## [无对话内容]\n\n- 会话为空或无法读取\n")
    sys.exit(0)

# 构建对话文本
conversation = "\n\n".join(
    f"[{m['role']}] {m['content']}" for m in messages[-50:]
)

today = __import__('datetime').datetime.now().strftime('%Y-%m-%d')

prompt = f"""你是一个 AI 助手的记忆整理助手。请从以下对话中提炼关键信息，输出结构化的 Markdown 格式。

## 要求
1. 提取用户的关键需求、问题、决策
2. 提取助手提供的关键方案、答案、建议
3. 标注未完成的事项（待办）
4. 用简洁的要点，不用完整句子
5. 只输出 Markdown，不要有解释

## 对话内容
{conversation}

## 输出格式（只输出这个格式，不要输出其他内容）
## [{today}]

### 对话摘要
- 要点1
- 要点2

### 关键决策
- 决策1（如果有）

### 待办/后续
- 待办1（如果有）
"""

import urllib.request

req = urllib.request.Request(
    'https://api.siliconflow.cn/v1/chat/completions',
    data=json.dumps({
        'model': 'deepseek-ai/DeepSeek-V3',
        'messages': [
            {'role': 'system', 'content': '你是一个精确的记忆整理助手，只输出指定的 Markdown 格式，不要有前缀解释。'},
            {'role': 'user', 'content': prompt}
        ],
        'temperature': 0.3,
        'max_tokens': 2000
    }).encode('utf-8'),
    headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
        content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
        print(content)
except Exception as e:
    print(f"API 错误: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF
)

echo "[auto-distill] LLM 提炼完成:"

# 追加到 MEMORY.md
python3 << PYEOF
import os
import json

memory_path = os.environ.get('MEMORY_PATH', '${HOME}/.openclaw/workspace/MEMORY.md')
distilled = '''${DISTILLED}'''.strip()

if not distilled:
    print("[auto-distill] 提炼内容为空，跳过")
    exit(0)

# 确保目录存在
os.makedirs(os.path.dirname(memory_path), exist_ok=True)

# 如果文件不存在，创建初始文件
if not os.path.exists(memory_path):
    header = """# MEMORY.md — Long-term Memory

_Last updated: {date}_

---
""".format(date=__import__('datetime').datetime.now().isoformat())
    with open(memory_path, 'w', encoding='utf-8') as f:
        f.write(header)

existing = open(memory_path, 'r', encoding='utf-8').read()

# 检查今天是否已写入（避免重复）
from datetime import datetime
today = datetime.now().strftime('%Y-%m-%d')
import re
if re.search(rf'## \[{re.escape(today)}\]', existing):
    print(f"[auto-distill] {today} 的记忆已存在，跳过重复写入")
else:
    separator = '\n---\n' if '\n---\n' in existing else '\n'
    new_content = existing.rstrip() + separator + distilled + '\n'
    open(memory_path, 'w', encoding='utf-8').write(new_content)
    print(f"[auto-distill] 已追加记忆到 {memory_path}")

# 同时保存一份到 reflections/
reflections_dir = os.environ.get('REFLECTIONS_DIR', '${HOME}/.openclaw/workspace/memory/reflections')
if reflections_dir:
    os.makedirs(reflections_dir, exist_ok=True)
    from datetime import datetime
    date_str = datetime.now().strftime('%Y-%m-%d_%H%M%S')
    refl_file = os.path.join(reflections_dir, f'{date_str}.md')
    with open(refl_file, 'w', encoding='utf-8') as f:
        f.write(f"# Reflection — {date_str}\n\n")
        f.write(distilled)
    print(f"[auto-distill] 已保存 reflection: {refl_file}")
PYEOF

echo "[auto-distill] 完成!"
