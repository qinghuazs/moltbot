---
summary: "在 Moltbot 中使用 Z.AI（GLM 模型）"
read_when:
  - 想在 Moltbot 中使用 Z.AI 或 GLM 模型
  - 需要一个简单的 ZAI_API_KEY 设置
---
# Z.AI

Z.AI 是 **GLM** 模型的 API 平台，提供 REST API 并使用 API key 认证。在 Z.AI 控制台创建 API key。Moltbot 使用 `zai` provider 配合 Z.AI API key。

## CLI 设置

```bash
moltbot onboard --auth-choice zai-api-key
# 或非交互
moltbot onboard --zai-api-key "$ZAI_API_KEY"
```

## 配置片段

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-4.7" } } }
}
```

## 说明

- GLM 模型引用格式为 `zai/<model>`（例如 `zai/glm-4.7`）。
- 模型家族概览见 [/providers/glm](/providers/glm)。
- Z.AI 使用 Bearer 认证携带你的 API key。
