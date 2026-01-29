---
summary: "用于唤醒与隔离 agent 运行的 webhook 入口"
read_when:
  - 添加或修改 webhook 端点
  - 将外部系统接入 Moltbot
---

# Webhook

Gateway 可暴露一个小型 HTTP webhook 端点用于外部触发。

## 启用

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks"
  }
}
```

说明：
- 当 `hooks.enabled=true` 时必须设置 `hooks.token`。
- `hooks.path` 默认为 `/hooks`。

## 认证

每个请求都必须包含 hook token。优先使用 header：
- `Authorization: Bearer <token>`（推荐）
- `x-moltbot-token: <token>`
- `?token=<token>`（已弃用；会记录警告，未来大版本移除）

## 端点

### `POST /hooks/wake`

Payload：
```json
{ "text": "System line", "mode": "now" }
```

- `text` **必填**（string）：事件描述（如“收到新邮件”）。
- `mode` 可选（`now` | `next-heartbeat`）：立即触发心跳（默认 `now`）或等待下一次心跳。

效果：
- 向**主会话**入队系统事件
- 若 `mode=now`，立即触发心跳

### `POST /hooks/agent`

Payload：
```json
{
  "message": "Run this",
  "name": "Email",
  "sessionKey": "hook:email:msg-123",
  "wakeMode": "now",
  "deliver": true,
  "channel": "last",
  "to": "+15551234567",
  "model": "openai/gpt-5.2-mini",
  "thinking": "low",
  "timeoutSeconds": 120
}
```

- `message` **必填**（string）：需要 agent 处理的提示文本。
- `name` 可选（string）：hook 的可读名称（如“GitHub”），用于会话摘要前缀。
- `sessionKey` 可选（string）：用于识别 agent 会话的 key。默认随机 `hook:<uuid>`。固定 key 可在 hook 上下文内进行多轮对话。
- `wakeMode` 可选（`now` | `next-heartbeat`）：立即触发心跳（默认 `now`）或等待下一次心跳。
- `deliver` 可选（boolean）：若为 `true`，agent 回复会投递到消息渠道。默认 `true`。仅心跳确认类回复会自动跳过投递。
- `channel` 可选（string）：投递渠道。可选：`last`、`whatsapp`、`telegram`、`discord`、`slack`、`mattermost`（插件）、`signal`、`imessage`、`msteams`。默认 `last`。
- `to` 可选（string）：渠道目标（如 WhatsApp/Signal 的手机号、Telegram 的 chat id、Discord/Slack/Mattermost 的频道 id、MS Teams 的会话 id）。默认主会话最后一次投递的目标。
- `model` 可选（string）：模型覆盖（如 `anthropic/claude-3-5-sonnet` 或别名）。若有限制，必须在允许模型列表内。
- `thinking` 可选（string）：思考级别覆盖（如 `low`、`medium`、`high`）。
- `timeoutSeconds` 可选（number）：agent 运行超时（秒）。

效果：
- 运行**隔离** agent 回合（独立 session key）
- 总是向**主会话**发布摘要
- 若 `wakeMode=now`，立即触发心跳

### `POST /hooks/<name>`（映射）

自定义 hook 名称由 `hooks.mappings` 解析（见配置）。映射可把任意 payload 转为 `wake` 或 `agent` 动作，并可使用模板或代码转换。

映射选项（摘要）：
- `hooks.presets: ["gmail"]` 启用内置 Gmail 映射。
- `hooks.mappings` 可在配置中定义 `match`、`action` 与模板。
- `hooks.transformsDir` + `transform.module` 加载 JS/TS 模块做自定义逻辑。
- 使用 `match.source` 可保持通用 ingest 端点（由 payload 决定路由）。
- TS transform 运行时需 TS loader（如 `bun` 或 `tsx`），或提前编译为 `.js`。
- 在映射上设置 `deliver: true` + `channel`/`to` 可将回复路由到聊天渠道
  （`channel` 默认 `last`，回退到 WhatsApp）。
- `allowUnsafeExternalContent: true` 会禁用该 hook 的外部内容安全包装
  （危险，仅用于可信内部源）。
- `moltbot webhooks gmail setup` 会写入 `hooks.gmail` 配置，用于 `moltbot webhooks gmail run`。
完整 Gmail 流程见 [Gmail Pub/Sub](/automation/gmail-pubsub)。

## 响应码

- `/hooks/wake` 返回 `200`
- `/hooks/agent` 返回 `202`（已启动异步运行）
- 认证失败返回 `401`
- payload 无效返回 `400`
- payload 过大返回 `413`

## 示例

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-moltbot-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","wakeMode":"next-heartbeat"}'
```

### 使用不同模型

在 agent payload（或映射）中添加 `model` 覆盖该次运行的模型：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-moltbot-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.2-mini"}'
```

如果启用了 `agents.defaults.models` 限制，请确保覆盖模型在列表中。

```bash
curl -X POST http://127.0.0.1:18789/hooks/gmail \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"source":"gmail","messages":[{"from":"Ada","subject":"Hello","snippet":"Hi"}]}'
```

## 安全

- 将 hook 端点置于 loopback、tailnet 或可信反代后面。
- 使用专用 hook token，不要复用 gateway 认证 token。
- 避免在 webhook 日志中包含敏感原始 payload。
- hook payload 默认视为不可信并包裹安全边界。
  如必须对特定 hook 禁用，请在映射中设置 `allowUnsafeExternalContent: true`
  （危险）。
