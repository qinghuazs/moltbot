---
summary: "测试工具包：单元/e2e/在线套件、Docker 运行器，以及每类测试覆盖范围"
read_when:
  - 在本地或 CI 中运行测试
  - 为模型或提供方问题添加回归
  - 调试 gateway 与 agent 行为
---

# 测试

Moltbot 有三套 Vitest 测试（单元/集成、e2e、在线）以及一小组 Docker 运行器。

本文是“我们如何测试”的指南：
- 每个套件覆盖什么（以及明确**不**覆盖什么）
- 常见工作流要跑哪些命令（本地、推送前、调试）
- 在线测试如何发现凭据并选择模型/提供方
- 如何为真实世界的模型/提供方问题添加回归

## 快速开始

日常：
- 全量门禁（推送前的预期）：`pnpm lint && pnpm build && pnpm test`

当你动了测试或需要更高信心时：
- 覆盖率门禁：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实提供方/模型时（需要真实凭据）：
- 在线套件（模型 + gateway 工具/图片探测）：`pnpm test:live`

提示：只需要一个失败用例时，优先用下面的 allowlist 环境变量缩小在线测试范围。

## 测试套件（哪里跑，覆盖什么）

把这些套件理解为“现实度递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：`vitest.config.ts`
- 文件：`src/**/*.test.ts`
- 覆盖范围：
  - 纯单元测试
  - 进程内集成测试（gateway 认证、路由、工具、解析、配置）
  - 已知 bug 的确定性回归
- 预期：
  - CI 中运行
  - 不需要真实密钥
  - 应该快速且稳定

### E2E（gateway 烟测）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`
- 覆盖范围：
  - 多实例 gateway 的端到端行为
  - WebSocket/HTTP 面、节点配对，以及更重的网络交互
- 预期：
  - CI 中运行（当流水线启用时）
  - 不需要真实密钥
  - 比单元测试更复杂（可能更慢）

### 在线（真实提供方 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：**启用**（`pnpm test:live` 会设置 `CLAWDBOT_LIVE_TEST=1`）
- 覆盖范围：
  - “这个提供方/模型今天用真实凭据是否还能跑起来？”
  - 捕获提供方格式变化、工具调用怪异、认证问题和限流行为
- 预期：
  - 设计上不保证 CI 稳定（真实网络、真实提供方策略、配额、故障）
  - 需要花费资金/使用限额
  - 优先运行缩小范围的子集，而不是“全量”
  - 在线运行会 source `~/.profile` 以补齐缺失的 API key
  - Anthropic 密钥轮换：设置 `CLAWDBOT_LIVE_ANTHROPIC_KEYS="sk-...,sk-..."`（或 `CLAWDBOT_LIVE_ANTHROPIC_KEY=sk-...`）或多个 `ANTHROPIC_API_KEY*` 变量；测试在限流时会重试

## 我该跑哪个套件

使用这个决策表：
- 编辑逻辑/测试：运行 `pnpm test`（如果改动很多，加 `pnpm test:coverage`）
- 涉及 gateway 网络/WS 协议/配对：加上 `pnpm test:e2e`
- 调试“我的机器人挂了”/提供方特定故障/工具调用：运行缩小范围的 `pnpm test:live`

## 在线：模型烟测（profile keys）

在线测试分两层，便于隔离问题：
- “直接模型”告诉我们提供方/模型在该密钥下是否能回答。
- “Gateway 烟测”告诉我们完整的 gateway + agent 流程是否工作（会话、历史、工具、沙箱策略等）。

### 第 1 层：直接模型补全（无 gateway）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举发现的模型
  - 使用 `getApiKeyForModel` 选择你有凭据的模型
  - 每个模型跑一个小补全（必要时加针对性回归）
- 启用方式：
  - `pnpm test:live`（或直接跑 Vitest 时设置 `CLAWDBOT_LIVE_TEST=1`）
- 设置 `CLAWDBOT_LIVE_MODELS=modern`（或 `all`，是 modern 的别名）来真正运行这个套件；否则会跳过以保持 `pnpm test:live` 聚焦 gateway 烟测
- 选择模型：
  - `CLAWDBOT_LIVE_MODELS=modern` 运行现代 allowlist（Opus/Sonnet/Haiku 4.5，GPT-5.x + Codex，Gemini 3，GLM 4.7，MiniMax M2.1，Grok 4）
  - `CLAWDBOT_LIVE_MODELS=all` 是 modern allowlist 的别名
  - 或 `CLAWDBOT_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,..."`（逗号 allowlist）
