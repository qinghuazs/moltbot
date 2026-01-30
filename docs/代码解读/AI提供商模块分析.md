# AI 提供商模块深度分析

## 1. AI 模型提供商的抽象层设计

### 1.1 核心类型定义

**文件位置**: `src/config/types.models.ts`

Moltbot 定义了统一的提供商抽象层：

```typescript
// 支持的 API 类型
type ModelApi =
  | "openai-completions"      // OpenAI 兼容 API
  | "openai-responses"        // OpenAI Responses API
  | "anthropic-messages"      // Anthropic Messages API
  | "google-generative-ai"    // Google Gemini API
  | "github-copilot"          // GitHub Copilot API
  | "bedrock-converse-stream" // AWS Bedrock API

// 模型兼容性配置
type ModelCompatConfig = {
  supportsStore?: boolean;              // 是否支持缓存存储
  supportsDeveloperRole?: boolean;      // 是否支持 developer 角色
  supportsReasoningEffort?: boolean;    // 是否支持推理强度控制
  maxTokensField?: "max_completion_tokens" | "max_tokens";
}

// 提供商配置
type ModelProviderConfig = {
  baseUrl: string;                      // API 基础 URL
  apiKey?: string;                      // API 密钥
  auth?: ModelProviderAuthMode;         // 认证模式
  api?: ModelApi;                       // API 类型
  headers?: Record<string, string>;     // 自定义请求头
  authHeader?: boolean;                 // 是否使用认证头
  models: ModelDefinitionConfig[];      // 模型定义列表
}
```

### 1.2 提供商配置管理

**文件位置**: `src/agents/models-config.providers.ts`

该文件实现了提供商的动态发现和配置：

- **隐式提供商解析**: `resolveImplicitProviders()` 函数自动发现已配置的提供商
- **提供商标准化**: `normalizeProviders()` 函数处理配置规范化，包括：
  - API 密钥格式修正（去除 `${ENV_VAR}` 包装）
  - 从环境变量或认证配置文件自动填充缺失的 API 密钥
  - Google 模型 ID 标准化（如 `gemini-3-pro` → `gemini-3-pro-preview`）

## 2. 支持的提供商实现

### 2.1 内置提供商

**MiniMax**:
```typescript
{
  baseUrl: "https://api.minimax.chat/v1",
  api: "openai-completions",
  models: [
    { id: "MiniMax-M2.1", contextWindow: 200000, maxTokens: 8192 },
    { id: "MiniMax-VL-01", input: ["text", "image"] }
  ]
}
```

**Moonshot (Kimi)**:
```typescript
{
  baseUrl: "https://api.moonshot.ai/v1",
  api: "openai-completions",
  models: [{ id: "kimi-k2.5", contextWindow: 256000 }]
}
```

**Kimi Code**:
```typescript
{
  baseUrl: "https://api.kimi.com/coding/v1",
  api: "openai-completions",
  models: [{
    id: "kimi-for-coding",
    reasoning: true,
    contextWindow: 262144,
    maxTokens: 32768,
    headers: { "User-Agent": "KimiCLI/0.77" },
    compat: { supportsDeveloperRole: false }
  }]
}
```

**Qwen Portal**:
```typescript
{
  baseUrl: "https://portal.qwen.ai/v1",
  api: "openai-completions",
  models: [
    { id: "coder-model", name: "Qwen Coder" },
    { id: "vision-model", input: ["text", "image"] }
  ]
}
```

**Ollama**:
- 动态发现本地 Ollama 实例的模型
- 通过 `http://127.0.0.1:11434/api/tags` 获取模型列表
- 自动检测推理模型（名称包含 "r1" 或 "reasoning"）

**GitHub Copilot**:
- 动态交换 GitHub Token 获取 Copilot API Token
- 自动发现 Copilot 可用模型
- 支持从环境变量或认证配置文件获取凭证

**AWS Bedrock**:
- 动态发现 AWS Bedrock 可用模型
- 支持 AWS SDK 认证链
- 可配置区域和提供商过滤

### 2.2 提供商特定实现

**Google/Gemini 处理** (`src/agents/pi-embedded-helpers/google.ts`):
- 消息顺序清理：确保 function_call 在 user turn 之后
- 工具模式转换：将 Moltbot 工具定义转换为 Google 格式

**OpenAI 推理处理** (`src/agents/pi-embedded-helpers/openai.ts`):
- 推理块降级：处理不完整的 reasoning 签名
- 防止会话转录损坏

## 3. API 调用和响应处理

### 3.1 统一的运行器架构

**文件位置**: `src/agents/pi-embedded-runner/run.ts`

核心执行流程:

