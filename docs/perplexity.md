---
summary: "用于 web_search 的 Perplexity Sonar 设置"
read_when:
  - 想使用 Perplexity Sonar 进行网页搜索
  - 需要 PERPLEXITY_API_KEY 或 OpenRouter 配置
---

# Perplexity Sonar

Moltbot 可将 Perplexity Sonar 用于 `web_search` 工具。你可以通过 Perplexity 直连 API 或通过 OpenRouter 连接。

## API 选项

### Perplexity（直连）

- Base URL: https://api.perplexity.ai
- 环境变量：`PERPLEXITY_API_KEY`

### OpenRouter（替代）

- Base URL: https://openrouter.ai/api/v1
- 环境变量：`OPENROUTER_API_KEY`
- 支持预付费与加密货币额度。

## 配置示例

```json5
{
  tools: {
    web: {
      search: {
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...",
          baseUrl: "https://api.perplexity.ai",
          model: "perplexity/sonar-pro"
        }
      }
    }
  }
}
```

## 从 Brave 切换

```json5
{
  tools: {
    web: {
      search: {
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...",
          baseUrl: "https://api.perplexity.ai"
        }
      }
    }
  }
}
```

如果同时设置了 `PERPLEXITY_API_KEY` 与 `OPENROUTER_API_KEY`，请通过
`tools.web.search.perplexity.baseUrl`（或 `tools.web.search.perplexity.apiKey`）
进行区分。

如果未设置 base URL，Moltbot 会根据 API key 来源选择默认值：

- `PERPLEXITY_API_KEY` 或 `pplx-...` -> 直连 Perplexity（`https://api.perplexity.ai`）
- `OPENROUTER_API_KEY` 或 `sk-or-...` -> OpenRouter（`https://openrouter.ai/api/v1`）
- 未知 key 格式 -> OpenRouter（安全兜底）

## 模型

- `perplexity/sonar` - 快速问答 + 网页搜索
- `perplexity/sonar-pro`（默认）- 多步推理 + 网页搜索
- `perplexity/sonar-reasoning-pro` - 深度研究

完整的 web_search 配置见 [Web tools](/tools/web)。
