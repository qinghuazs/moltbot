---
summary: "从 Gateway 暴露兼容 OpenAI 的 /v1/chat/completions HTTP 端点"
read_when:
  - 集成依赖 OpenAI Chat Completions 的工具
---
# OpenAI Chat Completions（HTTP）

Moltbot 的 Gateway 可提供小型 OpenAI 兼容的 Chat Completions 端点。

该端点 **默认关闭**，需在配置中启用。

- `POST /v1/chat/completions`
- 与 Gateway 同端口（WS + HTTP 复用）：`http://<gateway-host>:<port>/v1/chat/completions`

底层请求会作为普通 Gateway agent 运行（与 `moltbot agent` 同代码路径），因此路由/权限/配置都与 Gateway 一致。

## 认证

使用 Gateway 认证配置。发送 bearer token：

- `Authorization: Bearer <token>`

说明：
- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `CLAWDBOT_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `CLAWDBOT_GATEWAY_PASSWORD`）。

## 选择 agent

无需自定义 header：在 OpenAI `model` 字段中编码 agent id：

- `model: "moltbot:<agentId>"`（示例：`"moltbot:main"`、`"moltbot:beta"`）
- `model: "agent:<agentId>"`（别名）

或通过 header 指定特定 Moltbot agent：

- `x-moltbot-agent-id: <agentId>`（默认：`main`）

高级：
- `x-moltbot-session-key: <sessionKey>` 可完全控制会话路由。

## 启用端点

将 `gateway.http.endpoints.chatCompletions.enabled` 设为 `true`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true }
      }
    }
  }
}
```

## 禁用端点

将 `gateway.http.endpoints.chatCompletions.enabled` 设为 `false`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false }
      }
    }
  }
}
```

## 会话行为

默认端点 **每次请求无状态**（每次调用都会生成新的 session key）。

如果请求包含 OpenAI `user` 字符串，Gateway 会据此派生稳定 session key，让多次调用共享 agent 会话。

## 流式（SSE）

设置 `stream: true` 以接收 Server-Sent Events（SSE）：

- `Content-Type: text/event-stream`
- 每条事件为 `data: <json>`
- 结束时发送 `data: [DONE]`

## 示例

非流式：
```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-moltbot-agent-id: main' \
  -d '{
    "model": "moltbot",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

流式：
```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-moltbot-agent-id: main' \
  -d '{
    "model": "moltbot",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```
