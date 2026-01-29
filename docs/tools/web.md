---
summary: "Web 搜索 + 抓取工具（Brave Search API、Perplexity 直连/OpenRouter）"
read_when:
  - 需要启用 web_search 或 web_fetch
  - 需要设置 Brave Search API key
  - 想用 Perplexity Sonar 做网页搜索
---

# Web 工具

Moltbot 提供两个轻量级 Web 工具：

- `web_search` — 通过 Brave Search API（默认）或 Perplexity Sonar（直连或 OpenRouter）搜索网页。
- `web_fetch` — HTTP 抓取 + 可读抽取（HTML → markdown/text）。

它们**不是**浏览器自动化。对于 JS 重或需要登录的站点，请使用
[Browser 工具](/tools/browser)。

## 工作方式

- `web_search` 调用配置的提供方并返回结果。
  - **Brave**（默认）：返回结构化结果（标题、URL、摘要）。
  - **Perplexity**：返回带引文的 AI 综合答案，基于实时 Web 搜索。
- 结果按查询缓存 15 分钟（可配置）。
- `web_fetch` 使用普通 HTTP GET 并提取可读内容
  （HTML → markdown/text），**不执行** JavaScript。
- `web_fetch` 默认启用（除非显式禁用）。

## 选择搜索提供方

| 提供方 | 优点 | 缺点 | API Key |
|----------|------|------|---------|
| **Brave**（默认） | 快速、结构化结果、有免费额度 | 传统搜索结果 | `BRAVE_API_KEY` |
| **Perplexity** | AI 综合答案、带引用、实时 | 需要 Perplexity 或 OpenRouter 访问 | `OPENROUTER_API_KEY` 或 `PERPLEXITY_API_KEY` |

提供方细节见 [Brave Search 配置](/brave-search) 与 [Perplexity Sonar](/perplexity)。

在配置中设置提供方：

```json5
{
  tools: {
    web: {
      search: {
        provider: "brave"  // 或 "perplexity"
      }
    }
  }
}
```

示例：切换到 Perplexity Sonar（直连 API）：

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

## 获取 Brave API key

1) 在 https://brave.com/search/api/ 创建 Brave Search API 账号
2) 在控制台选择 **Data for Search** 方案（非 “Data for AI”）并生成 API key。
3) 运行 `moltbot configure --section web` 保存到配置（推荐），或在环境变量中设置 `BRAVE_API_KEY`。

Brave 提供免费额度与付费计划；当前限制与价格请查看 Brave API 门户。

### 设置 key（推荐）

**推荐：** 运行 `moltbot configure --section web`，将 key 写入
`~/.clawdbot/moltbot.json` 的 `tools.web.search.apiKey`。

**环境变量：** 在 Gateway 进程环境中设置 `BRAVE_API_KEY`。
对于 gateway 安装，将其写入 `~/.clawdbot/.env`（或服务环境）。
见 [Env vars](/help/faq#how-does-moltbot-load-environment-variables)。

## 使用 Perplexity（直连或 OpenRouter）

Perplexity Sonar 模型内置 Web 搜索能力，返回带引用的 AI 综合答案。
可通过 OpenRouter 使用（无需信用卡，支持加密/预付）。

### 获取 OpenRouter API key

1) 在 https://openrouter.ai/ 创建账号
2) 充值（支持加密、预付或信用卡）
3) 在设置中生成 API key

### 设置 Perplexity 搜索

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          // API key（可选；若设置了 OPENROUTER_API_KEY 或 PERPLEXITY_API_KEY 则可省略）
          apiKey: "sk-or-v1-...",
          // Base URL（若省略会根据 key 自动选择）
          baseUrl: "https://openrouter.ai/api/v1",
          // Model（默认 perplexity/sonar-pro）
          model: "perplexity/sonar-pro"
        }
      }
    }
  }
}
```

**环境变量：** 设置 `OPENROUTER_API_KEY` 或 `PERPLEXITY_API_KEY`。
对于 gateway 安装，写入 `~/.clawdbot/.env`。

若未设置 base URL，Moltbot 会按 API key 来源选择默认值：

- `PERPLEXITY_API_KEY` 或 `pplx-...` → `https://api.perplexity.ai`
- `OPENROUTER_API_KEY` 或 `sk-or-...` → `https://openrouter.ai/api/v1`
- 未知格式 → OpenRouter（安全兜底）

