---
summary: "按渠道的路由规则（WhatsApp、Telegram、Discord、Slack）与共享上下文"
read_when:
  - 修改渠道路由或收件箱行为
---
# 渠道与路由

Moltbot 会将回复**路由回消息来源渠道**。模型不会选择渠道；路由是确定性的，并由宿主配置控制。

## 关键术语

- **Channel**：`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`webchat`。
- **AccountId**：按渠道的账号实例（若支持）。
- **AgentId**：隔离的工作区与会话存储（“大脑”）。
- **SessionKey**：用于存储上下文并控制并发的桶 key。

## 会话 key 形态（示例）

私聊会折叠到代理的**主**会话：

- `agent:<agentId>:<mainKey>`（默认：`agent:main:main`）

群组与频道会按渠道隔离：

- 群组：`agent:<agentId>:<channel>:group:<id>`
- 频道或房间：`agent:<agentId>:<channel>:channel:<id>`

线程：

- Slack/Discord 线程会在基础 key 后追加 `:thread:<threadId>`。
- Telegram 论坛主题会在群组 key 中嵌入 `:topic:<topicId>`。

示例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 路由规则（如何选择代理）

路由会为每条入站消息选择**一个代理**：

1. **精确 peer 匹配**（`bindings` 中的 `peer.kind` + `peer.id`）。
2. **Guild 匹配**（Discord）通过 `guildId`。
3. **Team 匹配**（Slack）通过 `teamId`。
4. **Account 匹配**（渠道上的 `accountId`）。
5. **Channel 匹配**（该渠道上的任意账号）。
6. **默认代理**（`agents.list[].default`，否则列表第一项，兜底 `main`）。

匹配到的代理决定使用哪个工作区与会话存储。

## 广播组（运行多个代理）

广播组允许在 Moltbot **正常会回复**时，对同一 peer 运行**多个代理**
（例如在 WhatsApp 群中，经过提及或激活 gating 后）。

配置：

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"]
  }
}
```

见：[Broadcast Groups](/broadcast-groups)。

## 配置概览

- `agents.list`：具名代理定义（工作区、模型等）。
- `bindings`：将入站渠道、账号或 peer 映射到代理。

示例：

```json5
{
  agents: {
    list: [
      { id: "support", name: "Support", workspace: "~/clawd-support" }
    ]
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" }
  ]
}
```

## 会话存储

会话存储位于状态目录（默认 `~/.clawdbot`）：

- `~/.clawdbot/agents/<agentId>/sessions/sessions.json`
- JSONL 记录与存储文件同目录

可通过 `session.store` 与 `{agentId}` 模板覆盖存储路径。

## WebChat 行为

WebChat 连接到**所选代理**，并默认使用该代理的主会话。因此你可以在一个地方查看该代理的跨渠道上下文。

## 回复上下文

入站回复包含：
- `ReplyToId`、`ReplyToBody`、`ReplyToSender`（可用时）。
- 引用上下文会作为 `[Replying to ...]` 追加到 `Body`。

该行为在各渠道一致。