```typescript
async function runEmbeddedPiAgent(params: RunEmbeddedPiAgentParams) {
  // 1. 模型解析
  const { model, authStorage, modelRegistry } = resolveModel(
    provider, modelId, agentDir, config
  );

  // 2. 上下文窗口检查
  const ctxInfo = resolveContextWindowInfo({...});
  const ctxGuard = evaluateContextWindowGuard({...});

  // 3. 认证配置文件解析
  const authStore = ensureAuthProfileStore(agentDir);
  const profileOrder = resolveAuthProfileOrder({...});

  // 4. 多配置文件重试循环
  for (const profileId of profileCandidates) {
    try {
      const result = await runEmbeddedAttempt({...});
      return result;
    } catch (error) {
      // 错误分类和重试逻辑
    }
  }
}
```

### 3.2 请求执行

**文件位置**: `src/agents/pi-embedded-runner/run/attempt.ts`

实际 API 调用:

```typescript
async function runEmbeddedAttempt(params: EmbeddedRunAttemptParams) {
  // 1. 工作区和沙箱设置
  const sandbox = await resolveSandboxContext({...});

  // 2. 工具创建
  const tools = createMoltbotCodingTools({...});
  const sanitizedTools = sanitizeToolsForGoogle({...});

  // 3. 系统提示构建
  const systemPrompt = buildEmbeddedSystemPrompt({...});

  // 4. 会话管理器初始化
  const sessionManager = await prepareSessionManagerForRun({...});

  // 5. 流式执行
  const stream = streamSimple({
    model, messages, tools, systemPrompt,
    ...extraParams
  });

  // 6. 订阅流式响应
  const subscription = subscribeEmbeddedPiSession({
    stream,
    onBlockReply: (reply) => {...},
    onToolResult: (result) => {...}
  });
}
```

## 4. 流式响应处理

### 4.1 流式订阅架构

**文件位置**: `src/agents/pi-embedded-subscribe.ts`

核心状态管理:

```typescript
type EmbeddedPiSubscribeState = {
  assistantTexts: string[];           // 累积的助手文本
  toolMetas: ToolMeta[];              // 工具元数据
  blockReplyBreak: "text_end" | "message_end";
  reasoningMode: "off" | "on" | "stream";
  deltaBuffer: string;                // 增量缓冲区
  blockBuffer: string;                // 块缓冲区
  blockState: {
    thinking: boolean;                // 是否在思考块内
    final: boolean;                   // 是否在最终块内
    inlineCode: InlineCodeState;      // 内联代码状态
  };
  lastStreamedAssistant?: string;     // 最后流式传输的助手文本
  compactionInFlight: boolean;        // 压缩是否进行中
  messagingToolSentTexts: string[];   // 消息工具发送的文本
}
```

### 4.2 块标签处理

思考标签剥离:

```typescript
function stripBlockTags(text: string, state: BlockState): string {
  // 1. 处理 <think> 块（有状态，剥离内部内容）
  let inThinking = state.thinking;
  for (const match of text.matchAll(THINKING_TAG_SCAN_RE)) {
    if (!inThinking) {
      processed += text.slice(lastIndex, idx);
    }
    inThinking = !match[1]; // "/" 表示关闭标签
  }

  // 2. 处理 <final> 块（有状态，剥离外部内容）
  if (params.enforceFinalTag) {
    // 仅返回 <final> 块内的文本
  }
}
```

### 4.3 块回复分块

**文件位置**: `src/agents/pi-embedded-block-chunker.ts`

支持多种分块策略：
- **段落优先**: 在段落边界分块
- **长度限制**: 按字符数分块
- **换行模式**: 在换行符处分块

## 5. 错误处理和重试机制

### 5.1 错误分类

**文件位置**: `src/agents/pi-embedded-helpers/errors.ts`

详细的错误模式匹配:

```typescript
const ERROR_PATTERNS = {
  rateLimit: [
    /rate[_ ]limit|too many requests|429/,
    "exceeded your current quota",
    "resource has been exhausted"
  ],
  overloaded: [/overloaded_error/, "overloaded"],
  timeout: ["timeout", "timed out", "deadline exceeded"],
  billing: [/\b402\b/, "payment required", "insufficient credits"],
  auth: [
    /invalid[_ ]?api[_ ]?key/,
    "incorrect api key",
    "unauthorized",
    /\b401\b/, /\b403\b/
  ],
  format: [
    "string should match pattern",
    "tool_use.id",
    "invalid request format"
  ]
}
```

### 5.2 错误处理函数

**上下文溢出检测**:
```typescript
function isContextOverflowError(errorMessage?: string): boolean {
  const lower = errorMessage.toLowerCase();
  return (
    lower.includes("request_too_large") ||
    lower.includes("context length exceeded") ||
    lower.includes("maximum context length") ||
    lower.includes("prompt is too long") ||
    lower.includes("exceeds model context window")
  );
}
```

