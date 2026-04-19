#!/usr/bin/env node
/**
 * Crash-Resistant Snapshots - Backup Script
 *
 * 每次 write/edit 前自动备份原文件。
 * 备份路径: {原文件目录}/.openclaw/backups/{timestamp}_{原文件名}
 * 只备份已存在的文件，新文件不备份。
 */

import * as fs from "fs";
import * as path from "path";

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  );
}

function backupFile(filePath: string): boolean {
  // 解析为绝对路径
  const absPath = path.resolve(filePath);

  // 检查文件是否存在
  if (!fs.existsSync(absPath)) {
    console.log(`⏭️  跳过（新文件，不存在）: ${absPath}`);
    return false;
  }

  const stats = fs.statSync(absPath);
  if (!stats.isFile()) {
    console.log(`⏭️  跳过（非文件）: ${absPath}`);
    return false;
  }

  const dir = path.dirname(absPath);
  const basename = path.basename(absPath);
  const timestamp = formatTimestamp();
  const backupDir = path.join(dir, ".openclaw", "backups");
  const backupPath = path.join(backupDir, `${timestamp}_${basename}`);

  // 自动创建备份目录（recursive）
  fs.mkdirSync(backupDir, { recursive: true });

  // 复制文件
  fs.copyFileSync(absPath, backupPath);

  console.log(`✅ 已备份: ${absPath}`);
  console.log(`   → ${backupPath}`);
  return true;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("用法: backup.ts <file1> [file2] ...");
    console.log("示例: backup.ts src/app.ts config.json");
    process.exit(1);
  }

  console.log(`\n🛡️  Crash-Resistant Snapshots`);
  console.log(`   备份目标: ${args.length} 个文件\n`);

  let success = 0;
  let skipped = 0;

  for (const file of args) {
    const ok = backupFile(file);
    if (ok) success++;
    else skipped++;
  }

  console.log(`\n📊 结果: ${success} 备份成功, ${skipped} 跳过`);
  process.exit(0);
}

main();
