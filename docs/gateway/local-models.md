---
summary: "在本地 LLM 上运行 Moltbot（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）"
read_when:
  - 想用自己的 GPU 机提供模型服务
  - 正在接入 LM Studio 或 OpenAI 兼容代理
  - 需要最安全的本地模型指南
---
# 本地模型

本地可行，但 Moltbot 需要大上下文与强抗 prompt injection 能力。小卡会截断上下文并削弱安全性。目标是：**至少 2 台满配 Mac Studio 或等价 GPU 服务器（约 3 万美元以上）**。单张 **24 GB** GPU 只适合轻量提示且延迟更高。请使用 **能运行的最大/完整版模型**；激进量化或“小”模型会提高 prompt injection 风险（见 [Security](/gateway/security)）。

## 推荐：LM Studio + MiniMax M2.1（Responses API，完整版）

当前最佳本地栈。用 LM Studio 加载 MiniMax M2.1，开启本地服务器（默认 `http://127.0.0.1:1234`），使用 Responses API 让 reasoning 与最终文本分离。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.1-gs32" },
      models: {
        "anthropic/claude-opus-4-5": { alias: "Opus" },
        "lmstudio/minimax-m2.1-gs32": { alias: "Minimax" }
      }
    }
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.1-gs32",
            name: "MiniMax M2.1 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

**配置清单**
- 安装 LM Studio：https://lmstudio.ai
- 在 LM Studio 下载 **最大版本的 MiniMax M2.1**（避免“小”或重度量化），启动服务器，并确认 `http://127.0.0.1:1234/v1/models` 可见该模型。
- 保持模型已加载；冷启动会增加延迟。
- 若 LM Studio 版本参数不同，调整 `contextWindow`/`maxTokens`。
- WhatsApp 建议使用 Responses API，确保只发送最终文本。

即使运行本地，也建议保留托管模型配置；使用 `models.mode: "merge"` 以保留回退。

### 混合配置：托管为主，本地为备

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-5",
        fallbacks: ["lmstudio/minimax-m2.1-gs32", "anthropic/claude-opus-4-5"]
      },
      models: {
        "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
        "lmstudio/minimax-m2.1-gs32": { alias: "MiniMax Local" },
        "anthropic/claude-opus-4-5": { alias: "Opus" }
      }
    }
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.1-gs32",
            name: "MiniMax M2.1 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

### 本地优先，托管兜底

交换 primary 与 fallback 顺序；保持同样的 providers 块与 `models.mode: "merge"`，即可在本地机器宕机时回退到 Sonnet/Opus。

### 区域托管 / 数据路由

- OpenRouter 上也有带区域固定端点的托管 MiniMax/Kimi/GLM 变体（如 US-hosted）。选择对应区域变体可让流量留在指定辖区，同时保留 `models.mode: "merge"` 的 Anthropic/OpenAI 回退。
- 纯本地仍是最强隐私路径；当你需要 provider 功能但希望控制数据流时，区域托管是折中方案。

## 其他 OpenAI 兼容本地代理

vLLM、LiteLLM、OAI-proxy 或自建网关只要暴露 OpenAI 风格 `/v1` 端点即可。将上面的 provider 块替换为你的端点与模型 ID：

```json5
{
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

保持 `models.mode: "merge"` 以便托管模型可作为回退。

## 排障
- Gateway 是否能访问代理？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型未加载？重新加载；冷启动常导致“卡住”。
- 上下文错误？降低 `contextWindow` 或提高服务器限制。
- 安全：本地模型跳过 provider 侧过滤；请收紧 agent 权限并开启压缩，以降低 prompt injection 爆炸半径。
