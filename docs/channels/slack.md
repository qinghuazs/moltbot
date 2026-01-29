---
summary: "Slack 的 Socket 或 HTTP webhook 模式设置"
read_when: "正在设置 Slack 或排查 Slack socket/HTTP 模式"
---

# Slack

## Socket 模式（默认）

### 快速上手（新手）
1) 创建 Slack 应用并启用 **Socket Mode**。
2) 创建 **App Token**（`xapp-...`）与 **Bot Token**（`xoxb-...`）。
3) 为 Moltbot 设置 token 并启动 gateway。

最小配置：
```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-..."
    }
  }
}
```

### 设置
1) 在 https://api.slack.com/apps 创建 Slack 应用（From scratch）。
2) **Socket Mode** → 打开。然后到 **Basic Information** → **App-Level Tokens** → **Generate Token and Scopes**，选择 `connections:write` scope。复制 **App Token**（`xapp-...`）。
3) **OAuth & Permissions** → 添加 bot token scopes（使用下方 manifest）。点击 **Install to Workspace**。复制 **Bot User OAuth Token**（`xoxb-...`）。
4) 可选：**OAuth & Permissions** → 添加 **User Token Scopes**（见下方只读列表）。重新安装应用并复制 **User OAuth Token**（`xoxp-...`）。
5) **Event Subscriptions** → 启用事件并订阅：
   - `message.*`（含编辑/删除/线程广播）
   - `app_mention`
   - `reaction_added`, `reaction_removed`
   - `member_joined_channel`, `member_left_channel`
   - `channel_rename`
   - `pin_added`, `pin_removed`
6) 邀请机器人加入你希望它读取的频道。
7) Slash Commands → 如果启用 `channels.slack.slashCommand`，创建 `/clawd`。若启用原生命令，请为每个内置命令添加一个 slash command（与 `/help` 列表同名）。Slack 默认关闭原生命令，除非设置 `channels.slack.commands.native: true`（全局 `commands.native` 为 `"auto"`，Slack 默认关闭）。
8) App Home → 启用 **Messages Tab**，用户可私聊机器人。

请使用下方 manifest 以保持 scopes 与事件同步。

多账号支持：使用 `channels.slack.accounts` 为每个账号配置 token 与可选 `name`。共享模式见 [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts)。

### Moltbot 配置（最小）

通过环境变量设置 token（推荐）：
- `SLACK_APP_TOKEN=xapp-...`
- `SLACK_BOT_TOKEN=xoxb-...`

或通过配置：

```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-..."
    }
  }
}
```

### 用户 token（可选）
Moltbot 可使用 Slack 用户 token（`xoxp-...`）进行读操作（历史、置顶、反应、emoji、成员信息）。默认仍为只读：有用户 token 时读操作优先它，写操作仍用 bot token，除非你显式允许。即使 `userTokenReadOnly: false`，只要 bot token 可用，写操作仍优先 bot token。

用户 token 只能在配置文件中设置（无环境变量）。多账号时使用 `channels.slack.accounts.<id>.userToken`。

示例（bot + app + user tokens）：
```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-...",
      userToken: "xoxp-..."
    }
  }
}
```

示例（显式允许 user token 写入）：
```json5
{
  channels: {
    slack: {
      enabled: true,
      appToken: "xapp-...",
      botToken: "xoxb-...",
      userToken: "xoxp-...",
      userTokenReadOnly: false
    }
  }
}
```

#### Token 使用规则
- 读操作（历史、反应列表、置顶列表、emoji 列表、成员信息、搜索）优先用户 token；否则用 bot token。
- 写操作（发送/编辑/删除消息、添加/移除反应、置顶/取消置顶、上传文件）默认用 bot token。若 `userTokenReadOnly: false` 且没有 bot token，Moltbot 会回退到用户 token。

### 历史上下文
- `channels.slack.historyLimit`（或 `channels.slack.accounts.*.historyLimit`）控制最近多少条频道/群消息会注入到提示词中。
- 回退到 `messages.groupChat.historyLimit`。设 `0` 禁用（默认 50）。

## HTTP 模式（Events API）
当你的 Gateway 可通过 HTTPS 被 Slack 访问时使用 HTTP webhook 模式（服务器部署常见）。
HTTP 模式使用 Events API + Interactivity + Slash Commands，共用同一个请求 URL。

