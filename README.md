# dictation-refiner — 语音听写文本润色（CodeBuddy 插件 / 通用 skill / CLI）

把 ASR 语音识别文本整理成清楚、自然、可插入的最终文字，严格保留原意与语气。

> **致敬**：本插件复刻自开源项目 [Cindy（心动网络）](https://github.com/makecindy/cindy) 的语音输入"自动润色"功能（prompt 版本 `dictation-refinement.zh.v17`），并高度致敬 [dash（dashhuang）](https://github.com/dashhuang)。
>
> Cindy 许可证：Apache-2.0。

## 它是什么

Cindy 的语音输入流程是：**语音 → ASR 识别 → dictation-refinement（自动润色）→ 插入输入框**。
本仓库把"自动润色"这一步做成**可移植的独立组件**，包含：

- 与 Cindy 一致的**系统提示词**（`prompts/refine-dictation.zh.txt`，另有英文版）
- 与 Cindy 一致的 **JSON 输出契约**：只返回 `{"text":"..."}`
- 与 Cindy 一致的**安全护栏**：空输入/空输出/未变化/发散过长时回退原文
- 零依赖 CLI（`scripts/refine-cli.mjs`，Node.js 18+）
- CodeBuddy 插件结构（`agents/` + `skills/`）

## 快速开始

### 作为 CodeBuddy / workbuddy 插件

1. 把本仓库目录（或 zip）放入 CodeBuddy 插件目录，或通过 `/plugin` 安装。
2. 重启 CodeBuddy 后，对助手说：
   > 用 dictation-refiner 整理这段听写：`嗯然后那个我-我想看一下litellm这边是不是有问题`

   或直接粘贴口语化文本要求清理。

### 作为通用 CLI

```bash
node scripts/refine-cli.mjs --text "嗯然后那个我想看一下litellm这边是不是有问题" \
  --api-key $OPENAI_API_KEY --base-url https://api.openai.com/v1 --model gpt-4o-mini
```

完整参数见脚本内 `--help`（支持 `--selection-before`、`--user-dictionary`、`--user-instructions` 等上下文）。

### 作为通用 skill（Claude Code / Cursor / Trae 等）

把 `skills/dictation-refiner/` 放到项目的 `.agents/skills/` 或用户级 skills 目录。Agent 会读取 `SKILL.md`，按"用户请求模板"组装 JSON，把提示词作为 system prompt 调用模型，并执行输出契约与护栏。

## 目录结构

```
.
├── .codebuddy-plugin/plugin.json      # CodeBuddy 插件元数据
├── agents/dictation-refiner.md        # CodeBuddy agent（可被 /agent 调用）
├── skills/dictation-refiner/SKILL.md  # 通用 skill 入口
├── prompts/
│   ├── refine-dictation.zh.txt        # 中文系统提示词（复刻 Cindy v17）
│   └── refine-dictation.en.txt        # 英文系统提示词
├── scripts/refine-cli.mjs             # 零依赖 CLI（含护栏）
├── ATTRIBUTION.md                     # 来源与许可
└── README.md
```

## 修改提示词

- 更轻/更重润色：编辑 `prompts/refine-dictation.zh.txt` 的"整理尺度"小节，或用 `--user-instructions` 覆盖
- 多语言：编辑"简短示例"并保留 JSON 输出契约即可
- 记得更新 `promptVersion`（目前 v17）

## 许可证

Apache-2.0。提示词源自 Cindy（Apache-2.0），详见 `ATTRIBUTION.md`。

Socials: @下一站澳门. DM for inquiries.
