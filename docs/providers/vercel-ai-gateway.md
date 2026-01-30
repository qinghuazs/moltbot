---
title: "Vercel AI Gateway"
summary: "Vercel AI Gateway 设置（认证与模型选择）"
read_when:
  - 想在 Moltbot 中使用 Vercel AI Gateway
  - 需要 API key 环境变量或 CLI 认证选项
---
# Vercel AI Gateway


[Vercel AI Gateway](https://vercel.com/ai-gateway) 提供统一 API，可通过单一端点访问数百模型。

- Provider：`vercel-ai-gateway`
- 认证：`AI_GATEWAY_API_KEY`
- API：兼容 Anthropic Messages

## 快速开始

1) 设置 API key（推荐存入 Gateway 侧）：

```bash
moltbot onboard --auth-choice ai-gateway-api-key
```

2) 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.5" }
    }
  }
}
```

## 非交互示例

```bash
moltbot onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 环境变量说明

如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `AI_GATEWAY_API_KEY` 对该进程可见（例如在 `~/.clawdbot/.env` 或通过 `env.shellEnv` 设置）。
