#!/usr/bin/env npx ts-node

/**
 * reflection-logger.ts
 * 自动记录反思条目到 memory/reflections/YYYY-MM-DD.md
 *
 * 用法：
 *   npx ts-node reflection-logger.ts log --type tool_failure --tool exec --context "..." --decision "..." --result "..."
 *   npx ts-node reflection-logger.ts subagent --task "..." --outcome "..." --lessons "..."
 *   npx ts-node reflection-logger.ts hook --type tool_result --tool xxx --success true
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseArgs } from 'util';

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || '/Users/ec/.openclaw/workspace';
const REFLECTIONS_DIR = path.join(WORKSPACE, 'memory', 'reflections');

type ReflectionType =
  | 'tool_success'
  | 'tool_failure'
  | 'subagent_complete'
  | 'decision'
  | 'error_recovery'
  | 'lesson_learned';

interface LogOptions {
  type: ReflectionType;
  tool?: string;
  context?: string;
  decision?: string;
  result?: string;
  lessons?: string;
  task?: string;
  outcome?: string;
  error?: string;
  tags?: string[];
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTime(): string {
  return new Date().toISOString().slice(11, 19);
}

function reflectionFile(): string {
  ensureDir(REFLECTIONS_DIR);
  return path.join(REFLECTIONS_DIR, `${todayDate()}.md`);
}

function escapeMd(text: string | undefined): string {
  if (!text) return '—';
  return text.replace(/\n/g, ' ').replace(/\*\*/g, '').trim();
}

function tagsLine(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return '';
  return `\n**标签**: ${tags.map(t => `\`${t}\``).join(' ')}`;
}

function buildToolEntry(opts: LogOptions): string {
  const { type, tool, context, decision, result, lessons, tags } = opts;
  const emoji = type === 'tool_success' ? '✅' : type === 'tool_failure' ? '❌' : '🔧';
  const lines = [
    `## [${nowTime()}] ${emoji} ${type} — ${escapeMd(tool ?? 'unknown')}`,
    ``,
    `| 字段 | 内容 |`,
    `|------|------|`,
    `| **情境** | ${escapeMd(context)} |`,
    `| **决策** | ${escapeMd(decision)} |`,
    `| **结果** | ${escapeMd(result)} |`,
    `| **教训** | ${escapeMd(lessons)} |`,
    `${tagsLine(tags)}`,
    ``,
  ].filter(l => l !== undefined);
  return lines.join('\n');
}

function buildSubagentEntry(opts: LogOptions): string {
  const { task, outcome, lessons, tags } = opts;
  const lines = [
    `## [${nowTime()}] 🤖 subagent_complete — ${escapeMd(task)}`,
    ``,
    `| 字段 | 内容 |`,
    `|------|------|`,
    `| **任务** | ${escapeMd(task)} |`,
    `| **结果** | ${escapeMd(outcome)} |`,
    `| **经验** | ${escapeMd(lessons)} |`,
    `${tagsLine(tags)}`,
    ``,
  ].filter(l => l !== undefined);
  return lines.join('\n');
}

function buildDecisionEntry(opts: LogOptions): string {
  const { context, decision, result, lessons, tags } = opts;
  const lines = [
    `## [${nowTime()}] 💡 decision`,
    ``,
    `| 字段 | 内容 |`,
    `|------|------|`,
    `| **情境** | ${escapeMd(context)} |`,
    `| **决策** | ${escapeMd(decision)} |`,
    `| **结果** | ${escapeMd(result)} |`,
    `| **教训** | ${escapeMd(lessons)} |`,
    `${tagsLine(tags)}`,
    ``,
  ].filter(l => l !== undefined);
  return lines.join('\n');
}

function appendReflection(content: string) {
  const file = reflectionFile();
  const header = fs.existsSync(file)
    ? ''
    : `# 反思记录 — ${todayDate()}\n\n<!-- auto-reflection: ${todayDate()} -->\n\n`;

  fs.appendFileSync(file, header + content + '\n---\n\n');
  console.log(`📝 反思已记录: ${file}`);
}

function logReflection(opts: LogOptions) {
  let entry: string;
  if (opts.type === 'subagent_complete') {
    entry = buildSubagentEntry(opts);
  } else if (opts.type === 'decision') {
    entry = buildDecisionEntry(opts);
  } else {
    entry = buildToolEntry(opts);
  }
  appendReflection(entry);
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'log';

  if (command === 'log') {
    const { values } = parseArgs({
      args,
      options: {
        type: { type: 'string', default: 'tool_success' },
        tool: { type: 'string' },
        context: { type: 'string' },
        decision: { type: 'string' },
        result: { type: 'string' },
        lessons: { type: 'string' },
        tags: { type: 'string' },
      },
      allowPositionals: true,
    });

    logReflection({
      type: values.type as ReflectionType,
      tool: values.tool,
      context: values.context,
      decision: values.decision,
      result: values.result,
      lessons: values.lessons,
      tags: values.tags ? values.tags.split(',') : undefined,
    });
  } else if (command === 'subagent') {
    const { values } = parseArgs({
      args,
      options: {
        task: { type: 'string' },
        outcome: { type: 'string' },
        lessons: { type: 'string' },
        tags: { type: 'string' },
      },
      allowPositionals: true,
    });

    logReflection({
      type: 'subagent_complete',
      task: values.task,
      outcome: values.outcome,
      lessons: values.lessons,
      tags: values.tags ? values.tags.split(',') : undefined,
    });
  } else if (command === 'hook') {
    // Called by OpenClaw hooks: receives JSON from stdin or args
    const { values } = parseArgs({
      args,
      options: {
        type: { type: 'string' },
        tool: { type: 'string' },
        success: { type: 'string' },
        error: { type: 'string' },
        context: { type: 'string' },
        decision: { type: 'string' },
      },
      allowPositionals: true,
    });

    const success = values.success === 'true';
    logReflection({
      type: success ? 'tool_success' : 'tool_failure',
      tool: values.tool,
      context: values.context,
      decision: values.decision,
      result: success ? '执行成功' : values.error ?? '执行失败',
      lessons: success ? undefined : `错误: ${values.error}`,
    });
  } else if (command === 'cat') {
    // Debug: print today's log
    const file = reflectionFile();
    if (fs.existsSync(file)) {
      console.log(fs.readFileSync(file, 'utf-8'));
    } else {
      console.log('今日暂无反思记录');
    }
  } else {
    console.error(`未知命令: ${command}`);
    console.error('用法: log | subagent | hook | cat');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('reflection-logger error:', err);
  process.exit(1);
});
