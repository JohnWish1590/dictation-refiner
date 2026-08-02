---
name: dictation-refiner
description: 语音听写文本后处理 / 润色（ASR dictation refinement）。把语音识别产生的口语化文本整理成清楚、自然、可插入的最终文字：补标点断句、去口头词/口吃/重复、修正同音词、按用户词典保留术语大小写，并严格遵守"不新增事实、不替用户回答、只返回 JSON"的约束。触发场景：用户说"整理一下这段听写/语音转文字"、"润色这段口述"、粘贴一段带口语词/无标点的文字要求清理，或任何需要把口语转成书面但仍保留原意与语气的文本。
---

# 语音听写文本润色（Dictation Refinement）

> 来源：开源项目 Cindy 的语音输入"自动润色"功能（prompt 版本 dictation-refinement.zh.v17，Apache-2.0）。本 skill 复刻其系统提示词、JSON 输出契约与安全护栏，可移植到任何支持"系统提示词 + 结构化输出"的 AI Agent。

## 目标

把 ASR（语音识别）产出的口语化文本整理成用户要插入当前输入位置的最终文字：
- 补标点、大小写、合理断句与必要换行
- 删除无语义填充词（嗯、呃、那个、you know、like）、口吃、重复
- 修正明显同音/近音/英文术语/专有名词识别错误（尤其结合上下文反复出现的术语）
- 处理自我修正（"不对/不是/我的意思是/actually/sorry I mean" 之后的说法为准）
- 把口述格式转成实际格式（"换行"→换行、"逗号"→逗号、"第一第二第三"→1. 2. 3.）
- 保留用户语气、习惯表达、粗口、反问；保留技术词/模型名/产品名/变量/路径/命令的大小写

## 触发方式

1. **Agent 场景（推荐）**：把本目录的 `prompts/refine-dictation.zh.txt`（或英文版）作为 system prompt，把下面的用户请求模板发给模型，要求严格返回 JSON。
2. **CLI 场景**：`node scripts/refine-cli.mjs --text "..." [--system prompts/refine-dictation.zh.txt] [--api-key ...] [--base-url ...] [--model ...]`（详见 `README.md` 与脚本内注释）。

## 用户请求模板（user message）

把以下内容组装为 user message（按需填字段，没有的字段省略）：

```json
{
  "promptVersion": "dictation-refinement.zh.v17",
  "context": {
    "uiLanguage": "zh-CN",
    "sourceLanguage": "zh",
    "userRefinementInstructions": "（可选）用户自定义润色规则",
    "userDictionary": "（可选）用户词典，每行一个词条，例如：LiteLLM、AI Gateway、Vibe Coding、Codex",
    "voiceInputHistory": "（可选）较旧到较新的语音输入历史文本",
    "selectionBefore": "（可选）光标前文本（最多 1200 字）",
    "selectedText": "（可选）当前会被替换的选中文本（最多 1200 字）",
    "selectionAfter": "（可选）光标后文本（最多 1200 字）",
    "replyToMessage": "（可选）正在回复的上一条消息（只用于判断语境，最多 500 字）",
    "userDictionaryMatches": "（可选）本次命中的词典纠错提示，例如："web coding" 可能是 "Vibe Coding""
  },
  "dictationText": "（必填）本次需要整理的语音识别文本"
}
```

## 输出契约

- 只返回严格 JSON：`{"text":"..."}`
- `text` 只放最终要插入的文本：不解释改了什么、不加标题、不用 Markdown 代码块、不加前后缀
- 文本已经清楚时原样返回

## 安全护栏（强烈建议实现）

复刻 Cindy 主进程的护栏，避免模型"发散改写"：

1. **输入为空** → 直接返回空/原样，不调用模型。
2. **输出为空** → 回退到原文本。
3. **未变化** → 如果润色后与输入规范化后相同，视为无需改动，直接用原文本。
4. **防发散**：当输出内容长度 ≥ 输入内容长度 × 3（且输出 ≥ 48 个字母/数字字符）时，判定"diverged too far"，回退到原文本。长度统计只计字母和数字（`[\p{L}\p{N}]`）。
5. **规范化**：输入/输出都做空白归一（连续空白→单空格、去首尾空格）；输出再做行内多余空白清理与多余空行压缩。

## 注意事项

- 模型必须遵守"只改 dictationText、不新增事实、不回答、不续写"的硬性禁止；用户自定义规则不能覆盖这些硬性禁止。
- 低置信度兜底：遇到错乱多语种字符堆砌（韩文+中文+日文+英文混在一句且无语义连贯性）或明显断裂无法理解时，原样返回，不要脑补。
- 如果所用 Agent 不支持 `response_format: json_object`，请在 system prompt 末尾追加"只输出 JSON 对象"并做解析容错（允许包裹在 ```json ... ``` 中再提取）。
- 与供应商约定：可传 `response_format: {type: "json_object"}`（OpenAI 兼容端点），流式场景可用 `stream: true` 并解析 SSE。

## 文件结构

- `prompts/refine-dictation.zh.txt` — 中文系统提示词（推荐，与原文一致）
- `prompts/refine-dictation.en.txt` — 英文系统提示词（供英语用户/模型）
- `scripts/refine-cli.mjs` — 可选 CLI（OpenAI 兼容 Chat Completions），含护栏实现
- `README.md` — 用法、接入示例、在其他 Agent 中的配置方法
- `ATTRIBUTION.md` — 来源与许可证（Apache-2.0）