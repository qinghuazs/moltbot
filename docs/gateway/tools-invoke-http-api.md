---
summary: "通过 Gateway HTTP 端点直接调用单个工具"
read_when:
  - 不运行完整 agent 回合时调用工具
  - 构建需要工具策略约束的自动化
---
# Tools Invoke（HTTP）

Moltbot 的 Gateway 提供一个简单的 HTTP 端点，用于直接调用单个工具。它始终启用，但受 Gateway 认证与工具策略限制。

- `POST /tools/invoke`
- 与 Gateway 同端口（WS + HTTP 复用）：`http://<gateway-host>:<port>/tools/invoke`

默认最大负载为 2 MB。

## 认证

使用 Gateway 的认证配置。发送 bearer token：

- `Authorization: Bearer <token>`

说明：
- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `CLAWDBOT_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `CLAWDBOT_GATEWAY_PASSWORD`）。

## 请求体

```json
{
  "tool": "sessions_list",
  "action": "json",
  "args": {},
  "sessionKey": "main",
  "dryRun": false
}
```

字段：
- `tool`（字符串，必填）：要调用的工具名。
- `action`（字符串，可选）：若工具 schema 支持 `action` 且 args 未包含，会映射进 args。
- `args`（对象，可选）：工具参数。
- `sessionKey`（字符串，可选）：目标 session key。省略或为 `"main"` 时，Gateway 使用配置的 main session key（尊重 `session.mainKey` 与默认 agent，或在 global scope 下使用 `global`）。
- `dryRun`（布尔，可选）：保留供未来使用；当前忽略。

## 策略与路由行为

工具可用性会经过与 Gateway agent 相同的策略链过滤：
- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 组策略（当 session key 映射到 group 或 channel）
- 子代理策略（当使用子代理 session key 调用）

若工具不被策略允许，端点返回 **404**。

为帮助组策略解析上下文，可选设置：
- `x-moltbot-message-channel: <channel>`（示例：`slack`、`telegram`）
- `x-moltbot-account-id: <accountId>`（存在多账号时）

## 响应

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }`（请求非法或工具错误）
- `401` → 未认证
- `404` → 工具不可用（不存在或未列入 allowlist）
- `405` → 方法不允许

## 示例

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```
