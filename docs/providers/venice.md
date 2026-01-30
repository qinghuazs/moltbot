---
summary: "在 Moltbot 中使用 Venice AI 的隐私优先模型"
read_when:
  - 想在 Moltbot 中进行隐私优先推理
  - 需要 Venice AI 设置指南
---
# Venice AI（Venice 重点推荐）

**Venice** 是我们推荐的 Venice 隐私优先推理方案，可选通过匿名代理访问专有模型。

Venice AI 提供隐私优先的 AI 推理，支持无审查模型，并通过匿名代理访问主流专有模型。所有推理默认私密，不训练你的数据，不记录日志。

## 为什么在 Moltbot 中使用 Venice

- **私密推理**：开源模型不记录日志。
- **无审查模型**：在需要时可用。
- **匿名访问**：在质量重要时访问专有模型（Opus/GPT/Gemini）。
- OpenAI 兼容 `/v1` 端点。

## 隐私模式

Venice 提供两种隐私等级，理解它们对选型至关重要：

| 模式 | 说明 | 模型 |
|------|-------------|--------|
| **Private** | 完全私密。提示与回复**不存储不记录**，短暂存在。 | Llama、Qwen、DeepSeek、Venice Uncensored 等 |
| **Anonymized** | 通过 Venice 代理并去除元数据。底层提供商（OpenAI、Anthropic）看到匿名请求。 | Claude、GPT、Gemini、Grok、Kimi、MiniMax |

## 特性

- **隐私优先**：在 “private”（完全私密）与 “anonymized”（匿名代理）之间选择
- **无审查模型**：访问不带内容限制的模型
- **主流模型访问**：通过匿名代理使用 Claude、GPT-5.2、Gemini、Grok
- **OpenAI 兼容 API**：标准 `/v1` 端点便于集成
- **Streaming**：✅ 全部模型支持
- **Function calling**：✅ 部分模型支持（查看模型能力）
- **Vision**：✅ 支持具备视觉能力的模型
- **无硬性限流**：极端使用可能触发公平使用限速

## 设置

### 1. 获取 API Key

