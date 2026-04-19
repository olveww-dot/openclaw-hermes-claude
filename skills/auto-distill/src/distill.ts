/**
 * auto-distill: T1 Auto Memory
 *
 * 每次会话结束后，自动 distill 对话内容到 MEMORY.md
 *
 * 环境变量:
 *   SILICONFLOW_API_KEY  - SiliconFlow API Key
 *   OPENCLAW_SESSION_JSON - 当前会话 JSON 文件路径
 *   MEMORY_PATH          - MEMORY.md 路径
 *
 * Hook 调用示例:
 *   openclaw run auto-distill
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============== 配置 ==============
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY ||
  'sk-cp-2nm48iYywu6lfibn8wAH8g6h4EYTffEaPGQmPo4WA2Y3ByiX1eJrp5eu6EExhvYYt6SwT0NAzPR5vdYTbn50421vojSNeQO4P1fPEmUsU8jXVO1NQYYqQZY'; // fallback TOOLS.md key

const SESSION_JSON = process.env.OPENCLAW_SESSION_JSON ||
  path.join(process.env.HOME || '', '.openclaw', 'sessions', 'current', 'session.json');

const MEMORY_PATH = process.env.MEMORY_PATH ||
  path.join(process.env.HOME || '', '.openclaw', 'workspace', 'MEMORY.md');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============== 读取会话消息 ==============
interface Message {
  role: string;
  content: string;
  timestamp?: string;
}

function readSessionMessages(): Message[] {
  if (!fs.existsSync(SESSION_JSON)) {
    console.error(`[auto-distill] 会话文件不存在: ${SESSION_JSON}`);
    console.error('[auto-distill] 尝试从 recent sessions 目录查找...');

    // 尝试从 recent sessions 找最新的
    const recentDir = path.join(process.env.HOME || '', '.openclaw', 'sessions');
    if (fs.existsSync(recentDir)) {
      const entries = fs.readdirSync(recentDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => ({
          name: e.name,
          mtime: fs.statSync(path.join(recentDir, e.name)).mtime.getTime()
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (entries.length > 0) {
        const latest = path.join(recentDir, entries[0].name, 'session.json');
        console.log(`[auto-distill] 使用最近会话: ${latest}`);
        if (fs.existsSync(latest)) {
          const data = JSON.parse(fs.readFileSync(latest, 'utf-8'));
          return extractMessages(data);
        }
      }
    }
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(SESSION_JSON, 'utf-8'));
    return extractMessages(data);
  } catch (e) {
    console.error(`[auto-distill] 读取会话文件失败:`, e);
    return [];
  }
}

function extractMessages(data: any): Message[] {
  // 支持多种 session.json 格式
  if (Array.isArray(data)) {
    return data.map(m => ({
      role: m.role || m.speaker || 'unknown',
      content: m.content || m.text || '',
      timestamp: m.timestamp || m.time
    })).filter(m => m.content);
  }
  if (data.messages) return extractMessages(data.messages);
  if (data.history) return extractMessages(data.history);
  if (data.events) {
    return data.events
      .filter((e: any) => e.type === 'message' || e.type === 'text')
      .map((e: any) => ({
        role: e.role || e.speaker || 'unknown',
        content: e.content || e.text || '',
        timestamp: e.timestamp
      }));
  }
  return [];
}

// ============== 调用 LLM 提炼 ==============
async function distillWithLLM(messages: Message[]): Promise<string> {
  if (messages.length === 0) {
    return '## [无对话内容]\n\n- 会话为空或无法读取\n';
  }

  // 构建 prompt
  const conversation = messages
    .slice(-50) // 只取最近50条，避免 token 过多
    .map(m => `[${m.role}] ${m.content}`)
    .join('\n\n');

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `你是一个 AI 助手的记忆整理助手。请从以下对话中提炼关键信息，输出结构化的 Markdown 格式。

## 要求
1. 提取用户的关键需求、问题、决策
2. 提取助手提供的关键方案、答案、建议
3. 标注未完成的事项（待办）
4. 用简洁的要点，不用完整句子
5. 只输出 Markdown，不要有解释

## 对话内容
${conversation}

## 输出格式（只输出这个格式，不要输出其他内容）
## [${today}]

### 对话摘要
- 要点1
- 要点2

### 关键决策
- 决策1（如果有）

### 待办/后续
- 待办1（如果有）
`;

  const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        {
          role: 'system',
          content: '你是一个精确的记忆整理助手，只输出指定的 Markdown 格式，不要有前缀解释。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SiliconFlow API 错误: ${response.status} - ${err}`);
  }

  const result = await response.json() as any;
  const content = result.choices?.[0]?.message?.content || '';

  return content;
}

// ============== 追加到 MEMORY.md ==============
function appendToMemory(content: string): void {
  const dir = path.dirname(MEMORY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 如果文件不存在，创建一个带标题的初始文件
  if (!fs.existsSync(MEMORY_PATH)) {
    const header = `# MEMORY.md — Long-term Memory

_Last updated: ${new Date().toISOString()}_

---
`;
    fs.writeFileSync(MEMORY_PATH, header, 'utf-8');
  }

  const existing = fs.readFileSync(MEMORY_PATH, 'utf-8');

  // 检查是否已经追加过今天的（避免重复）
  const today = new Date().toISOString().slice(0, 10);
  const todayPattern = new RegExp(`## \\[${today.replace(/-/g, '\\\\-')}\\]`);
  if (todayPattern.test(existing)) {
    console.log(`[auto-distill] ${today} 的记忆已存在，跳过重复写入`);
    return;
  }

  // 在 "---" 之后或文件开头追加
  const separator = existing.includes('\n---\n') ? '\n---\n' : '\n';
  const newContent = existing.trimEnd() + separator + content + '\n';

  fs.writeFileSync(MEMORY_PATH, newContent, 'utf-8');
  console.log(`[auto-distill] 已追加记忆到 ${MEMORY_PATH}`);
}

// ============== 主流程 ==============
async function main() {
  console.log('[auto-distill] 开始 distill...');
  console.log(`[auto-distill] 会话文件: ${SESSION_JSON}`);

  const messages = readSessionMessages();
  console.log(`[auto-distill] 读取到 ${messages.length} 条消息`);

  if (messages.length === 0) {
    console.log('[auto-distill] 无消息可处理，退出');
    return;
  }

  try {
    const distilled = await distillWithLLM(messages);
    console.log('[auto-distill] LLM 提炼完成:');
    console.log(distilled);

    appendToMemory(distilled);
    console.log('[auto-distill] 完成!');
  } catch (e) {
    console.error('[auto-distill] 错误:', e);
    process.exit(1);
  }
}

main();