### 设置
1) 创建 Slack 应用并**关闭 Socket Mode**（若只用 HTTP 可选）。
2) **Basic Information** → 复制 **Signing Secret**。
3) **OAuth & Permissions** → 安装应用并复制 **Bot User OAuth Token**（`xoxb-...`）。
4) **Event Subscriptions** → 启用事件，并将 **Request URL** 设为 gateway webhook 路径（默认 `/slack/events`）。
5) **Interactivity & Shortcuts** → 启用，并设置同一个 **Request URL**。
6) **Slash Commands** → 为命令设置同一个 **Request URL**。

示例请求 URL：
`https://gateway-host/slack/events`

### Moltbot 配置（最小）
```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events"
    }
  }
}
```

多账号 HTTP 模式：为每个账号设置 `channels.slack.accounts.<id>.mode = "http"`，并为每个账号提供唯一的 `webhookPath`，以便每个 Slack 应用指向各自 URL。

### Manifest（可选）
使用此 Slack 应用 manifest 可快速创建应用（若需可修改名称/命令）。如需用户 token，请包含 user scopes。

```json
{
  "display_information": {
    "name": "Moltbot",
    "description": "Slack connector for Moltbot"
  },
  "features": {
    "bot_user": {
      "display_name": "Moltbot",
      "always_online": false
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/clawd",
        "description": "Send a message to Moltbot",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "chat:write",
        "channels:history",
        "channels:read",
        "groups:history",
        "groups:read",
        "groups:write",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "users:read",
        "app_mentions:read",
        "reactions:read",
        "reactions:write",
        "pins:read",
        "pins:write",
        "emoji:read",
        "commands",
        "files:read",
        "files:write"
      ],
      "user": [
        "channels:history",
        "channels:read",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "mpim:history",
        "mpim:read",
        "users:read",
        "reactions:read",
        "pins:read",
        "emoji:read",
        "search:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "reaction_added",
        "reaction_removed",
        "member_joined_channel",
        "member_left_channel",
        "channel_rename",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

若启用原生命令，请为想暴露的每个命令添加一个 `slash_commands` 条目（与 `/help` 列表一致）。用 `channels.slack.commands.native` 覆盖。

## Scopes（当前 vs 可选）
Slack 的 Conversations API 是按对话类型分 scope 的：只需要你实际使用的对话类型（channels、groups、im、mpim）的 scopes。概览见：
https://docs.slack.dev/apis/web-api/using-the-conversations-api/

### Bot token scopes（必需）
- `chat:write`（通过 `chat.postMessage` 发送/更新/删除消息）
  https://docs.slack.dev/reference/methods/chat.postMessage
- `im:write`（通过 `conversations.open` 打开私聊）
  https://docs.slack.dev/reference/methods/conversations.open
- `channels:history`, `groups:history`, `im:history`, `mpim:history`
  https://docs.slack.dev/reference/methods/conversations.history
- `channels:read`, `groups:read`, `im:read`, `mpim:read`
  https://docs.slack.dev/reference/methods/conversations.info
- `users:read`（用户查询）
  https://docs.slack.dev/reference/methods/users.info
- `reactions:read`, `reactions:write`（`reactions.get` / `reactions.add`）
  https://docs.slack.dev/reference/methods/reactions.get
  https://docs.slack.dev/reference/methods/reactions.add
- `pins:read`, `pins:write`（`pins.list` / `pins.add` / `pins.remove`）
  https://docs.slack.dev/reference/scopes/pins.read
  https://docs.slack.dev/reference/scopes/pins.write
- `emoji:read`（`emoji.list`）
  https://docs.slack.dev/reference/scopes/emoji.read
- `files:write`（通过 `files.uploadV2` 上传）
  https://docs.slack.dev/messaging/working-with-files/#upload

### User token scopes（可选，默认只读）
若配置 `channels.slack.userToken`，在 **User Token Scopes** 中添加：

- `channels:history`, `groups:history`, `im:history`, `mpim:history`
- `channels:read`, `groups:read`, `im:read`, `mpim:read`
- `users:read`
- `reactions:read`
- `pins:read`
- `emoji:read`
- `search:read`

### 当前不需要（但可能未来）
- `mpim:write`（仅当添加通过 `conversations.open` 启动群 DM 时需要）
- `groups:write`（仅当添加私有频道管理：创建/重命名/邀请/归档时需要）
- `chat:write.public`（仅当需要向机器人未加入的频道发消息）
  https://docs.slack.dev/reference/scopes/chat.write.public
- `users:read.email`（仅当需要从 `users.info` 获取邮箱字段）
  https://docs.slack.dev/changelog/2017-04-narrowing-email-access
- `files:read`（仅当开始列出/读取文件元数据时需要）

## 配置
Slack 仅使用 Socket Mode（无 HTTP webhook 服务器）。提供两个 token：

```json
{
  "slack": {
    "enabled": true,
    "botToken": "xoxb-...",
    "appToken": "xapp-...",
    "groupPolicy": "allowlist",
    "dm": {
      "enabled": true,
      "policy": "pairing",
      "allowFrom": ["U123", "U456", "*"],
      "groupEnabled": false,
      "groupChannels": ["G123"],
      "replyToMode": "all"
    },
    "channels": {
      "C123": { "allow": true, "requireMention": true },
      "#general": {
        "allow": true,
        "requireMention": true,
        "users": ["U123"],
        "skills": ["search", "docs"],
        "systemPrompt": "Keep answers short."
      }
    },
    "reactionNotifications": "own",
    "reactionAllowlist": ["U123"],
    "replyToMode": "off",
    "actions": {
      "reactions": true,
      "messages": true,
      "pins": true,
      "memberInfo": true,
      "emojiList": true
    },
    "slashCommand": {
      "enabled": true,
      "name": "clawd",
      "sessionPrefix": "slack:slash",
      "ephemeral": true
    },
    "textChunkLimit": 4000,
    "mediaMaxMb": 20
  }
}
```

也可通过环境变量提供 token：
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

确认反应由 `messages.ackReaction` +
`messages.ackReactionScope` 全局控制。用 `messages.removeAckAfterReply` 在机器人回复后清除确认反应。

## 限制
- 出站文本按 `channels.slack.textChunkLimit` 分块（默认 4000）。
- 可选换行分块：设置 `channels.slack.chunkMode="newline"`，先按空行（段落边界）分块，再按长度分块。
- 媒体上传上限：`channels.slack.mediaMaxMb`（默认 20）。

## 回复线程
默认情况下 Moltbot 在主频道回复。用 `channels.slack.replyToMode` 控制自动线程：

| 模式 | 行为 |
| --- | --- |
| `off` | **默认。** 在主频道回复。只有触发消息已在 thread 中时才在线程回复。 |
| `first` | 第一条回复进线程（触发消息之下），后续回复回主频道。适合保持上下文但避免线程过多。 |
| `all` | 所有回复进入线程。对话更集中但可见性可能降低。 |

该模式同时适用于自动回复与 agent 工具调用（`slack sendMessage`）。

### 按聊天类型线程
可通过 `channels.slack.replyToModeByChatType` 为不同聊天类型设置不同线程行为：

```json5
{
  channels: {
    slack: {
      replyToMode: "off",        // 频道默认
      replyToModeByChatType: {
        direct: "all",           // 私聊总是进线程
        group: "first"           // 群 DM/MPIM 首条进线程
      },
    }
  }
}
```

支持的聊天类型：
- `direct`：1:1 私聊（Slack `im`）
- `group`：群 DM / MPIM（Slack `mpim`）
- `channel`：标准频道（公开/私有）

优先级：
1) `replyToModeByChatType.<chatType>`
2) `replyToMode`
3) Provider 默认值（`off`）

旧版 `channels.slack.dm.replyToMode` 仍被接受，作为 `direct` 的兜底（当未设置 chat-type 覆盖时）。

示例：

仅在线程中回复私聊：
```json5
{
  channels: {
    slack: {
      replyToMode: "off",
      replyToModeByChatType: { direct: "all" }
    }
  }
}
```

群 DM 在线程，频道在主频道：
```json5
{
  channels: {
    slack: {
      replyToMode: "off",
      replyToModeByChatType: { group: "first" }
    }
  }
}
```

频道用线程，私聊在主频道：
```json5
{
  channels: {
    slack: {
      replyToMode: "first",
      replyToModeByChatType: { direct: "off", group: "off" }
    }
  }
}
```

### 手动线程标签
更细粒度控制可在 agent 回复中使用标签：
- `[[reply_to_current]]` — 回复触发消息（开始/继续线程）。
- `[[reply_to:<id>]]` — 回复指定消息 id。

## 会话与路由
- 私聊共享 `main` 会话（与 WhatsApp/Telegram 类似）。
- 频道映射到 `agent:<agentId>:slack:channel:<channelId>` 会话。
- Slash 命令使用 `agent:<agentId>:slack:slash:<userId>` 会话（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）。
- 若 Slack 未提供 `channel_type`，Moltbot 会根据频道 ID 前缀（`D`、`C`、`G`）推断，并默认 `channel` 以保持会话键稳定。
- 原生命令注册使用 `commands.native`（全局默认 `"auto"` → Slack 关闭），可用 `channels.slack.commands.native` 按 workspace 覆盖。文本命令必须作为独立 `/...` 消息发送，可通过 `commands.text: false` 关闭。Slack slash 命令由 Slack 应用管理，不会自动移除。用 `commands.useAccessGroups: false` 绕过命令访问组检查。
- 完整命令列表与配置：见 [Slash 命令](/tools/slash-commands)

## 私聊安全（配对）
- 默认：`channels.slack.dm.policy="pairing"` — 陌生私聊发送者收到配对码（1 小时过期）。
- 批准：`moltbot pairing approve slack <code>`。
- 允许任何人：设 `channels.slack.dm.policy="open"` 且 `channels.slack.dm.allowFrom=["*"]`。
- `channels.slack.dm.allowFrom` 接受用户 ID、@handle 或邮箱（在 token 允许时启动时解析）。向导在 token 允许时接受用户名并解析为 id。

## 群策略
- `channels.slack.groupPolicy` 控制频道处理（`open|disabled|allowlist`）。
- `allowlist` 要求频道列在 `channels.slack.channels` 中。
 - 若仅设置 `SLACK_BOT_TOKEN`/`SLACK_APP_TOKEN` 而未创建 `channels.slack` 段，
   运行时默认 `groupPolicy` 为 `open`。要锁定它，请添加 `channels.slack.groupPolicy`、
   `channels.defaults.groupPolicy` 或频道 allowlist。
 - 配置向导接受 `#channel` 名称并尽可能解析为 ID（公开 + 私有）；若多重匹配，优先活跃频道。
 - 启动时 Moltbot 会将 allowlist 中的频道/用户名称解析为 ID（token 允许时），并记录映射；无法解析的条目保留原样。
 - 要**禁止所有频道**，设 `channels.slack.groupPolicy: "disabled"`（或保持空 allowlist）。

