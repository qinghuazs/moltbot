---
summary: "在 Moltbot 中通过 API key 或 Codex 订阅使用 OpenAI"
read_when:
  - 想在 Moltbot 中使用 OpenAI 模型
  - 想用 Codex 订阅认证而非 API key
---
# OpenAI

OpenAI 为 GPT 模型提供开发者 API。Codex 支持 **ChatGPT 登录**（订阅访问）或 **API key**（按量计费）登录。Codex cloud 需要 ChatGPT 登录。

## 选项 A：OpenAI API key（OpenAI Platform）

**适合：**直接 API 访问与按量计费。
在 OpenAI 控制台获取 API key。

### CLI 设置

```bash
moltbot onboard --auth-choice openai-api-key
# 或非交互
moltbot onboard --openai-api-key "$OPENAI_API_KEY"
```

### 配置片段

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.2" } } }
}
```

## 选项 B：OpenAI Code（Codex）订阅

**适合：**使用 ChatGPT/Codex 订阅而不是 API key。
Codex cloud 需要 ChatGPT 登录，而 Codex CLI 支持 ChatGPT 或 API key 登录。

### CLI 设置

```bash
# 在向导中运行 Codex OAuth
moltbot onboard --auth-choice openai-codex

# 或直接运行 OAuth
moltbot models auth login --provider openai-codex
```

### 配置片段

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.2" } } }
}
```

## 说明

- 模型引用始终使用 `provider/model`（见 [/concepts/models](/concepts/models)）。
- 认证细节与复用规则见 [/concepts/oauth](/concepts/oauth)。