### 可用 Perplexity 模型

| 模型 | 说明 | 适用场景 |
|-------|-------------|----------|
| `perplexity/sonar` | 快速问答 + Web 搜索 | 快速查询 |
| `perplexity/sonar-pro`（默认） | 多步推理 + Web 搜索 | 复杂问题 |
| `perplexity/sonar-reasoning-pro` | Chain-of-thought 分析 | 深度研究 |

## web_search

使用已配置的提供方搜索网页。

### 要求

- `tools.web.search.enabled` 不能为 `false`（默认启用）
- 对应提供方 API key：
  - **Brave**：`BRAVE_API_KEY` 或 `tools.web.search.apiKey`
  - **Perplexity**：`OPENROUTER_API_KEY`、`PERPLEXITY_API_KEY` 或 `tools.web.search.perplexity.apiKey`

### 配置

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE", // 若已设置 BRAVE_API_KEY 可省略
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15
      }
    }
  }
}
```

### 工具参数

- `query`（必填）
- `count`（1–10；默认来自配置）
- `country`（可选）：2 字母国家码，用于区域结果（如 "DE"、"US"、"ALL"）。省略时由 Brave 选择默认区域。
- `search_lang`（可选）：搜索结果语言码（如 "de"、"en"、"fr"）
- `ui_lang`（可选）：UI 语言码
- `freshness`（可选，仅 Brave）：按发现时间过滤（`pd`、`pw`、`pm`、`py` 或 `YYYY-MM-DDtoYYYY-MM-DD`）

**示例：**

```javascript
// 德语搜索
await web_search({
  query: "TV online schauen",
  count: 10,
  country: "DE",
  search_lang: "de"
});

// 法语搜索 + 法语 UI
await web_search({
  query: "actualités",
  country: "FR",
  search_lang: "fr",
  ui_lang: "fr"
});

// 最近结果（过去一周）
await web_search({
  query: "TMBG interview",
  freshness: "pw"
});
```

## web_fetch

抓取 URL 并提取可读内容。

### 要求

- `tools.web.fetch.enabled` 不能为 `false`（默认启用）
- 可选 Firecrawl 兜底：设置 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`。

### 配置

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true,
        maxChars: 50000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        readability: true,
        firecrawl: {
          enabled: true,
          apiKey: "FIRECRAWL_API_KEY_HERE", // 若设置 FIRECRAWL_API_KEY 可省略
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 86400000, // ms（1 天）
          timeoutSeconds: 60
        }
      }
    }
  }
}
```

### 工具参数

- `url`（必填，仅 http/https）
- `extractMode`（`markdown` | `text`）
- `maxChars`（截断长页面）

说明：
- `web_fetch` 先使用 Readability 抽取主内容，再用 Firecrawl（若配置）。两者都失败则返回错误。
- Firecrawl 请求默认使用反爬模式并缓存结果。
- `web_fetch` 默认发送类 Chrome 的 User-Agent 与 `Accept-Language`；如需可覆盖 `userAgent`。
- `web_fetch` 会阻止私有/内部 hostname，并复核重定向（`maxRedirects`）。
- `web_fetch` 仅尽力抽取；某些站点需要 browser 工具。
- Key 设置与服务细节见 [Firecrawl](/tools/firecrawl)。
- 响应会缓存（默认 15 分钟）以减少重复抓取。
- 若使用工具 profile/allowlist，请添加 `web_search`/`web_fetch` 或 `group:web`。
- 若缺少 Brave key，`web_search` 会返回简短的设置提示与文档链接。
