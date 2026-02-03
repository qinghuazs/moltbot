---
name: oracle
description: 使用 oracle CLI 的最佳实践（提示 + 文件打包、引擎、会话和文件附加模式）。
homepage: https://askoracle.dev
metadata: {"moltbot":{"emoji":"🧿","requires":{"bins":["oracle"]},"install":[{"id":"node","kind":"node","package":"@steipete/oracle","bins":["oracle"],"label":"Install oracle (node)"}]}}
---

# oracle — 最佳使用

Oracle 将你的提示 + 选定文件打包成一个"一次性"请求，让另一个模型可以带着真实仓库上下文回答（API 或浏览器自动化）。将输出视为建议：根据代码 + 测试进行验证。

## 主要用例（浏览器，GPT‑5.2 Pro）

这里的默认工作流：`--engine browser` 配合 ChatGPT 中的 GPT‑5.2 Pro。这是常见的"长时间思考"路径：约 10 分钟到约 1 小时是正常的；期望一个可以重新连接的存储会话。

推荐默认值：
- 引擎：browser（`--engine browser`）
- 模型：GPT‑5.2 Pro（`--model gpt-5.2-pro` 或 `--model "5.2 Pro"`）

## 黄金路径

1. 选择一个紧凑的文件集（仍包含真相的最少文件）。
2. 预览载荷 + token 消耗（`--dry-run` + `--files-report`）。
3. 使用浏览器模式进行通常的 GPT‑5.2 Pro 工作流；仅在明确需要时使用 API。
4. 如果运行分离/超时：重新连接到存储的会话（不要重新运行）。

## 命令（推荐）

- 帮助：
  - `oracle --help`
  - 如果二进制文件未安装：`npx -y @steipete/oracle --help`（这里避免使用 `pnpx`；sqlite 绑定）。

- 预览（无 token）：
  - `oracle --dry-run summary -p "<task>" --file "src/**" --file "!**/*.test.*"`
  - `oracle --dry-run full -p "<task>" --file "src/**"`

- Token 检查：
  - `oracle --dry-run summary --files-report -p "<task>" --file "src/**"`

- 浏览器运行（主路径；长时间运行是正常的）：
  - `oracle --engine browser --model gpt-5.2-pro -p "<task>" --file "src/**"`

- 手动粘贴回退：
  - `oracle --render --copy -p "<task>" --file "src/**"`
  - 注意：`--copy` 是 `--copy-markdown` 的隐藏别名。

## 附加文件（`--file`）

`--file` 接受文件、目录和 glob。可以多次传递；条目可以用逗号分隔。

- 包含：
  - `--file "src/**"`
  - `--file src/index.ts`
  - `--file docs --file README.md`

- 排除：
  - `--file "src/**" --file "!src/**/*.test.ts" --file "!**/*.snap"`

- 默认值（实现行为）：
  - 默认忽略的目录：`node_modules`、`dist`、`coverage`、`.git`、`.turbo`、`.next`、`build`、`tmp`（除非作为字面目录/文件显式传递，否则跳过）。
  - 展开 glob 时遵守 `.gitignore`。
  - 不跟随符号链接。
  - 除非通过模式选择（例如 `--file ".github/**"`），否则过滤点文件。
  - 拒绝 > 1 MB 的文件。

## 引擎（API vs 浏览器）

- 自动选择：设置 `OPENAI_API_KEY` 时为 `api`；否则为 `browser`。
- 浏览器仅支持 GPT + Gemini；Claude/Grok/Codex 或多模型运行使用 `--engine api`。
- 浏览器附件：
  - `--browser-attachments auto|never|always`（auto 在约 60k 字符内内联粘贴，然后上传）。
- 远程浏览器主机：
  - 主机：`oracle serve --host 0.0.0.0 --port 9473 --token <secret>`
  - 客户端：`oracle --engine browser --remote-host <host:port> --remote-token <secret> -p "<task>" --file "src/**"`

## 会话 + slug

- 存储在 `~/.oracle/sessions`（使用 `ORACLE_HOME_DIR` 覆盖）。
- 运行可能分离或花费很长时间（浏览器 + GPT‑5.2 Pro 经常如此）。如果 CLI 超时：不要重新运行；重新连接。
  - 列表：`oracle status --hours 72`
  - 连接：`oracle session <id> --render`
- 使用 `--slug "<3-5 words>"` 保持会话 ID 可读。
- 存在重复提示保护；仅在真正需要全新运行时使用 `--force`。

## 提示模板（高信号）

Oracle 从**零**项目知识开始。假设模型无法推断你的技术栈、构建工具、约定或"显而易见"的路径。包含：
- 项目简介（技术栈 + 构建/测试命令 + 平台约束）。
- "东西在哪里"（关键目录、入口点、配置文件、边界）。
- 确切问题 + 你尝试过什么 + 错误文本（逐字）。
- 约束（"不要更改 X"、"必须保持公共 API"等）。
- 期望输出（"返回补丁计划 + 测试"、"给出 3 个带权衡的选项"）。

## 安全

- 默认不要附加机密（`.env`、密钥文件、认证令牌）。积极编辑；只分享必需的内容。

## "详尽提示"恢复模式

对于长时间调查，编写一个独立的提示 + 文件集，以便几天后可以重新运行：
- 6-30 句项目简介 + 目标。
- 复现步骤 + 确切错误 + 你尝试过什么。
- 附加所有需要的上下文文件（入口点、配置、关键模块、文档）。

Oracle 运行是一次性的；模型不记得之前的运行。"恢复上下文"意味着使用相同的提示 + `--file …` 集重新运行（或重新连接到仍在运行的存储会话）。