1. 在 [venice.ai](https://venice.ai) 注册
2. 进入 **Settings → API Keys → Create new key**
3. 复制 API key（格式：`vapi_xxxxxxxxxxxx`）

### 2. 配置 Moltbot

**选项 A：环境变量**

```bash
export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
```

**选项 B：交互式设置（推荐）**

```bash
moltbot onboard --auth-choice venice-api-key
```

该流程会：
1. 提示输入 API key（或使用现有 `VENICE_API_KEY`）
2. 展示所有可用 Venice 模型
3. 让你选择默认模型
4. 自动配置 provider

**选项 C：非交互**

```bash
moltbot onboard --non-interactive \
  --auth-choice venice-api-key \
  --venice-api-key "vapi_xxxxxxxxxxxx"
```

### 3. 验证设置

```bash
moltbot chat --model venice/llama-3.3-70b "Hello, are you working?"
```

## 模型选择

设置完成后，Moltbot 会展示所有可用 Venice 模型。根据需求选择：

- **默认推荐**：`venice/llama-3.3-70b`，私密且性能均衡。
- **综合最佳**：`venice/claude-opus-45`，适合难题（Opus 依旧最强）。
- **隐私**：选择 “private” 模型获取完全私密推理。
- **能力**：选择 “anonymized” 模型，通过 Venice 代理访问 Claude、GPT、Gemini。

随时切换默认模型：

```bash
moltbot models set venice/claude-opus-45
moltbot models set venice/llama-3.3-70b
```

列出可用模型：

```bash
moltbot models list | grep venice
```

## 通过 `moltbot configure` 配置

1. 运行 `moltbot configure`
2. 选择 **Model/auth**
3. 选择 **Venice AI**

## 我该选哪个模型

| 用例 | 推荐模型 | 原因 |
|----------|-------------------|-----|
| **日常聊天** | `llama-3.3-70b` | 综合表现好，完全私密 |
| **综合最佳质量** | `claude-opus-45` | Opus 仍是难题最强 |
| **隐私 + Claude 质量** | `claude-opus-45` | 匿名代理下的最佳推理 |
| **编码** | `qwen3-coder-480b-a35b-instruct` | 代码优化，262k 上下文 |
| **视觉任务** | `qwen3-vl-235b-a22b` | 最佳私密视觉模型 |
| **无审查** | `venice-uncensored` | 无内容限制 |
| **快且便宜** | `qwen3-4b` | 轻量但仍可用 |
| **复杂推理** | `deepseek-v3.2` | 推理强，私密 |

## 可用模型（共 25 个）

### Private 模型（15 个）- 完全私密，无日志

| Model ID | 名称 | 上下文（tokens） | 特性 |
|----------|------|------------------|----------|
| `llama-3.3-70b` | Llama 3.3 70B | 131k | General |
| `llama-3.2-3b` | Llama 3.2 3B | 131k | Fast, lightweight |
| `hermes-3-llama-3.1-405b` | Hermes 3 Llama 3.1 405B | 131k | Complex tasks |
| `qwen3-235b-a22b-thinking-2507` | Qwen3 235B Thinking | 131k | Reasoning |
| `qwen3-235b-a22b-instruct-2507` | Qwen3 235B Instruct | 131k | General |
| `qwen3-coder-480b-a35b-instruct` | Qwen3 Coder 480B | 262k | Code |
| `qwen3-next-80b` | Qwen3 Next 80B | 262k | General |
| `qwen3-vl-235b-a22b` | Qwen3 VL 235B | 262k | Vision |
| `qwen3-4b` | Venice Small（Qwen3 4B） | 32k | Fast, reasoning |
| `deepseek-v3.2` | DeepSeek V3.2 | 163k | Reasoning |
| `venice-uncensored` | Venice Uncensored | 32k | Uncensored |
| `mistral-31-24b` | Venice Medium（Mistral） | 131k | Vision |
| `google-gemma-3-27b-it` | Gemma 3 27B Instruct | 202k | Vision |
| `openai-gpt-oss-120b` | OpenAI GPT OSS 120B | 131k | General |
| `zai-org-glm-4.7` | GLM 4.7 | 202k | Reasoning, multilingual |

### Anonymized 模型（10 个）- 经 Venice 代理

| Model ID | 原始模型 | 上下文（tokens） | 特性 |
|----------|----------|------------------|----------|
| `claude-opus-45` | Claude Opus 4.5 | 202k | Reasoning, vision |
| `claude-sonnet-45` | Claude Sonnet 4.5 | 202k | Reasoning, vision |
| `openai-gpt-52` | GPT-5.2 | 262k | Reasoning |
| `openai-gpt-52-codex` | GPT-5.2 Codex | 262k | Reasoning, vision |
| `gemini-3-pro-preview` | Gemini 3 Pro | 202k | Reasoning, vision |
| `gemini-3-flash-preview` | Gemini 3 Flash | 262k | Reasoning, vision |
| `grok-41-fast` | Grok 4.1 Fast | 262k | Reasoning, vision |
| `grok-code-fast-1` | Grok Code Fast 1 | 262k | Reasoning, code |
| `kimi-k2-thinking` | Kimi K2 Thinking | 262k | Reasoning |
| `minimax-m21` | MiniMax M2.1 | 202k | Reasoning |

## 模型发现

当设置 `VENICE_API_KEY` 时，Moltbot 会从 Venice API 自动发现模型。若 API 不可达，会回退到静态目录。

`/models` 端点是公开的（列出无需认证），但推理需要有效 API key。

## Streaming 与工具支持

| 特性 | 支持 |
|---------|---------|
| **Streaming** | ✅ 全部模型 |
| **Function calling** | ✅ 多数模型（查看 API 中的 `supportsFunctionCalling`） |
| **Vision/Images** | ✅ 标注含 Vision 的模型 |
| **JSON mode** | ✅ 通过 `response_format` 支持 |

## 定价

Venice 使用积分体系。请查看 [venice.ai/pricing](https://venice.ai/pricing)：

- **Private 模型**：通常更低成本
- **Anonymized 模型**：接近直连 API 定价 + 少量 Venice 费用

## 对比：Venice 与直连 API

| 维度 | Venice（Anonymized） | 直连 API |
|--------|---------------------|------------|
| **隐私** | 去元数据，匿名 | 账户关联 |
| **延迟** | +10-50ms（代理） | 直连 |
| **功能** | 支持大多数功能 | 全功能 |
| **计费** | Venice 积分 | 提供商计费 |

## 使用示例

```bash
# 使用默认私密模型
moltbot chat --model venice/llama-3.3-70b

# 通过 Venice 使用 Claude（匿名）
moltbot chat --model venice/claude-opus-45

# 使用无审查模型
moltbot chat --model venice/venice-uncensored

# 使用视觉模型
moltbot chat --model venice/qwen3-vl-235b-a22b

# 使用编码模型
moltbot chat --model venice/qwen3-coder-480b-a35b-instruct
```

## 故障排查

### API key 未识别

```bash
echo $VENICE_API_KEY
moltbot models list | grep venice
```

确认 key 以 `vapi_` 开头。

### 模型不可用

Venice 模型目录是动态更新的。运行 `moltbot models list` 查看当前可用模型。部分模型可能临时离线。

### 连接问题

Venice API 为 `https://api.venice.ai/api/v1`。确认网络允许 HTTPS 连接。

## 配置文件示例

```json5
{
  env: { VENICE_API_KEY: "vapi_..." },
  agents: { defaults: { model: { primary: "venice/llama-3.3-70b" } } },
  models: {
    mode: "merge",
    providers: {
      venice: {
        baseUrl: "https://api.venice.ai/api/v1",
        apiKey: "${VENICE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "llama-3.3-70b",
            name: "Llama 3.3 70B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

## 链接

- [Venice AI](https://venice.ai)
- [API Documentation](https://docs.venice.ai)
- [Pricing](https://venice.ai/pricing)
- [Status](https://status.venice.ai)
