---
summary: "用于 web_search 的 Brave Search API 配置"
read_when:
  - 需要使用 Brave Search 的 web_search
  - 需要 BRAVE_API_KEY 或套餐信息
---

# Brave Search API

Moltbot 将 Brave Search 作为 `web_search` 的默认提供方。

## 获取 API key

1) 在 https://brave.com/search/api/ 创建 Brave Search API 账号。
2) 在控制台选择 **Data for Search** 套餐并生成 API key。
3) 将 key 写入配置（推荐）或在 Gateway 环境中设置 `BRAVE_API_KEY`。

## 配置示例

```json5
{
  tools: {
    web: {
      search: {
        provider: "brave",
        apiKey: "BRAVE_API_KEY_HERE",
        maxResults: 5,
        timeoutSeconds: 30
      }
    }
  }
}
```

## 说明

- Data for AI 套餐 **不** 兼容 `web_search`。
- Brave 提供免费层与付费计划；当前额度以 Brave API 门户为准。

完整 web_search 配置见 [Web tools](/tools/web)。
