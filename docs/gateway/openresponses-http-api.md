---
summary: "从 Gateway 暴露兼容 OpenResponses 的 /v1/responses HTTP 端点"
read_when:
  - 集成支持 OpenResponses API 的客户端
  - 需要基于 item 的输入、客户端工具调用或 SSE 事件
---
# OpenResponses API（HTTP）

Moltbot 的 Gateway 可提供兼容 OpenResponses 的 `POST /v1/responses` 端点。

该端点 **默认关闭**，需在配置中启用。

- `POST /v1/responses`
- 与 Gateway 同端口（WS + HTTP 复用）：`http://<gateway-host>:<port>/v1/responses`

底层请求会作为普通 Gateway agent 运行（与 `moltbot agent` 同代码路径），
因此路由/权限/配置都与 Gateway 一致。

## 认证

使用 Gateway 的认证配置。发送 bearer token：

- `Authorization: Bearer <token>`

说明：
- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `CLAWDBOT_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `CLAWDBOT_GATEWAY_PASSWORD`）。

## 选择 agent

无需自定义 header：在 OpenResponses `model` 字段中编码 agent id：

- `model: "moltbot:<agentId>"`（示例：`"moltbot:main"`、`"moltbot:beta"`）
- `model: "agent:<agentId>"`（别名）

或通过 header 指定特定 Moltbot agent：

- `x-moltbot-agent-id: <agentId>`（默认：`main`）

高级：
- `x-moltbot-session-key: <sessionKey>` 可完全控制会话路由。

## 启用端点

将 `gateway.http.endpoints.responses.enabled` 设为 `true`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: { enabled: true }
      }
    }
  }
}
```

## 禁用端点

将 `gateway.http.endpoints.responses.enabled` 设为 `false`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: { enabled: false }
      }
    }
  }
}
```

## 会话行为

默认该端点 **每次请求无状态**（每次调用都会生成新的 session key）。

若请求包含 OpenResponses `user` 字符串，Gateway 会基于其派生稳定的 session key，
便于多次调用共享同一 agent 会话。

## 请求形状（已支持）

请求遵循 OpenResponses API 的 item 输入模式。当前支持：

- `input`：字符串或 item 对象数组。
- `instructions`：合并进 system prompt。
- `tools`：客户端工具定义（function 工具）。
- `tool_choice`：筛选或要求客户端工具。
- `stream`：启用 SSE 流式。
- `max_output_tokens`：尽力限制输出（依赖 provider）。
- `user`：稳定会话路由。

已接受但 **目前忽略**：

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `previous_response_id`
- `truncation`

## Items（input）

### `message`
角色：`system`、`developer`、`user`、`assistant`。

- `system` 与 `developer` 会追加到 system prompt。
- 最新的 `user` 或 `function_call_output` item 会成为“当前消息”。
- 之前的 user/assistant 消息作为历史上下文。

### `function_call_output`（回合式工具）

把工具结果返回给模型：

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` 与 `item_reference`

为 schema 兼容而接受，但构建 prompt 时忽略。

## Tools（客户端函数工具）

通过 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

如果 agent 决定调用工具，响应会返回 `function_call` 输出 item。
然后你再发送带 `function_call_output` 的后续请求继续该回合。

## 图片（`input_image`）

支持 base64 或 URL 来源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允许的 MIME 类型（当前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`。
最大大小（当前）：10MB。

## 文件（`input_file`）

支持 base64 或 URL 来源：

```json
{
  "type": "input_file",
  "source": {
    "type": "base64",
    "media_type": "text/plain",
    "data": "SGVsbG8gV29ybGQh",
    "filename": "hello.txt"
  }
}
```

允许的 MIME 类型（当前）：`text/plain`、`text/markdown`、`text/html`、`text/csv`、
`application/json`、`application/pdf`。

最大大小（当前）：5MB。

当前行为：
- 文件内容会被解码并加入 **system prompt**，而非用户消息，
  因此是临时的（不会写入会话历史）。
- PDF 会被解析为文本。若文本较少，会将前几页栅格化为图片并传给模型。

PDF 解析使用 Node 友好的 `pdfjs-dist` legacy build（不含 worker）。现代 PDF.js
构建需要浏览器 worker/DOM 全局，因此不用于 Gateway。

URL 拉取默认值：
- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- 请求受保护（DNS 解析、私有 IP 阻断、重定向上限、超时）。

## 文件与图片限制（配置）

可在 `gateway.http.endpoints.responses` 下调整默认值：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true,
          maxBodyBytes: 20000000,
          files: {
            allowUrl: true,
            allowedMimes: ["text/plain", "text/markdown", "text/html", "text/csv", "application/json", "application/pdf"],
            maxBytes: 5242880,
            maxChars: 200000,
            maxRedirects: 3,
            timeoutMs: 10000,
            pdf: {
              maxPages: 4,
              maxPixels: 4000000,
              minTextChars: 200
            }
          },
          images: {
            allowUrl: true,
            allowedMimes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
            maxBytes: 10485760,
            maxRedirects: 3,
            timeoutMs: 10000
          }
        }
      }
    }
  }
}
```

省略时默认值：
- `maxBodyBytes`: 20MB
- `files.maxBytes`: 5MB
- `files.maxChars`: 200k
- `files.maxRedirects`: 3
- `files.timeoutMs`: 10s
- `files.pdf.maxPages`: 4
- `files.pdf.maxPixels`: 4,000,000
- `files.pdf.minTextChars`: 200
- `images.maxBytes`: 10MB
- `images.maxRedirects`: 3
- `images.timeoutMs`: 10s

## 流式（SSE）

设置 `stream: true` 以接收 Server-Sent Events（SSE）：

- `Content-Type: text/event-stream`
- 每条事件为 `event: <type>` 与 `data: <json>`
- 结束时发送 `data: [DONE]`

当前发出的事件类型：
- `response.created`
- `response.in_progress`
- `response.output_item.added`
- `response.content_part.added`
- `response.output_text.delta`
- `response.output_text.done`
- `response.content_part.done`
- `response.output_item.done`
- `response.completed`
- `response.failed`（错误时）

## 用量

当底层 provider 报告 token 计数时，会填充 `usage`。

## 错误

错误使用如下 JSON 对象：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常见情况：
- `401` 认证缺失/无效
- `400` 请求体非法
- `405` 方法错误

## 示例

非流式：
```bash
curl -sS http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-moltbot-agent-id: main' \
  -d '{
    "model": "moltbot",
    "input": "hi"
  }'
```

流式：
```bash
curl -N http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-moltbot-agent-id: main' \
  -d '{
    "model": "moltbot",
    "stream": true,
    "input": "hi"
  }'
```
