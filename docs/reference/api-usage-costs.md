---
summary: "审计哪些功能会花费费用、使用哪些 key 以及如何查看用量"
read_when:
  - 想了解哪些功能会调用付费 API
  - 需要审计 key、成本与用量展示
  - 需要解释 /status 或 /usage 的成本报告
---
# API 用量与成本

本文列出**可能调用 API key 的功能**以及成本如何显示，聚焦于 Moltbot 中会产生 provider 用量或付费 API 调用的功能。

## 成本显示位置（聊天与 CLI）

**每会话成本快照**
- `/status` 显示当前会话模型、上下文用量与最近回复 token。
- 若模型使用 **API key 认证**，`/status` 还会显示上一次回复的**估算成本**。

**每消息成本尾注**
- `/usage full` 会在每条回复后追加用量尾注，包含**估算成本**（仅 API key）。
- `/usage tokens` 只显示 token；OAuth 流程会隐藏美元成本。

**CLI 用量窗口（provider 配额）**
- `moltbot status --usage` 与 `moltbot channels list` 显示 provider **用量窗口**
  （配额快照，而非逐条成本）。

详见 [Token use & costs](/token-use) 的细节与示例。

## Key 的发现方式

Moltbot 会从以下来源获取凭据：
- **认证配置**（按代理，存于 `auth-profiles.json`）。
- **环境变量**（如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **配置**（`models.providers.*.apiKey`、`tools.web.search.*`、`tools.web.fetch.firecrawl.*`、
  `memorySearch.*`、`talk.apiKey`）。
- **技能**（`skills.entries.<name>.apiKey`），可将 key 注入技能进程环境。

## 可能消耗 key 的功能

### 1) 核心模型回复（聊天与工具）
每条回复或工具调用都会使用**当前模型 provider**（OpenAI、Anthropic 等）。这是主要的用量与成本来源。

定价配置见 [Models](/providers/models)，显示见 [Token use & costs](/token-use)。

### 2) 媒体理解（音频或图像或视频）
入站媒体可在回复前进行摘要或转写，会调用模型或 provider API。

- 音频：OpenAI / Groq / Deepgram（存在 key 时**自动启用**）。
- 图像：OpenAI / Anthropic / Google。
- 视频：Google。

见 [Media understanding](/nodes/media-understanding)。

### 3) 记忆嵌入与语义搜索
语义记忆搜索在配置为远程 provider 时会使用**嵌入 API**：
- `memorySearch.provider = "openai"` -> OpenAI embeddings
- `memorySearch.provider = "gemini"` -> Gemini embeddings
- 如本地嵌入失败，可选回退到 OpenAI

可使用 `memorySearch.provider = "local"` 保持本地（不消耗 API）。

见 [Memory](/concepts/memory)。

### 4) Web 搜索工具（Brave / Perplexity 经 OpenRouter）
`web_search` 使用 API key，可能产生费用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `tools.web.search.apiKey`
- **Perplexity**（经 OpenRouter）：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

**Brave 免费额度（较充足）：**
- **每月 2,000 次请求**
- **每秒 1 次请求**
- **需要信用卡验证**（不会收费，除非升级）

见 [Web tools](/tools/web)。

### 5) Web 抓取工具（Firecrawl）
`web_fetch` 在提供 API key 时可调用 **Firecrawl**：
- `FIRECRAWL_API_KEY` 或 `tools.web.fetch.firecrawl.apiKey`

如果未配置 Firecrawl，工具会回退到直接抓取 + 可读性解析（不收费）。

见 [Web tools](/tools/web)。

### 6) Provider 用量快照（status 或 health）
一些状态命令会调用 **provider 用量端点** 展示配额窗口或认证健康。通常是低频调用，但仍会触达 provider API：
- `moltbot status --usage`
- `moltbot models status --json`

见 [Models CLI](/cli/models)。

### 7) 压缩兜底摘要
压缩兜底可能使用**当前模型**对会话历史做摘要，运行时会调用 provider API。

见 [Session management + compaction](/reference/session-management-compaction)。

### 8) 模型扫描与探测
`moltbot models scan` 在启用探测时会使用 `OPENROUTER_API_KEY` 探测 OpenRouter 模型。

见 [Models CLI](/cli/models)。

### 9) Talk（语音）
Talk 模式在配置时可调用 **ElevenLabs**：
- `ELEVENLABS_API_KEY` 或 `talk.apiKey`

见 [Talk mode](/nodes/talk)。

### 10) 技能（第三方 API）
技能可以把 `apiKey` 存在 `skills.entries.<name>.apiKey`。如果该技能使用该 key 调用外部 API，将按照技能提供商的规则计费。

见 [Skills](/tools/skills)。
