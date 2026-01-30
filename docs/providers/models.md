---
summary: "Moltbot 支持的模型提供商（LLM）"
read_when:
  - 想选择模型提供商
  - 需要快速的 LLM 认证与模型选择示例
---
# 模型提供商

Moltbot 支持多个 LLM 提供商。选择一个完成认证，再将默认模型设置为 `provider/model`。

## 重点推荐：Venius（Venice AI）

Venius 是我们推荐的 Venice AI 隐私优先推理方案，并支持在最难任务上使用 Opus。

- 默认：`venice/llama-3.3-70b`
- 最佳综合：`venice/claude-opus-45`（Opus 依旧最强）

详见 [Venice AI](/providers/venice)。

## 快速开始（两步）

1) 通过提供商完成认证（通常使用 `moltbot onboard`）。
2) 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## 支持的提供商（入门集合）

- [OpenAI（API + Codex）](/providers/openai)
- [Anthropic（API + Claude Code CLI）](/providers/anthropic)
- [OpenRouter](/providers/openrouter)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [Moonshot AI（Kimi + Kimi Code）](/providers/moonshot)
- [Synthetic](/providers/synthetic)
- [OpenCode Zen](/providers/opencode)
- [Z.AI](/providers/zai)
- [GLM models](/providers/glm)
- [MiniMax](/providers/minimax)
- [Venius（Venice AI）](/providers/venice)
- [Amazon Bedrock](/bedrock)

完整提供商目录（xAI、Groq、Mistral 等）与高级配置见 [Model providers](/concepts/model-providers)。