- 选择提供方：
  - `CLAWDBOT_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号 allowlist）
- 密钥来源：
  - 默认：profile 存储与环境变量兜底
  - 设置 `CLAWDBOT_LIVE_REQUIRE_PROFILE_KEYS=1` 强制 **仅**使用 profile 存储
- 设计目的：
  - 将“提供方 API 挂了/密钥无效”与“gateway agent 管道挂了”分离
  - 容纳小而隔离的回归（示例：OpenAI Responses/Codex Responses 推理回放 + 工具调用流程）

### 第 2 层：Gateway + 开发 agent 烟测（@moltbot 实际做的事）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内 gateway
  - 创建或补丁 `agent:dev:*` 会话（每次运行覆盖模型）
  - 遍历有 key 的模型并断言：
    - “有意义”的回复（不调用工具）
    - 真实工具调用可用（read 探测）
    - 可选的额外工具探测（exec + read 探测）
    - OpenAI 回归路径（仅工具调用 → 后续）持续工作
- 探测细节（便于快速解释失败原因）：
  - `read` 探测：测试在工作区写一个随机文件，然后让 agent `read` 并回显随机值。
  - `exec+read` 探测：测试让 agent 用 `exec` 写入随机值到临时文件，再 `read` 回来。
  - 图片探测：测试附加一个生成的 PNG（cat + 随机码），期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 与 `src/gateway/live-image-probe.ts`。
- 启用方式：
  - `pnpm test:live`（或直接跑 Vitest 时设置 `CLAWDBOT_LIVE_TEST=1`）
- 选择模型：
  - 默认：现代 allowlist（Opus/Sonnet/Haiku 4.5，GPT-5.x + Codex，Gemini 3，GLM 4.7，MiniMax M2.1，Grok 4）
  - `CLAWDBOT_LIVE_GATEWAY_MODELS=all` 是现代 allowlist 的别名
  - 或设置 `CLAWDBOT_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）以缩小范围
- 选择提供方（避免“OpenRouter 全家桶”）：
  - `CLAWDBOT_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号 allowlist）
- 工具 + 图片探测在这个在线测试中始终启用：
  - `read` 探测 + `exec+read` 探测（工具压力）
  - 当模型宣称支持图片输入时，会运行图片探测
  - 流程（高层）：
    - 测试生成一个写有 “CAT” + 随机码的 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` 的 `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
    - Gateway 将 attachments 解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式 agent 向模型发送多模态用户消息
    - 断言：回复包含 `cat` + 随机码（OCR 容忍轻微错误）

提示：要查看你机器上能测什么（以及准确的 `provider/model` id），运行：

```bash
moltbot models list
moltbot models list --json
```

## 在线：Anthropic setup-token 烟测

- 测试：`src/agents/anthropic.setup-token.live.test.ts`
- 目标：验证 Claude Code CLI setup-token（或粘贴的 setup-token profile）能完成 Anthropic 提示词。
- 启用：
  - `pnpm test:live`（或直接跑 Vitest 时设置 `CLAWDBOT_LIVE_TEST=1`）
  - `CLAWDBOT_LIVE_SETUP_TOKEN=1`
- Token 来源（任选其一）：
  - Profile：`CLAWDBOT_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始 token：`CLAWDBOT_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆盖（可选）：
  - `CLAWDBOT_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-5`

示例配置：

```bash
moltbot models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
CLAWDBOT_LIVE_SETUP_TOKEN=1 CLAWDBOT_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## 在线：CLI 后端烟测（Claude Code CLI 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：在不触碰默认配置的前提下，用本地 CLI 后端验证 Gateway + agent 管线。
- 启用：
  - `pnpm test:live`（或直接跑 Vitest 时设置 `CLAWDBOT_LIVE_TEST=1`）
  - `CLAWDBOT_LIVE_CLI_BACKEND=1`
- 默认：
  - 模型：`claude-cli/claude-sonnet-4-5`
  - 命令：`claude`
  - 参数：`["-p","--output-format","json","--dangerously-skip-permissions"]`
