---
summary: "在 Moltbot 中使用 OpenRouter 统一 API 访问多模型"
read_when:
  - 想用一个 API key 访问多个 LLM
  - 想在 Moltbot 中通过 OpenRouter 运行模型
---
# OpenRouter

OpenRouter 提供一个**统一 API**，通过单一端点与 API key 路由到多模型。它与 OpenAI 兼容，因此多数 OpenAI SDK 只需切换 base URL。

## CLI 设置

```bash
moltbot onboard --auth-choice apiKey --token-provider openrouter --token "$OPENROUTER_API_KEY"
```

## 配置片段

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-5" }
    }
  }
}
```

## 说明

- 模型引用格式：`openrouter/<provider>/<model>`。
- 更多模型与 provider 选项见 [/concepts/model-providers](/concepts/model-providers)。
- OpenRouter 底层使用 Bearer token 携带你的 API key。
