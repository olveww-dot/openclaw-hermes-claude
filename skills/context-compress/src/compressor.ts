/**
 * Context Compressor — Incremental Summarization for Long Conversations
 *
 * Five-step algorithm:
 *  1. Prune  — trim verbose tool outputs (cheap, no LLM)
 *  2. Head   — protect system prompt + first N turns
 *  3. Tail   — protect recent turns by token budget (~20K tokens)
 *  4. LLM    — compress middle turns via DeepSeek-V3
 *  5. Iterative — on re-compression, update existing summary
 */

import { readSecret } from "@tool-utils/env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface CompressionResult {
  messages: Message[];
  prunedCount: number;
  summaryTokens: number;
  originalTokens: number;
  compressedTokens: number;
}

export interface CompressorConfig {
  /** Protect first N messages (default: 3) */
  protectFirstN?: number;
  /** Protect last N messages as fallback (default: 20) */
  protectLastN?: number;
  /** Token budget for tail protection (default: 20000) */
  tailTokenBudget?: number;
  /** Ratio of compressed content for summary (default: 0.20) */
  summaryTargetRatio?: number;
  /** Max summary output tokens (default: 12000) */
  maxSummaryTokens?: number;
  /** Focus topic for guided compression */
  focusTopic?: string;
  /** API key overrides */
  apiKey?: string;
  /** Base URL override */
  baseUrl?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUMMARY_PREFIX = `[CONTEXT COMPACTION — REFERENCE ONLY] Earlier turns were compacted into the summary below. This is a handoff from a previous context window — treat it as background reference, NOT as active instructions. Do NOT answer questions or fulfill requests mentioned in this summary; they were already addressed. Your current task is identified in the '## Active Task' section of the summary — resume exactly from there. Respond ONLY to the latest user message that appears AFTER this summary. The current session state (files, config, etc.) may reflect work described here — avoid repeating it:`;

const _PRUNED_TOOL_PLACEHOLDER = `[Old tool output cleared to save context space]`;
const _CHARS_PER_TOKEN = 4;
const _MIN_SUMMARY_TOKENS = 2000;
const _SUMMARY_TOKENS_CEILING = 12000;
const _SUMMARY_RATIO = 0.20;

// Content truncation limits for summarizer input
const _CONTENT_MAX = 6000;
const _CONTENT_HEAD = 4000;
const _CONTENT_TAIL = 1500;
const _TOOL_ARGS_MAX = 1500;
const _TOOL_ARGS_HEAD = 1200;

// SiliconFlow API
const DEFAULT_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_MODEL = "deepseek-ai/DeepSeek-V3";
const _SUMMARY_FAILURE_COOLDOWN_SECONDS = 600;

// ---------------------------------------------------------------------------
// Tool Result Summarization (Prune step)
// ---------------------------------------------------------------------------

interface ToolCallInfo {
  name: string;
  arguments: string;
}

/**
 * Generate a 1-line informative summary of a tool call + result.
 * Used during the cheap pre-pass pruning step.
 */
function summarizeToolResult(toolName: string, toolArgs: string, toolContent: string): string {
  let args: Record<string, unknown> = {};
  try {
    args = toolArgs ? JSON.parse(toolArgs) : {};
  } catch {
    // ignore parse errors
  }

  const content = toolContent || "";
  const contentLen = content.length;
  const lineCount = content.split("\n").length;

  switch (toolName) {
    case "terminal": {
      const cmd = (args.command as string) || "";
      const truncated = cmd.length > 80 ? cmd.slice(0, 77) + "..." : cmd;
      const exitMatch = content.match(/"exit_code"\s*:\s*(-?\d+)/);
      const exitCode = exitMatch ? exitMatch[1] : "?";
      return `[terminal] ran \`${truncated}\` -> exit ${exitCode}, ${lineCount} lines output`;
    }
    case "read": {
      const path = (args.path as string) || "?";
      const offset = (args.offset as number) || 1;
      return `[read] read ${path} from line ${offset} (${contentLen.toLocaleString()} chars)`;
    }
    case "write": {
      const path = (args.path as string) || "?";
      const content2 = (args.content as string) || "";
      const lines = content2.split("\n").length;
      return `[write] wrote to ${path} (${lines} lines)`;
    }
    case "exec": {
      const cmd = (args.command as string) || "";
      const truncated = cmd.length > 80 ? cmd.slice(0, 77) + "..." : cmd;
      return `[exec] ran \`${truncated}\` (${contentLen.toLocaleString()} chars result)`;
    }
    case "browser":
    case "browser_navigate":
    case "browser_snapshot":
    case "browser_click": {
      const url = (args.url as string) || "";
      return `[${toolName}] ${url || `ref=${args.ref || ""}`} (${contentLen.toLocaleString()} chars)`;
    }
    case "web_search":
    case "minimax-coding-plan__web_search": {
      const query = (args.query as string) || "?";
      return `[web_search] query='${query}' (${contentLen.toLocaleString()} chars)`;
    }
    case "web_fetch": {
      const url = (args.url as string) || "?";
      return `[web_fetch] ${url} (${contentLen.toLocaleString()} chars)`;
    }
    case "message": {
      const target = (args.target as string) || "?";
      return `[message] to ${target}`;
    }
    case "delegate_task": {
      const goal = (args.goal as string) || "";
      const truncated = goal.length > 60 ? goal.slice(0, 57) + "..." : goal;
      return `[delegate_task] '${truncated}'`;
    }
    case "tts": {
      return `[tts] generated audio (${contentLen.toLocaleString()} chars)`;
    }
    default: {
      // Generic fallback
      const firstEntries = Object.entries(args).slice(0, 2);
      const argsStr = firstEntries
        .map(([k, v]) => ` ${k}=${String(v).slice(0, 40)}`)
        .join("");
      return `[${toolName}]${argsStr} (${contentLen.toLocaleString()} chars result)`;
    }
  }
}

// ---------------------------------------------------------------------------
// Tool Call Arguments JSON Truncation
// ---------------------------------------------------------------------------

/**
 * Shrink long string values inside a tool-call arguments JSON blob while
 * preserving JSON validity. Prevents providers from rejecting malformed JSON.
 */
function truncateToolCallArgsJson(args: string, headChars: number = 200): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(args);
  } catch {
    return args;
  }

  function shrink(obj: unknown): unknown {
    if (typeof obj === "string") {
      return obj.length > headChars ? obj.slice(0, headChars) + "...[truncated]" : obj;
    }
    if (Array.isArray(obj)) return obj.map(shrink);
    if (obj && typeof obj === "object") {
      const record = obj as Record<string, unknown>;
      return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, shrink(v)]));
    }
    return obj;
  }

  const shrunken = shrink(parsed);
  return JSON.stringify(shrunken, undefined, 0);
}