- 覆盖（可选）：
  - `CLAWDBOT_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-5"`
  - `CLAWDBOT_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.2-codex"`
  - `CLAWDBOT_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `CLAWDBOT_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `CLAWDBOT_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `CLAWDBOT_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 发送真实图片附件（路径会注入提示词）
  - `CLAWDBOT_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 把图片路径当作 CLI 参数传入，而不是注入提示词
  - `CLAWDBOT_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）控制当 `IMAGE_ARG` 设置时图片参数的传递方式
  - `CLAWDBOT_LIVE_CLI_BACKEND_RESUME_PROBE=1` 发送第二轮并验证 resume 流程
- `CLAWDBOT_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 保持 Claude Code CLI 的 MCP 配置启用（默认会用临时空文件禁用 MCP 配置）

示例：

```bash
CLAWDBOT_LIVE_CLI_BACKEND=1 \
  CLAWDBOT_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-5" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推荐的在线配方

范围小、明确的 allowlist 最快也最不容易抖：

- 单模型，直连（无 gateway）：
  - `CLAWDBOT_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单模型，gateway 烟测：
  - `CLAWDBOT_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多家提供方的工具调用：
  - `CLAWDBOT_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 聚焦（Gemini API key + Antigravity）：
  - Gemini（API key）：`CLAWDBOT_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity（OAuth）：`CLAWDBOT_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

说明：
- `google/...` 使用 Gemini API（API key）。
- `google-antigravity/...` 使用 Antigravity OAuth 桥接（Cloud Code Assist 风格的 agent 端点）。
- `google-gemini-cli/...` 使用你本机的 Gemini CLI（二次认证 + 工具行为差异）。
- Gemini API 与 Gemini CLI：
  - API：Moltbot 通过 HTTP 调用 Google 托管的 Gemini API（API key / profile 认证）；这也是大多数用户所说的“Gemini”。
  - CLI：Moltbot 调用本地 `gemini` 二进制；它有自己的认证，行为也可能不同（流式/工具支持/版本差异）。

## 在线：模型矩阵（覆盖范围）

没有固定的“CI 模型清单”（在线测试是自愿开启），但以下是建议在带有密钥的开发机上**定期**覆盖的模型。

### 现代烟测集合（工具调用 + 图片）

这是我们希望持续可用的“常用模型”集合：
- OpenAI（非 Codex）：`openai/gpt-5.2`（可选：`openai/gpt-5.1`）
- OpenAI Codex：`openai-codex/gpt-5.2`（可选：`openai-codex/gpt-5.2-codex`）
- Anthropic：`anthropic/claude-opus-4-5`（或 `anthropic/claude-sonnet-4-5`）
- Google（Gemini API）：`google/gemini-3-pro-preview` 和 `google/gemini-3-flash-preview`（避免旧的 Gemini 2.x 模型）
- Google（Antigravity）：`google-antigravity/claude-opus-4-5-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI（GLM）：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.1`

运行带工具 + 图片的 gateway 烟测：
`CLAWDBOT_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基础线：工具调用（Read + 可选 Exec）

每个提供方家族至少选一个：
- OpenAI：`openai/gpt-5.2`（或 `openai/gpt-5-mini`）
- Anthropic：`anthropic/claude-opus-4-5`（或 `anthropic/claude-sonnet-4-5`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3-pro-preview`）
- Z.AI（GLM）：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.1`

可选额外覆盖（锦上添花）：
- xAI：`xai/grok-4`（或最新可用）
- Mistral：`mistral/`…（选一个支持 tools 的模型）
- Cerebras：`cerebras/`…（如果你有权限）
- LM Studio：`lmstudio/`…（本地；工具调用取决于 API 模式）

### 视觉：图片发送（附件 → 多模态消息）

在 `CLAWDBOT_LIVE_GATEWAY_MODELS` 中至少包含一个支持图片的模型（Claude/Gemini/OpenAI 的视觉版本等）以覆盖图片探测。

### 聚合器 / 备用网关