**错误格式化**:
```typescript
function formatAssistantErrorText(msg: AssistantMessage): string {
  const raw = msg.errorMessage?.trim();

  // 1. 未知工具错误 → 沙箱策略消息
  if (raw.match(/unknown tool/i)) {
    return formatSandboxToolPolicyBlockedMessage({...});
  }

  // 2. 上下文溢出 → 用户友好消息
  if (isContextOverflowError(raw)) {
    return "Context overflow: prompt too large...";
  }

  // 3. 角色顺序错误 → 会话重置建议
  if (/roles must alternate/i.test(raw)) {
    return "Message ordering conflict - use /new...";
  }

  // 4. 过载错误 → 重试建议
  if (isOverloadedErrorMessage(raw)) {
    return "The AI service is temporarily overloaded...";
  }
}
```

### 5.3 重试策略

**认证配置文件轮换** (`src/agents/pi-embedded-runner/run.ts`):

```typescript
// 多配置文件候选列表
const profileCandidates = lockedProfileId
  ? [lockedProfileId]
  : profileOrder.length > 0
    ? profileOrder
    : [undefined];

let profileIndex = 0;

// 重试循环
while (profileIndex < profileCandidates.length) {
  const currentProfile = profileCandidates[profileIndex];

  // 检查冷却期
  if (isProfileInCooldown(authStore, currentProfile)) {
    profileIndex++;
    continue;
  }

  try {
    const result = await runEmbeddedAttempt({...});
    markAuthProfileGood(authStore, currentProfile);
    return result;
  } catch (error) {
    if (isAuthAssistantError(error)) {
      markAuthProfileFailure(authStore, currentProfile);
      profileIndex++;
      continue;
    }
    throw error;
  }
}
```

**故障转移错误** (`src/agents/failover-error.ts`):

```typescript
class FailoverError extends Error {
  reason: FailoverReason;  // "auth" | "rate_limit" | "billing" | "timeout"
  provider: string;
  model: string;
}

// 触发模型回退到配置的备用模型
```

## 6. 提供商使用情况跟踪

### 6.1 使用情况获取

**Anthropic** (`src/infra/provider-usage.fetch.claude.ts`):
```typescript
async function fetchClaudeUsage(token: string): Promise<ProviderUsageSnapshot> {
  // 1. OAuth API 端点
  const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
    headers: {
      Authorization: `Bearer ${token}`,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "oauth-2025-04-20"
    }
  });

  // 2. 回退到 Web API（如果 OAuth 失败）
  if (res.status === 403) {
    const sessionKey = resolveClaudeWebSessionKey();
    return await fetchClaudeWebUsage(sessionKey);
  }

  // 3. 解析使用窗口
  return {
    windows: [
      { label: "5h", usedPercent: data.five_hour.utilization },
      { label: "Week", usedPercent: data.seven_day.utilization }
    ]
  };
}
```

**Google Gemini** (`src/infra/provider-usage.fetch.gemini.ts`):
```typescript
async function fetchGeminiUsage(token: string): Promise<ProviderUsageSnapshot> {
  const res = await fetch(
    "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  // 按模型系列聚合配额
  const windows = [];
  if (hasPro) windows.push({ label: "Pro", usedPercent: (1 - proMin) * 100 });
  if (hasFlash) windows.push({ label: "Flash", usedPercent: (1 - flashMin) * 100 });
}
```

## 7. 关键设计模式

### 7.1 提供商无关抽象

Moltbot 使用 `@mariozechner/pi-ai` 库提供统一的 API 接口，隐藏提供商特定细节：

```typescript
import { streamSimple } from "@mariozechner/pi-ai";

const stream = streamSimple({
  model,      // 统一的模型对象
  messages,   // 标准化的消息格式
  tools,      // 统一的工具定义
  systemPrompt
});
```

### 7.2 渐进式增强

- **基础层**: OpenAI 兼容 API（最广泛支持）
- **增强层**: 提供商特定功能（推理、视觉、工具调用）
- **兼容层**: 自动降级不支持的功能

### 7.3 防御性编程

- **多层错误处理**: API 错误 → 格式化 → 用户友好消息
- **重复检测**: 防止流式响应中的重复内容
- **状态机**: 管理复杂的流式解析（思考标签、最终标签）

## 8. 关键文件索引

| 文件 | 说明 |
|------|------|
| `src/config/types.models.ts` | 模型类型定义 |
| `src/agents/models-config.providers.ts` | 提供商配置管理 |
| `src/agents/pi-embedded-runner/run.ts` | 统一运行器 |
| `src/agents/pi-embedded-runner/run/attempt.ts` | 请求执行 |
| `src/agents/pi-embedded-subscribe.ts` | 流式订阅 |
| `src/agents/pi-embedded-helpers/errors.ts` | 错误处理 |
| `src/agents/pi-embedded-helpers/google.ts` | Google 特定处理 |
| `src/agents/pi-embedded-helpers/openai.ts` | OpenAI 特定处理 |
| `src/agents/failover-error.ts` | 故障转移错误 |
| `src/infra/provider-usage.fetch.claude.ts` | Anthropic 使用情况 |
| `src/infra/provider-usage.fetch.gemini.ts` | Gemini 使用情况 |
