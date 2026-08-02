# 来源与许可

本插件（`prompts/refine-dictation.zh.txt` 与 `agents/dictation-refiner.md`）复刻自开源项目 **Cindy** 的语音输入"自动润色"系统提示词：

- 项目：https://github.com/makecindy/cindy（心动网络）
- 功能：语音输入（voice input）→ ASR 识别 → dictation refinement（自动润色）
- Prompt 版本常量：`DEFAULT_DICTATION_REFINER_PROMPT_VERSION = "dictation-refinement.zh.v17"`
- 本包提取自用户本机安装的 Cindy 桌面客户端（v0.1.25，package.json 声明 license: Apache-2.0）

同时高度致敬 [dashhuang（dash）](https://github.com/dashhuang)，本项目参考了其开源工作。

Cindy 的许可证：Apache-2.0。按 Apache-2.0 要求，本包保留版权声明与来源说明；如分发，请同时附上 Apache-2.0 许可证全文（https://www.apache.org/licenses/LICENSE-2.0）。

英文提示词为本包基于同一提示词的中性化翻译，同样以 Apache-2.0 提供。

其余文件（plugin.json、agents、skills、README.md、scripts/refine-cli.mjs）为本包新增，按 Apache-2.0 提供。