如果你启用了密钥，我们也支持通过以下方式测试：
- OpenRouter：`openrouter/...`（模型很多；用 `moltbot models scan` 找到支持工具+图片的候选）
- OpenCode Zen：`opencode/...`（认证通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`）

在线矩阵中可包含的更多提供方（前提是你有凭据/配置）：
- 内置：`openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax`（云/API），以及任何 OpenAI/Anthropic 兼容代理（LM Studio、vLLM、LiteLLM 等）

提示：不要在文档里硬编码“所有模型”。权威清单是你的机器上 `discoverModels(...)` 的返回结果，以及当下可用的密钥。

## 凭据（不要提交）

在线测试发现凭据的方式与 CLI 一致。现实含义：
- 如果 CLI 能用，在线测试就应该能找到同样的密钥。
- 如果在线测试提示“无凭据”，请用同样方式调试 `moltbot models list` / 模型选择。

- Profile 存储：`~/.clawdbot/credentials/`（首选；测试中所谓的“profile keys”就是它）
- 配置：`~/.clawdbot/moltbot.json`（或 `CLAWDBOT_CONFIG_PATH`）

如果你想依赖环境变量（例如导出在 `~/.profile`），请在 `source ~/.profile` 后运行本地测试，或使用下面的 Docker 运行器（可把 `~/.profile` 挂载进容器）。

## Deepgram 在线（音频转写）

- 测试：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Docker 运行器（可选的“Linux 可用”检查）

这些在仓库 Docker 镜像中运行 `pnpm test:live`，并挂载你的本地配置目录和工作区（如果挂载了 `~/.profile`，则会 source）：

- 直连模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- Gateway + 开发 agent：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Onboarding 向导（TTY，全量脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Gateway 网络（两个容器，WS 认证 + 健康检查）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 插件（自定义扩展加载 + 注册表烟测）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

常用环境变量：

- `CLAWDBOT_CONFIG_DIR=...`（默认：`~/.clawdbot`）挂载到 `/home/node/.clawdbot`
- `CLAWDBOT_WORKSPACE_DIR=...`（默认：`~/clawd`）挂载到 `/home/node/clawd`
- `CLAWDBOT_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试前 source
- `CLAWDBOT_LIVE_GATEWAY_MODELS=...` / `CLAWDBOT_LIVE_MODELS=...` 用于缩小运行范围
- `CLAWDBOT_LIVE_REQUIRE_PROFILE_KEYS=1` 确保凭据来自 profile 存储（而不是环境变量）

## 文档自检

文档修改后运行检查：`pnpm docs:list`。

## 离线回归（CI 安全）

这些是无需真实提供方的“真实管线”回归：
- Gateway 工具调用（mock OpenAI，真实 gateway + agent 循环）：`src/gateway/gateway.tool-calling.mock-openai.test.ts`
- Gateway 向导（WS `wizard.start`/`wizard.next`，写配置 + 认证强制）：`src/gateway/gateway.wizard.e2e.test.ts`

## Agent 可靠性评估（技能）

我们已有少量 CI 安全测试，行为类似“agent 可靠性评估”：
- 通过真实 gateway + agent 循环的 mock 工具调用（`src/gateway/gateway.tool-calling.mock-openai.test.ts`）。
- 端到端向导流程，验证会话连线与配置影响（`src/gateway/gateway.wizard.e2e.test.ts`）。

技能仍缺的内容（见 [Skills](/tools/skills)）：
- **决策选择**：当提示词列出技能时，agent 是否会选择正确技能（或避开无关技能）
- **合规性**：agent 是否在使用前阅读 `SKILL.md` 并遵循必须的步骤/参数
- **流程契约**：多轮场景，断言工具顺序、会话历史延续，以及沙箱边界

未来评估应先保持确定性：
- 一个基于 mock 提供方的场景运行器，用于断言工具调用与顺序、技能文件读取、会话连线
- 一小套以技能为中心的场景（使用 vs 避免、 gating、提示词注入）
- 只有在 CI 安全集就绪后才考虑可选的在线评估（需显式开启、环境变量控制）

## 添加回归（指南）

当你修复了在线测试中发现的提供方/模型问题时：
- 尽量添加 CI 安全回归（mock/存根提供方，或捕获请求形状变换）
- 若本质上只能在线覆盖（限流、认证策略），保持在线测试范围小，并通过环境变量显式开启
- 优先定位最小层级来捕获 bug：
  - 提供方请求转换/回放 bug → 直连模型测试
  - gateway 会话/历史/工具管线 bug → gateway 在线烟测或 CI 安全的 gateway mock 测试
