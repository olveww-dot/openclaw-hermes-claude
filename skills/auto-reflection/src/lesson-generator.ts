#!/usr/bin/env npx ts-node

/**
 * lesson-generator.ts
 * 从反思历史中提炼可操作的经验教训
 *
 * 用法：
 *   npx ts-node lesson-generator.ts distill --days 7
 *   npx ts-node lesson-generator.ts diagnose
 *   npx ts-node lesson-generator.ts summary
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseArgs } from 'util';

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || '/Users/ec/.openclaw/workspace';
const REFLECTIONS_DIR = path.join(WORKSPACE, 'memory', 'reflections');
const LESSONS_FILE = path.join(REFLECTIONS_DIR, 'lessons.md');
const SUMMARY_FILE = path.join(REFLECTIONS_DIR, 'summary.md');

interface Lesson {
  id: string;
  timestamp: string;
  category: 'tool' | 'decision' | 'context' | 'safety' | 'memory';
  trigger: string;
  lesson: string;
  action: string;
  recurrenceRisk: 'high' | 'medium' | 'low';
}

// Pattern-based lesson extraction rules
const EXTRACTION_RULES: Array<{
  pattern: RegExp;
  category: Lesson['category'];
  buildLesson: (match: RegExpMatchArray, entry: string) => Omit<Lesson, 'id' | 'timestamp'>;
}> = [
  {
    pattern: /exec.*?失败|exec.*?error|命令.*?失败/,
    category: 'tool',
    buildLesson: (m, e) => ({
      category: 'tool',
      trigger: 'exec 命令执行失败',
      lesson: '执行 shell 命令前应检查命令意图，危险命令需警告确认',
      action: '对 exec 调用进行安全检查，特别是 rm -rf、chmod 777、/etc/ 等路径',
      recurrenceRisk: 'high',
    }),
  },
  {
    pattern: /文件.*?不存在|file.*?not found|路径.*?错误/,
    category: 'tool',
    buildLesson: (m, e) => ({
      category: 'tool',
      trigger: '引用了不存在的文件路径',
      lesson: '文件操作前应先验证路径存在性',
      action: '用 exec ls 或 read 先检查文件是否存在',
      recurrenceRisk: 'medium',
    }),
  },
  {
    pattern: /脑补|不确定.*?就问|不要.*?假设/,
    category: 'decision',
    buildLesson: (m, e) => ({
      category: 'decision',
      trigger: '根据不完整信息做了假设',
      lesson: '不确定时要先调查，不要脑补答案',
      action: '增加调研步骤，明确后再回复或执行',
      recurrenceRisk: 'high',
    }),
  },
  {
    pattern: /工具.*?重复|重复.*?调用|多次.*?调用.*?同一/,
    category: 'tool',
    buildLesson: (m, e) => ({
      category: 'tool',
      trigger: '同一个工具被重复调用',
      lesson: '合并工具调用，减少不必要的重复请求',
      action: '并行调用工具，一次获取所有需要的信息',
      recurrenceRisk: 'medium',
    }),
  },
  {
    pattern: /记忆.*?未写|忘记.*?记录|没有.*?更新.*?文件/,
    category: 'memory',
    buildLesson: (m, e) => ({
      category: 'memory',
      trigger: '重要信息未被记录到文件',
      lesson: '重要决策和结果必须写文件，不靠"脑子记"',
      action: '建立记忆纪律：决策即写入文件',
      recurrenceRisk: 'high',
    }),
  },
  {
    pattern: /subagent|并发.*?执行/,
    category: 'decision',
    buildLesson: (m, e) => ({
      category: 'decision',
      trigger: '子代理任务管理',
      lesson: '多个独立任务应并行派发 subagent，主会话只做协调',
      action: '独立任务用 sessions_spawn 并行化',
      recurrenceRisk: 'low',
    }),
  },
  {
    pattern: /sudo|权限.*?提升|chmod.*?777|危险.*?命令/,
    category: 'safety',
    buildLesson: (m, e) => ({
      category: 'safety',
      trigger: '涉及系统权限或破坏性操作',
      lesson: '危险操作前必须警告用户确认，不自动执行',
      action: '任何 rm -rf、mkfs、权限提升操作前提示确认',
      recurrenceRisk: 'high',
    }),
  },
];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getReflectionFiles(days: number): string[] {
  ensureDir(REFLECTIONS_DIR);
  const files: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const file = path.join(REFLECTIONS_DIR, `${dateStr}.md`);
    if (fs.existsSync(file)) {
      files.push(file);
    }
  }
  return files;
}

function parseReflectionEntries(content: string): string[] {
  // Split by --- separators
  return content.split(/---\n/).filter(Boolean);
}

function extractLessonsFromEntries(entries: string[]): Lesson[] {
  const lessons: Lesson[] = [];
  const seenTriggers = new Set<string>();

  for (const entry of entries) {
    for (const rule of EXTRACTION_RULES) {
      const match = entry.match(rule.pattern);
      if (match) {
        const partial = rule.buildLesson(match, entry);
        if (!seenTriggers.has(partial.trigger)) {
          seenTriggers.add(partial.trigger);
          lessons.push({
            id: Math.random().toString(36).slice(2, 9),
            timestamp: new Date().toISOString(),
            ...partial,
          });
        }
      }
    }
  }

  return lessons;
}

function riskEmoji(risk: Lesson['recurrenceRisk']): string {
  return risk === 'high' ? '🔴' : risk === 'medium' ? '🟡' : '🟢';
}

function categoryEmoji(cat: Lesson['category']): string {
  return { tool: '🔧', decision: '💡', context: '📋', safety: '🛡️', memory: '🧠' }[cat] ?? '•';
}

function formatLessonsMd(lessons: Lesson[]): string {
  const lines = [
    `# 经验教训 — ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `> 自动从反思记录中提炼。共 ${lessons.length} 条经验。`,
    ``,
    `## 高风险教训（需立即遵守）`,
    ``,
    ...lessons
      .filter(l => l.recurrenceRisk === 'high')
      .map(
        l =>
          `- ${riskEmoji(l.recurrenceRisk)} **${l.lesson}**\n  触发: ${l.trigger}\n  行动: ${l.action}`
      ),
    ``,
    `## 中低风险教训`,
    ``,
    ...lessons
      .filter(l => l.recurrenceRisk !== 'high')
      .map(
        l =>
          `- ${riskEmoji(l.recurrenceRisk)} ${categoryEmoji(l.category)} **${l.lesson}**\n  触发: ${l.trigger}\n  行动: ${l.action}`
      ),
    ``,
    `---`,
    `*生成时间: ${new Date().toISOString()}*`,
  ];
  return lines.join('\n');
}

function diagnose(lessons: Lesson[]): string[] {
  const issues: string[] = [];
  const highRisk = lessons.filter(l => l.recurrenceRisk === 'high');

  if (highRisk.length > 3) {
    issues.push(`⚠️ 高风险教训过多 (${highRisk.length})，建议优先解决最严重的几个`);
  }

  const categories = new Set(lessons.map(l => l.category));
  if (!categories.has('memory') && lessons.length > 0) {
    issues.push('ℹ️ 暂无记忆纪律相关教训，但建议检查 memory/ 目录更新频率');
  }

  // Check for recurring patterns
  const triggers = lessons.map(l => l.trigger);
  const duplicateTriggers = triggers.filter((t, i) => triggers.indexOf(t) !== i);
  if (duplicateTriggers.length > 0) {
    issues.push(`🔁 发现重复教训: ${[...new Set(duplicateTriggers)].join(', ')}`);
  }

  if (issues.length === 0) {
    issues.push('✅ 诊断通过，无明显问题');
  }

  return issues;
}

function buildSummary(lessons: Lesson[], days: number): string {
  const byCategory: Record<string, number> = {};
  for (const l of lessons) {
    byCategory[l.category] = (byCategory[l.category] ?? 0) + 1;
  }

  const lines = [
    `# 反思摘要 — 近 ${days} 天`,
    ``,
    `生成时间: ${new Date().toISOString().slice(0, 19)} GMT+8`,
    ``,
    `## 统计`,
    ``,
    `| 指标 | 数值 |`,
    `|------|------|`,
    `| 总教训数 | ${lessons.length} |`,
    `| 高风险 | ${lessons.filter(l => l.recurrenceRisk === 'high').length} |`,
    `| 中风险 | ${lessons.filter(l => l.recurrenceRisk === 'medium').length} |`,
    `| 低风险 | ${lessons.filter(l => l.recurrenceRisk === 'low').length} |`,
    ``,
    `## 按类别分布`,
    ``,
    `| 类别 | 数量 |`,
    `|------|------|`,
    ...Object.entries(byCategory).map(([cat, n]) => `| ${categoryEmoji(cat as Lesson['category'])} ${cat} | ${n} |`),
    ``,
  ];
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'distill';

  if (command === 'distill') {
    const { values } = parseArgs({
      args,
      options: {
        days: { type: 'string', default: '7' },
      },
      allowPositionals: true,
    });

    const days = parseInt(values.days ?? '7', 10);
    const files = getReflectionFiles(days);
    const allEntries: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      allEntries.push(...parseReflectionEntries(content));
    }

    const lessons = extractLessonsFromEntries(allEntries);
    const md = formatLessonsMd(lessons);
    fs.writeFileSync(LESSONS_FILE, md, 'utf-8');
    console.log(`📚 提炼完成: ${LESSONS_FILE} (${lessons.length} 条经验)`);
    for (const l of lessons) {
      console.log(`  ${riskEmoji(l.recurrenceRisk)} ${l.lesson}`);
    }
  } else if (command === 'diagnose') {
    const files = getReflectionFiles(7);
    const allEntries: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      allEntries.push(...parseReflectionEntries(content));
    }
    const lessons = extractLessonsFromEntries(allEntries);
    const issues = diagnose(lessons);
    for (const issue of issues) {
      console.log(issue);
    }
  } else if (command === 'summary') {
    const { values } = parseArgs({
      args,
      options: {
        days: { type: 'string', default: '7' },
      },
      allowPositionals: true,
    });
    const days = parseInt(values.days ?? '7', 10);
    const files = getReflectionFiles(days);
    const allEntries: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      allEntries.push(...parseReflectionEntries(content));
    }
    const lessons = extractLessonsFromEntries(allEntries);
    const summary = buildSummary(lessons, days);
    fs.writeFileSync(SUMMARY_FILE, summary, 'utf-8');
    console.log(`📊 摘要已生成: ${SUMMARY_FILE}`);
    console.log(summary);
  } else {
    console.error(`未知命令: ${command}`);
    console.error('用法: distill | diagnose | summary');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('lesson-generator error:', err);
  process.exit(1);
});
