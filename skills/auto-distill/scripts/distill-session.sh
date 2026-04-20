#!/usr/bin/env bash
# auto-distill/scripts/distill-session.sh
# 读取 stdin，提炼到 MEMORY.md
#
# 用法:
#   bash distill-session.sh < 对话.txt
#   echo "内容" | bash distill-session.sh
#   bash distill-session.sh <<< "对话内容"
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# 读取配置
SILICONFLOW_API_KEY="${SILICONFLOW_API_KEY:-}"
MEMORY_PATH="${MEMORY_PATH:-${HOME}/.openclaw/workspace/MEMORY.md}"

CONFIG_FILE="${SKILL_DIR}/config.json"
if [ -f "$CONFIG_FILE" ]; then
  API_FROM_CFG=$(python3 -c "import json; d=json.load(open('${CONFIG_FILE}')); print(d.get('siliconflow_api_key','') or '')" 2>/dev/null || echo "")
  MEM_FROM_CFG=$(python3 -c "import json; d=json.load(open('${CONFIG_FILE}')); print(d.get('memory_path','') or '')" 2>/dev/null || echo "")
  [ -z "$SILICONFLOW_API_KEY" ] && [ -n "$API_FROM_CFG" ] && SILICONFLOW_API_KEY="$API_FROM_CFG"
  [ -n "$MEM_FROM_CFG" ] && MEMORY_PATH="$MEM_FROM_CFG"
fi

SILICONFLOW_API_KEY="${SILICONFLOW_API_KEY:-sk-cp-2nm48iYywu6lfibn8wAH8g6h4EYTffEaPGQmPo4WA2Y3ByiX1eJrp5eu6EExhvYYt6SwT0NAzPR5vdYTbn50421vojSNeQO4P1fPEmUsU8jXVO1NQYYqQZY}"

echo "[auto-distill] 开始 distill..."

# 用 Python -c 方式，避免 heredoc 与 stdin redirect 冲突
# 读取 stdin 到临时文件，再由 Python 处理
TMPINPUT=$(mktemp)
cat > "$TMPINPUT"
python3 -c "
import sys, os, json, urllib.request, re
from datetime import datetime as dt

input_text = open('${TMPINPUT}').read().strip()
if not input_text or len(input_text) < 10:
    print('[auto-distill] 内容太短，退出')
    sys.exit(0)

print(f'[auto-distill] 读取到 {len(input_text)} 字符')

api_key = os.environ.get('SILICONFLOW_API_KEY','sk-cp-2nm48iYywu6lfibn8wAH8g6h4EYTffEaPGQmPo4WA2Y3ByiX1eJrp5eu6EExhvYYt6SwT0NAzPR5vdYTbn50421vojSNeQO4P1fPEmUsU8jXVO1NQYYqQZY')
today = dt.now().strftime('%Y-%m-%d')

prompt = f'''你是AI助手的记忆整理助手。从以下对话中提炼关键信息，输出结构化的Markdown。

要求：
1. 提取用户的关键需求、问题、决策
2. 提取助手提供的关键方案、答案、建议
3. 标注未完成的事项（待办）
4. 用简洁的要点
5. 只输出Markdown，不要前缀解释

对话内容：
{input_text[:8000]}

输出格式（只输出这个格式）：
## [{today}]

### 对话摘要
- 要点1
- 要点2

### 关键决策
- 决策1（如果有）

### 待办/后续
- 待办1（如果有）
'''

try:
    req = urllib.request.Request(
        'https://api.siliconflow.cn/v1/chat/completions',
        data=json.dumps({
            'model': 'deepseek-ai/DeepSeek-V3',
            'messages': [
                {'role': 'system', 'content': '你是精确的记忆整理助手，只输出指定Markdown格式。'},
                {'role': 'user', 'content': prompt}
            ],
            'temperature': 0.3,
            'max_tokens': 2000
        }).encode('utf-8'),
        headers={
            'Authorization': 'Bearer ' + api_key,
            'Content-Type': 'application/json'
        },
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
        distilled = result.get('choices', [{}])[0].get('message', {}).get('content', '')
        print(f'[auto-distill] 提炼完成，长度: {len(distilled)} 字符')
except Exception as e:
    print(f'[auto-distill] API错误: {e}', file=sys.stderr)
    sys.exit(1)

memory_path = os.environ.get('MEMORY_PATH', os.path.expanduser('~/.openclaw/workspace/MEMORY.md'))
os.makedirs(os.path.dirname(memory_path), exist_ok=True)
if not os.path.exists(memory_path):
    with open(memory_path, 'w') as f:
        f.write(f'# MEMORY.md — Long-term Memory\n\n_Last updated: {dt.now().isoformat()}_\n\n')

existing = open(memory_path).read()
if re.search(r'## \[' + today + r'\]', existing):
    print(f'[auto-distill] {today} 记忆已存在，跳过')
else:
    sep = '\n---\n' if existing.strip() else ''
    with open(memory_path, 'a') as f:
        f.write(sep + distilled.strip() + '\n')
    print(f'[auto-distill] 已追加到 {memory_path}')

print('[auto-distill] 完成!')
"

rm -f "$TMPINPUT"
