#!/usr/bin/env node
/**
 * refine-cli.mjs — 语音听写文本润色 CLI
 * 复刻开源项目 Cindy 的 dictation-refinement 设计（Apache-2.0）。
 * 依赖：Node.js 18+（内置 fetch），无第三方包。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function normalizeText(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeOutputText(s) {
  return String(s ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t\f\v]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function contentLength(s) {
  let n = 0;
  for (const ch of String(s)) {
    if (/[\p{L}\p{N}]/u.test(ch)) n++;
  }
  return n;
}

function isDiverged(input, output) {
  const inLen = contentLength(input);
  const outLen = contentLength(output);
  if (inLen === 0 || outLen < 48) return false;
  return outLen >= inLen * 3;
}

function extractJson(text) {
  const s = String(text ?? '').trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {}
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(s.slice(first, last + 1)); } catch {}
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log(`用法:
  node refine-cli.mjs --text "听写文本" [选项]

选项:
  --system <file>            系统提示词文件（默认 prompts/refine-dictation.zh.txt）
  --api-key <key>            API Key（或环境变量 REFINER_API_KEY / OPENAI_API_KEY）
  --base-url <url>           OpenAI 兼容端点（默认 https://api.openai.com/v1）
  --model <model>            模型（默认 gpt-4o-mini，或环境变量 REFINER_MODEL）
  --selection-before <s>     光标前文本
  --selected-text <s>        当前选中文本
  --selection-after <s>      光标后文本
  --reply-to <s>             正在回复的消息
  --user-dictionary <s>      用户词典，多词条用 \n 分隔
  --user-instructions <s>    用户自定义润色规则
  --ui-language <s>          界面语言（默认 zh-CN）
  --source-language <s>      语音输入语言（默认 zh）
  --no-guardrails            关闭护栏（调试用）
  --timeout-ms <n>           超时毫秒（默认 8000）
  --json                     输出完整 JSON 结果（默认只输出 text）
  --help                     显示帮助`);
    return;
  }

  const text = args.text || args._.join(' ');
  if (!text) {
    console.error('错误：缺少 --text（待润色的听写文本）');
    process.exit(2);
  }

  const apiKey = args['api-key'] || process.env.REFINER_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = args['base-url'] || process.env.REFINER_BASE_URL || 'https://api.openai.com/v1';
  const model = args.model || process.env.REFINER_MODEL || 'gpt-4o-mini';
  const timeoutMs = Number(args['timeout-ms'] || 8000);
  const systemFile = args.system || path.join(__dirname, '..', 'prompts', 'refine-dictation.zh.txt');
  const system = fs.readFileSync(systemFile, 'utf8').trim();
  const guardrails = args['no-guardrails'] !== true;

  const context = {};
  if (args['ui-language']) context.uiLanguage = args['ui-language'];
  if (args['source-language']) context.sourceLanguage = args['source-language'];
  if (args['user-instructions']) context.userRefinementInstructions = args['user-instructions'];
  if (args['user-dictionary']) context.userDictionary = args['user-dictionary'];
  if (args['selection-before']) context.selectionBefore = args['selection-before'];
  if (args['selected-text']) context.selectedText = args['selected-text'];
  if (args['selection-after']) context.selectionAfter = args['selection-after'];
  if (args['reply-to']) context.replyToMessage = args['reply-to'];

  const input = normalizeText(text);
  if (guardrails && !input) {
    const r = { accepted: false, rejectionReason: 'empty_input', text: '' };
    console.log(args.json ? JSON.stringify(r, null, 2) : '');
    return;
  }

  const user = JSON.stringify({
    promptVersion: 'dictation-refinement.zh.v17',
    context: Object.keys(context).length ? context : {},
    dictationText: input,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let raw;
  try {
    const resp = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error('HTTP ' + resp.status + ': ' + body.slice(0, 500));
      process.exit(1);
    }
    const data = await resp.json();
    raw = data?.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('错误：请求超时（' + timeoutMs + 'ms）');
      process.exit(1);
    }
    console.error('请求失败:', err.message);
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }

  const parsed = extractJson(raw);
  const output = normalizeOutputText(parsed?.text ?? '');
  const refinedText = parsed?.text ?? '';

  let result;
  if (guardrails && !output) {
    result = { accepted: false, rejectionReason: 'empty_output', text: input };
  } else if (guardrails && normalizeOutputText(input) === output) {
    result = { accepted: false, rejectionReason: 'no_change', text: input };
  } else if (guardrails && isDiverged(input, output)) {
    result = { accepted: false, rejectionReason: 'diverged_too_far', text: input };
  } else {
    result = { accepted: true, text: output, refinedText };
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.text);
  }
}

main().catch((err) => {
  console.error('错误:', err.message);
  process.exit(1);
});