// ---------------------------------------------------------------------------
// Token Estimation
// ---------------------------------------------------------------------------

/**
 * Rough token estimate: chars / 4 + overhead per message.
 */
function estimateTokens(messages: Message[]): number {
  let total = 0;
  for (const msg of messages) {
    const content = msg.content || "";
    let tokens = Math.ceil(content.length / _CHARS_PER_TOKEN) + 10;
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        tokens += Math.ceil((tc.function?.arguments || "").length / _CHARS_PER_TOKEN);
      }
    }
    total += tokens;
  }
  return total;
}

/**
 * Rough token estimate for a single message.
 */
function estimateMessageTokens(msg: Message): number {
  const content = msg.content || "";
  let tokens = Math.ceil(content.length / _CHARS_PER_TOKEN) + 10;
  if (msg.tool_calls) {
    for (const tc of msg.tool_calls) {
      tokens += Math.ceil((tc.function?.arguments || "").length / _CHARS_PER_TOKEN);
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Pruning (Step 1)
// ---------------------------------------------------------------------------

/**
 * Phase 1: Replace verbose tool outputs with 1-line summaries.
 * Also deduplicates identical content and truncates large tool args.
 */
function pruneOldToolResults(
  messages: Message[],
  protectTailCount: number,
  protectTailTokens?: number
): { messages: Message[]; prunedCount: number } {
  if (!messages.length) return { messages, prunedCount: 0 };

  const result: Message[] = messages.map((m) => ({ ...m }));
  let pruned = 0;

  // Build call_id -> (tool_name, arguments) map
  const callIdToTool: Record<string, ToolCallInfo> = {};
  for (const msg of result) {
    if (msg.role === "assistant" && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        callIdToTool[tc.id] = {
          name: tc.function?.name || "unknown",
          arguments: tc.function?.arguments || "",
        };
      }
    }
  }

  // Determine prune boundary
  let pruneBoundary: number;
  if (protectTailTokens !== undefined && protectTailTokens > 0) {
    // Token-budget approach: walk backward
    let accumulated = 0;
    let boundary = result.length;
    const minProtect = Math.min(protectTailCount, result.length - 1);
    for (let i = result.length - 1; i >= 0; i--) {
      const msgTokens = estimateMessageTokens(result[i]);
      if (accumulated + msgTokens > protectTailTokens && result.length - i >= minProtect) {
        boundary = i;
        break;
      }
      accumulated += msgTokens;
      boundary = i;
    }
    pruneBoundary = Math.max(boundary, result.length - minProtect);
  } else {
    pruneBoundary = result.length - protectTailCount;
  }

  // Pass 1: Deduplicate identical tool results
  const contentHashes: Record<string, number> = {};
  for (let i = result.length - 1; i >= 0; i--) {
    const msg = result[i];
    if (msg.role !== "tool") continue;
    const content = msg.content || "";
    if (typeof content === "string" && content.length >= 200) {
      const h = hashStr(content).slice(0, 12);
      if (contentHashes[h] !== undefined) {
        result[i] = { ...msg, content: "[Duplicate tool output — same content as a more recent call]" };
        pruned++;
      } else {
        contentHashes[h] = i;
      }
    }
  }

  // Pass 2: Replace old tool results with informative summaries
  for (let i = 0; i < pruneBoundary; i++) {
    const msg = result[i];
    if (msg.role !== "tool") continue;
    let content = msg.content || "";
    if (typeof content !== "string" || !content || content === _PRUNED_TOOL_PLACEHOLDER) continue;
    if (content.startsWith("[Duplicate tool output")) continue;
    if (content.length <= 200) continue;

    const toolInfo = callIdToTool[msg.tool_call_id || ""] || { name: "unknown", arguments: "" };
    const summary = summarizeToolResult(toolInfo.name, toolInfo.arguments, content);
    result[i] = { ...msg, content: summary };
    pruned++;
  }

  // Pass 3: Truncate large tool_call arguments outside protected tail
  for (let i = 0; i < pruneBoundary; i++) {
    const msg = result[i];
    if (msg.role !== "assistant" || !msg.tool_calls) continue;
    let modified = false;
    const newToolCalls = msg.tool_calls.map((tc) => {
      const args = tc.function?.arguments || "";
      if (args.length > 500) {
        const newArgs = truncateToolCallArgsJson(args);
        if (newArgs !== args) {
          modified = true;
          return {
            ...tc,
            function: { ...tc.function, arguments: newArgs },
          };
        }
      }
      return tc;
    });
    if (modified) {
      result[i] = { ...msg, tool_calls: newToolCalls };
    }
  }

  return { messages: result, prunedCount: pruned };
}

// Simple string hash
function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

// ---------------------------------------------------------------------------
// Head / Tail Boundaries
// ---------------------------------------------------------------------------

function alignBoundaryForward(messages: Message[], idx: number): number {
  while (idx < messages.length && messages[idx].role === "tool") idx++;
  return idx;
}

function alignBoundaryBackward(messages: Message[], idx: number): number {
  if (idx <= 0 || idx >= messages.length) return idx;
  let check = idx - 1;
  while (check >= 0 && messages[check].role === "tool") check--;
  if (check >= 0 && messages[check].role === "assistant" && messages[check].tool_calls?.length) {
    idx = check;
  }
  return idx;
}

function findLastUserMessageIdx(messages: Message[], headEnd: number): number {
  for (let i = messages.length - 1; i >= headEnd; i--) {
    if (messages[i].role === "user") return i;
  }
  return -1;
}

function ensureLastUserInTail(
  messages: Message[],
  cutIdx: number,
  headEnd: number,
  protectLastN: number
): number {
  const lastUserIdx = findLastUserMessageIdx(messages, headEnd);
  if (lastUserIdx < 0) return cutIdx;
  if (lastUserIdx >= cutIdx) return cutIdx;
  // Pull cut to include the last user message
  const minTail = Math.min(3, messages.length - headEnd - 1);
  return Math.max(lastUserIdx, messages.length - minTail);
}

function findTailCutByTokens(
  messages: Message[],
  headEnd: number,
  tokenBudget: number,
  protectLastN: number
): number {
  const n = messages.length;
  const minTail = Math.min(3, n - headEnd - 1);
  const softCeiling = Math.floor(tokenBudget * 1.5);
  let accumulated = 0;
  let cutIdx = n;

  for (let i = n - 1; i >= headEnd; i--) {
    const msgTokens = estimateMessageTokens(messages[i]);
    if (accumulated + msgTokens > softCeiling && n - i >= minTail) break;
    accumulated += msgTokens;
    cutIdx = i;
  }

  const fallbackCut = n - minTail;
  if (cutIdx > fallbackCut) cutIdx = fallbackCut;
  if (cutIdx <= headEnd) cutIdx = Math.max(fallbackCut, headEnd + 1);

  cutIdx = alignBoundaryBackward(messages, cutIdx);
  cutIdx = ensureLastUserInTail(messages, cutIdx, headEnd, protectLastN);

  return Math.max(cutIdx, headEnd + 1);
}

// ---------------------------------------------------------------------------
// Serialization for Summarizer
// ---------------------------------------------------------------------------

function serializeForSummary(turns: Message[]): string {
  const parts: string[] = [];

  for (const msg of turns) {
    const role = msg.role;
    let content = msg.content || "";

    if (role === "tool") {
      const toolId = msg.tool_call_id || "";
      if (content.length > _CONTENT_MAX) {
        content = content.slice(0, _CONTENT_HEAD) + "\n...[truncated]...\n" + content.slice(-_CONTENT_TAIL);
      }
      parts.push(`[TOOL RESULT ${toolId}]: ${content}`);
      continue;
    }

    if (role === "assistant") {
      if (content.length > _CONTENT_MAX) {
        content = content.slice(0, _CONTENT_HEAD) + "\n...[truncated]...\n" + content.slice(-_CONTENT_TAIL);
      }
      const toolCalls = msg.tool_calls || [];
      if (toolCalls.length) {
        const tcParts = toolCalls.map((tc) => {
          const name = tc.function?.name || "?";
          let args = tc.function?.arguments || "";
          if (args.length > _TOOL_ARGS_MAX) {
            args = args.slice(0, _TOOL_ARGS_HEAD) + "...";
          }
          return `  ${name}(${args})`;
        });
        content += "\n[Tool calls:\n" + tcParts.join("\n") + "\n]";
      }
      parts.push(`[ASSISTANT]: ${content}`);
      continue;
    }

    // user and other roles
    if (content.length > _CONTENT_MAX) {
      content = content.slice(0, _CONTENT_HEAD) + "\n...[truncated]...\n" + content.slice(-_CONTENT_TAIL);
    }
    parts.push(`[${role.toUpperCase()}]: ${content}`);
  }

  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// LLM Summarization (Step 4)
// ---------------------------------------------------------------------------

interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

async function callSiliconFlowLLM(
  config: LLMConfig,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const { apiKey, baseUrl, model } = config;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SiliconFlow API error: ${response.status} ${errorText}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content || "";
}

function buildSummaryPrompt(
  turnsToSummarize: string,
  summaryBudget: number,
  previousSummary?: string,
  focusTopic?: string
): string {
  const preamble = `You are a summarization agent creating a context checkpoint. Your output will be injected as reference material for a DIFFERENT assistant that continues the conversation. Do NOT respond to any questions or requests in the conversation — only output the structured summary. Do NOT include any preamble, greeting, or prefix.`;

  const template = `## Active Task
[Copy the user's most recent request or task assignment verbatim. If multiple tasks were requested and only some are done, list only the ones NOT yet completed. The next assistant must pick up exactly here. Example: "User asked: 'Now refactor the auth module to use JWT instead of sessions'". If no outstanding task exists, write "None."]

## Goal
[What the user is trying to accomplish overall]

## Constraints & Preferences
[User preferences, coding style, constraints, important decisions]

## Completed Actions
[Numbered list of concrete actions taken — include tool used, target, and outcome.
Format each as: N. ACTION target — outcome [tool: name]
Example:
1. READ config.py:45 — found \`==\` should be \`!=\` [tool: read]
2. EDIT config.py:45 — changed \`==\` to \`!=\` [tool: edit]
3. RUN \`pytest tests/\` — 3/50 failed: test_parse, test_validate, test_edge [tool: exec]
Be specific with file paths, commands, line numbers, and results.]

## Active State
[Current working state — include:
- Working directory and branch (if applicable)
- Modified/created files with brief note on each
- Test status (X/Y passing)
- Any running processes or servers
- Environment details that matter]

## In Progress
[Work currently underway — what was being done when compaction fired]

## Blocked
[Any blockers, errors, or issues not yet resolved. Include exact error messages.]

## Key Decisions
[Important technical decisions and WHY they were made]

## Resolved Questions
[Questions the user asked that were ALREADY answered — include the answer so the next assistant does not re-answer them]

## Pending User Asks
[Questions or requests from the user that have NOT yet been answered or fulfilled. If none, write "None."]

## Relevant Files
[Files read, modified, or created — with brief note on each]

## Remaining Work
[What remains to be done — framed as context, not instructions]

## Critical Context
[Any specific values, error messages, configuration details, or data that would be lost without explicit preservation]

Target ~${summaryBudget} tokens. Be CONCRETE — include file paths, command outputs, error messages, line numbers, and specific values. Avoid vague descriptions like "made some changes" — say exactly what changed.

Write only the summary body. Do not include any preamble or prefix.`;

  if (previousSummary) {
    const focusGuidance = focusTopic
      ? `\n\nFOCUS TOPIC: "${focusTopic}"\nThe user has requested that this compaction PRIORITISE preserving all information related to the focus topic above. For content related to "${focusTopic}", include full detail — exact values, file paths, command outputs, error messages, and decisions. For content NOT related to the focus topic, summarise more aggressively (brief one-liners or omit if truly irrelevant).`
      : "";

    return `${preamble}

You are updating a context compaction summary. A previous compaction produced the summary below. New conversation turns have occurred since then and need to be incorporated.

PREVIOUS SUMMARY:
${previousSummary}

NEW TURNS TO INCORPORATE:
${turnsToSummarize}

Update the summary using this exact structure. PRESERVE all existing information that is still relevant. ADD new completed actions to the numbered list (continue numbering). Move items from "In Progress" to "Completed Actions" when done. Move answered questions to "Resolved Questions". Update "Active State" to reflect current state. Remove information only if it is clearly obsolete. CRITICAL: Update "## Active Task" to reflect the user's most recent unfulfilled request — this is the most important field for task continuity.

${template}${focusGuidance}`;
  }

  const focusGuidance = focusTopic
    ? `\n\nFOCUS TOPIC: "${focusTopic}"\nThe user has requested that this compaction PRIORITISE preserving all information related to the focus topic above. For content related to "${focusTopic}", include full detail — exact values, file paths, command outputs, error messages, and decisions. For content NOT related to the focus topic, summarise more aggressively (brief one-liners or omit if truly irrelevant).`
    : "";

  return `${preamble}

Create a structured handoff summary for a different assistant that will continue this conversation after earlier turns are compacted. The next assistant should be able to understand what happened without re-reading the original turns.

TURNS TO SUMMARIZE:
${turnsToSummarize}

Use this exact structure:

${template}${focusGuidance}`;
}

// ---------------------------------------------------------------------------
// Tool Pair Integrity
// ---------------------------------------------------------------------------

function sanitizeToolPairs(messages: Message[]): Message[] {
  // Collect surviving call IDs
  const survivingCallIds = new Set<string>();
  for (const msg of messages) {
    if (msg.role === "assistant" && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        if (tc.id) survivingCallIds.add(tc.id);
      }
    }
  }

  // Collect call IDs that have results
  const resultCallIds = new Set<string>();
  for (const msg of messages) {
    if (msg.role === "tool" && msg.tool_call_id) {
      resultCallIds.add(msg.tool_call_id);
    }
  }

  // Remove orphaned tool results
  const orphanedResults = new Set([...resultCallIds].filter((id) => !survivingCallIds.has(id)));
  if (orphanedResults.size) {
    messages = messages.filter((m) => !(m.role === "tool" && orphanedResults.has(m.tool_call_id || "")));
  }

  // Add stub results for orphaned tool calls
  const missingResults = new Set([...survivingCallIds].filter((id) => !resultCallIds.has(id)));
  if (missingResults.size) {
    const patched: Message[] = [];
    for (const msg of messages) {
      patched.push(msg);
      if (msg.role === "assistant" && msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          if (tc.id && missingResults.has(tc.id)) {
            patched.push({
              role: "tool",
              content: "[Result from earlier conversation — see context summary above]",
              tool_call_id: tc.id,
            });
          }
        }
      }
    }
    messages = patched;
  }

  return messages;
}

// ---------------------------------------------------------------------------
// Main Compressor Class
// ---------------------------------------------------------------------------

export class ContextCompressor {
  private config: CompressorConfig;
  private llmConfig: LLMConfig;
  private previousSummary: string | undefined;
  private lastCompressionSavingsPct: number = 100;
  private ineffectiveCompressionCount: number = 0;
  private summaryFailureCooldownUntil: number = 0;
  private compressionCount: number = 0;

  constructor(config: CompressorConfig = {}) {
    this.config = {
      protectFirstN: 3,
      protectLastN: 20,
      tailTokenBudget: 20000,
      summaryTargetRatio: _SUMMARY_RATIO,
      maxSummaryTokens: _SUMMARY_TOKENS_CEILING,
      ...config,
    };

    const apiKey = config.apiKey || process.env.SILICONFLOW_API_KEY || readSecret("siliconflow_api_key") || "";
    const baseUrl = config.baseUrl || process.env.SILICONFLOW_BASE_URL || DEFAULT_BASE_URL;

    this.llmConfig = {
      apiKey,
      baseUrl,
      model: DEFAULT_MODEL,
    };

    this.previousSummary = undefined;
  }

  get compressionCount$(): number {
    return this.compressionCount;
  }

  get lastSavingsPct(): number {
    return this.lastCompressionSavingsPct;
  }

  shouldCompress(currentTokens: number, thresholdTokens: number): boolean {
    if (currentTokens < thresholdTokens) return false;
    if (this.ineffectiveCompressionCount >= 2) {
      console.warn(
        `[ContextCompressor] Compression skipped — last ${this.ineffectiveCompressionCount} compressions saved <10%% each.`
      );
      return false;
    }
    return true;
  }

  async compress(messages: Message[]): Promise<CompressionResult> {
    const {
      protectFirstN,
      protectLastN,
      tailTokenBudget,
      summaryTargetRatio,
      maxSummaryTokens,
      focusTopic,
    } = this.config;

    const nMessages = messages.length;
    const minForCompress = protectFirstN + 3 + 1;
    if (nMessages <= minForCompress) {
      return {
        messages,
        prunedCount: 0,
        summaryTokens: 0,
        originalTokens: estimateTokens(messages),
        compressedTokens: estimateTokens(messages),
      };
    }

    const originalTokens = estimateTokens(messages);

    // Phase 1: Prune old tool results
    const { messages: prunedMessages, prunedCount } = pruneOldToolResults(
      messages,
      protectLastN,
      tailTokenBudget
    );

    if (prunedCount > 0) {
      console.info(`[ContextCompressor] Pre-compression: pruned ${prunedCount} old tool result(s)`);
    }

    // Phase 2: Determine boundaries
    let compressStart = alignBoundaryForward(prunedMessages, protectFirstN);
    const compressEnd = findTailCutByTokens(prunedMessages, compressStart, tailTokenBudget, protectLastN);

    if (compressStart >= compressEnd) {
      return {
        messages: prunedMessages,
        prunedCount,
        summaryTokens: 0,
        originalTokens,
        compressedTokens: estimateTokens(prunedMessages),
      };
    }

    const turnsToSummarize = prunedMessages.slice(compressStart, compressEnd);
    console.info(
      `[ContextCompressor] Compressing turns ${compressStart + 1}-${compressEnd} (${turnsToSummarize.length} turns), protecting ${compressStart} head + ${nMessages - compressEnd} tail messages`
    );

    // Phase 3: Generate summary via LLM
    let summary: string | undefined;
    const summaryBudget = Math.min(
      Math.floor(estimateTokens(turnsToSummarize) * summaryTargetRatio),
      maxSummaryTokens
    );

    const serialized = serializeForSummary(turnsToSummarize);
    const prompt = buildSummaryPrompt(
      serialized,
      Math.max(_MIN_SUMMARY_TOKENS, summaryBudget),
      this.previousSummary,
      focusTopic
    );

    const now = Date.now() / 1000;
    if (now < this.summaryFailureCooldownUntil) {
      console.warn(`[ContextCompressor] Summary generation skipped during cooldown.`);
    } else {
      try {
        summary = await callSiliconFlowLLM(
          this.llmConfig,
          prompt,
          Math.floor(summaryBudget * 1.3)
        );
        if (summary) {
          this.previousSummary = summary;
          this.summaryFailureCooldownUntil = 0;
        }
      } catch (err) {
        console.error(`[ContextCompressor] Summary generation failed:`, err);
        this.summaryFailureCooldownUntil = now + _SUMMARY_FAILURE_COOLDOWN_SECONDS;
      }
    }

    // Phase 4: Assemble compressed message list
    const compressed: Message[] = [];

    // Head
    for (let i = 0; i < compressStart; i++) {
      const msg = { ...prunedMessages[i] };
      if (i === 0 && msg.role === "system") {
        const existing = msg.content || "";
        const note = "\n\n[Note: Some earlier conversation turns have been compacted into a handoff summary to preserve context space. The current session state may still reflect earlier work, so build on that summary and state rather than re-doing work.]";
        if (!existing.includes(note)) {
          msg.content = existing + note;
        }
      }
      compressed.push(msg);
    }

    // Summary
    if (summary) {
      const lastHeadRole = prunedMessages[compressStart - 1]?.role || "user";
      const firstTailRole = prunedMessages[compressEnd]?.role || "user";
      const summaryRole: Message["role"] =
        lastHeadRole === "assistant" || lastHeadRole === "tool" ? "user" : "assistant";

      compressed.push({ role: summaryRole, content: SUMMARY_PREFIX + "\n" + summary });
    } else {
      // Static fallback
      const nDropped = compressEnd - compressStart;
      compressed.push({
        role: "user",
        content:
          SUMMARY_PREFIX +
          `\nSummary generation was unavailable. ${nDropped} conversation turns were removed to free context space but could not be summarized. The removed turns contained earlier work in this session. Continue based on the recent messages below and the current state of any files or resources.`,
      });
    }

    // Tail
    for (let i = compressEnd; i < nMessages; i++) {
      compressed.push({ ...prunedMessages[i] });
    }

    this.compressionCount++;
    const compressedTokens = estimateTokens(compressed);
    const savedTokens = originalTokens - compressedTokens;
    const savingsPct = originalTokens > 0 ? (savedTokens / originalTokens) * 100 : 0;
    this.lastCompressionSavingsPct = savingsPct;

    if (savingsPct < 10) {
      this.ineffectiveCompressionCount++;
    } else {
      this.ineffectiveCompressionCount = 0;
    }

    const finalMessages = sanitizeToolPairs(compressed);

    console.info(
      `[ContextCompressor] #${this.compressionCount} complete: ${nMessages} -> ${finalMessages.length} messages (~${Math.round(savedTokens)} tokens saved, ${Math.round(savingsPct)}%)`
    );

    return {
      messages: finalMessages,
      prunedCount,
      summaryTokens: summaryBudget,
      originalTokens,
      compressedTokens,
    };
  }

  /** Reset per-session state */
  reset(): void {
    this.previousSummary = undefined;
    this.lastCompressionSavingsPct = 100;
    this.ineffectiveCompressionCount = 0;
    this.compressionCount = 0;
    this.summaryFailureCooldownUntil = 0;
  }
}

// ---------------------------------------------------------------------------
// Convenience exports
// ---------------------------------------------------------------------------

export function createCompressor(config?: CompressorConfig): ContextCompressor {
  return new ContextCompressor(config);
}

/**
 * Simple one-shot compression: takes messages array, returns compressed.
 */
export async function compressMessages(
  messages: Message[],
  config?: CompressorConfig
): Promise<Message[]> {
  const compressor = new ContextCompressor(config);
  const result = await compressor.compress(messages);
  return result.messages;
}
