---
summary: "Moltbot 支持的模型提供商（LLM）"
read_when:
  - 想选择模型提供商
  - 需要快速概览支持的 LLM 后端
---
# 模型提供商

Moltbot 支持多个 LLM 提供商。选择提供商后完成认证，再将默认模型设置为 `provider/model`。

想查看聊天渠道文档（WhatsApp/Telegram/Discord/Slack/Mattermost（插件）等）？见 [Channels](/channels)。

## 重点推荐：Venius（Venice AI）

Venius 是我们推荐的 Venice AI 隐私优先推理方案，并支持在难题上使用 Opus。

- 默认：`venice/llama-3.3-70b`
- 最佳综合：`venice/claude-opus-45`（Opus 依旧最强）

详见 [Venice AI](/providers/venice)。

## 快速开始

1) 通过提供商完成认证（通常使用 `moltbot onboard`）。
2) 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## 提供商文档

- [OpenAI（API + Codex）](/providers/openai)
- [Anthropic（API + Claude Code CLI）](/providers/anthropic)
- [Qwen（OAuth）](/providers/qwen)
- [OpenRouter](/providers/openrouter)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [Moonshot AI（Kimi + Kimi Code）](/providers/moonshot)
- [OpenCode Zen](/providers/opencode)
- [Amazon Bedrock](/bedrock)
- [Z.AI](/providers/zai)
- [GLM models](/providers/glm)
- [MiniMax](/providers/minimax)
- [Venius（Venice AI，隐私优先）](/providers/venice)
- [Ollama（本地模型）](/providers/ollama)

## 转写提供商

- [Deepgram（音频转写）](/providers/deepgram)

## 社区工具

- [Claude Max API Proxy](/providers/claude-max-api-proxy) - 将 Claude Max/Pro 订阅用作 OpenAI 兼容 API 端点

完整提供商目录（xAI、Groq、Mistral 等）与高级配置见 [Model providers](/concepts/model-providers)。
