---
summary: "web_fetch 的 Firecrawl 兜底（反爬 + 缓存抽取）"
read_when:
  - 想使用 Firecrawl 做 Web 抽取
  - 需要 Firecrawl API key
  - 想为 web_fetch 启用反爬抽取
---

# Firecrawl

Moltbot 可将 **Firecrawl** 作为 `web_fetch` 的兜底抽取器。它是托管内容抽取服务，支持反爬与缓存，适合 JS 重或阻止普通 HTTP 抓取的页面。

## 获取 API key

1) 创建 Firecrawl 账号并生成 API key。
2) 将 key 写入配置或在 gateway 环境中设置 `FIRECRAWL_API_KEY`。

## 配置 Firecrawl

```json5
{
  tools: {
    web: {
      fetch: {
        firecrawl: {
          apiKey: "FIRECRAWL_API_KEY_HERE",
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 172800000,
          timeoutSeconds: 60
        }
      }
    }
  }
}
```

说明：
- 当提供 API key 时，`firecrawl.enabled` 默认为 true。
- `maxAgeMs` 控制缓存结果的最大年龄（毫秒）。默认 2 天。

## 隐身 / 反爬

Firecrawl 提供 **proxy mode** 参数用于反爬（`basic`、`stealth` 或 `auto`）。
Moltbot 对 Firecrawl 请求固定使用 `proxy: "auto"` 并 `storeInCache: true`。
若省略 proxy，Firecrawl 默认为 `auto`。`auto` 在 basic 失败后会重试 stealth，可能比仅 basic 更耗积分。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 抽取顺序：
1) Readability（本地）
2) Firecrawl（若配置）
3) 基础 HTML 清理（最后兜底）

完整 Web 工具设置见 [Web 工具](/tools/web)。