频道选项（`channels.slack.channels.<id>` 或 `channels.slack.channels.<name>`）：
- `allow`：当 `groupPolicy="allowlist"` 时允许/拒绝该频道。
- `requireMention`：频道提及门控。
- `tools`：可选按频道工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `toolsBySender`：频道内按发送者工具策略覆盖（key 为 sender id/@handle/email；支持 `"*"`）。
- `allowBots`：允许该频道中的机器人消息（默认 false）。
- `users`：可选按频道用户 allowlist。
- `skills`：技能过滤（省略 = 全技能；空数组 = 无技能）。
- `systemPrompt`：频道额外系统提示（与主题/用途合并）。
- `enabled`：设 `false` 禁用该频道。

## 投递目标
用于 cron/CLI 发送：
- `user:<id>` 用于私聊
- `channel:<id>` 用于频道

## 工具动作
Slack 工具动作可由 `channels.slack.actions.*` 控制：

| 动作组 | 默认 | 说明 |
| --- | --- | --- |
| reactions | enabled | 反应 + 反应列表 |
| messages | enabled | 读/发/改/删 |
| pins | enabled | 置顶/取消置顶/列表 |
| memberInfo | enabled | 成员信息 |
| emojiList | enabled | 自定义 emoji 列表 |

## 安全说明
- 写操作默认使用 bot token，使变更性动作受应用的 bot 权限与身份约束。
- `userTokenReadOnly: false` 允许在无 bot token 时使用用户 token 写入，这意味着操作以安装者身份执行。请将用户 token 视为高权限，并收紧动作开关与 allowlist。
- 若启用 user token 写入，请确保用户 token 包含所需写入 scopes（`chat:write`、`reactions:write`、`pins:write`、`files:write`），否则相关操作会失败。

## 说明
- 提及门控由 `channels.slack.channels` 控制（将 `requireMention` 设为 `true`）；`agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）也算提及。
- 多代理覆盖：在 `agents.list[].groupChat.mentionPatterns` 中按 agent 设置。
- 反应通知遵循 `channels.slack.reactionNotifications`（`allowlist` 模式使用 `reactionAllowlist`）。
- 默认忽略机器人消息；用 `channels.slack.allowBots` 或 `channels.slack.channels.<id>.allowBots` 启用。
- 警告：若允许回复其他机器人（`channels.slack.allowBots=true` 或 `channels.slack.channels.<id>.allowBots=true`），请用 `requireMention`、`channels.slack.channels.<id>.users` allowlist，和/或在 `AGENTS.md` 与 `SOUL.md` 中收紧 guardrails，防止机器人互相回复循环。
- Slack 工具的反应移除语义见 [/tools/reactions](/tools/reactions)。
- 在允许且大小限制内时，附件会下载到媒体存储。
