---
summary: "Telegram 机器人支持状态、能力与配置"
read_when:
  - 在处理 Telegram 功能或 webhook 时
---
# Telegram（Bot API）

状态：通过 grammY 支持生产可用的机器人私聊与群聊。默认长轮询；webhook 可选。

## 快速上手（新手）
1) 用 **@BotFather** 创建机器人并复制 token。
2) 设置 token：
   - 环境变量：`TELEGRAM_BOT_TOKEN=...`
   - 或配置：`channels.telegram.botToken: "..."`。
   - 两者同时存在时，配置优先（环境变量仅用于默认账号）。
3) 启动 gateway。
4) 私聊默认是配对模式；首次联系时批准配对码。

最小配置：
```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing"
    }
  }
}
```

## 这是什么
- Gateway 持有的 Telegram Bot API 渠道。
- 确定性路由：回复回到 Telegram；模型不会选择渠道。
- 私聊共享 agent 主会话；群聊独立（`agent:<agentId>:telegram:group:<chatId>`）。

## 设置（快速路径）
### 1) 创建机器人 token（BotFather）
1) 打开 Telegram，和 **@BotFather** 对话。
2) 运行 `/newbot`，按提示设置名称与以 `bot` 结尾的用户名。
3) 复制 token 并妥善保存。

可选 BotFather 设置：
- `/setjoingroups` — 允许/禁止机器人加入群组。
- `/setprivacy` — 控制机器人是否能看到群内所有消息。

### 2) 配置 token（环境变量或配置）
示例：

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } }
    }
  }
}
```

环境变量：`TELEGRAM_BOT_TOKEN=...`（仅对默认账号生效）。
若同时设置环境变量与配置，以配置为准。

多账号支持：使用 `channels.telegram.accounts` 为每个账号配置 token 和可选 `name`。共享模式见 [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts)。

3) 启动 gateway。只要能解析到 token（配置优先，环境变量兜底），Telegram 即启动。
4) 私聊默认配对；首次联系机器人时批准配对码。
5) 群聊：添加机器人，决定隐私/管理员行为（见下），然后设置 `channels.telegram.groups` 控制提及门控与 allowlist。

## Token + 隐私 + 权限（Telegram 侧）

### Token 创建（BotFather）
- `/newbot` 会创建机器人并返回 token（务必保密）。
- 若 token 泄露，通过 @BotFather 撤销/重新生成并更新配置。

### 群消息可见性（Privacy Mode）
Telegram 机器人默认开启**隐私模式**，会限制可见的群消息。
如果机器人需要看到**所有**群消息，有两种方式：
- 用 `/setprivacy` 关闭隐私模式，**或**
- 将机器人设为群**管理员**（管理员机器人可见所有消息）。

**注意：** 切换隐私模式后，需要将机器人从每个群移除并重新加入，设置才会生效。

### 群权限（管理员权限）
管理员状态在群内设置（Telegram UI）。管理员机器人总能看到所有群消息，因此需要完全可见性时使用管理员。

## 工作方式（行为）
- 入站消息会规范化为共享的渠道信封，包含回复上下文与媒体占位符。
- 群聊回复默认需要提及（原生 @mention 或 `agents.list[].groupChat.mentionPatterns` / `messages.groupChat.mentionPatterns`）。
- 多代理覆盖：在 `agents.list[].groupChat.mentionPatterns` 为每个 agent 设置。
- 回复总是回到同一个 Telegram 聊天。
- 长轮询使用 grammY runner 并按聊天顺序执行；整体并发受 `agents.defaults.maxConcurrent` 限制。
- Telegram Bot API 不支持已读回执；无 `sendReadReceipts` 选项。

## 格式化（Telegram HTML）
- Telegram 出站文本使用 `parse_mode: "HTML"`（Telegram 支持的标签子集）。
- 类 Markdown 输入会被渲染为**Telegram 安全 HTML**（粗体/斜体/删除线/代码/链接）；块级元素会折叠为带换行/项目符号的纯文本。
- 模型输出的原始 HTML 会被转义，避免 Telegram 解析错误。
- 若 Telegram 拒绝 HTML payload，Moltbot 会重试为纯文本。

## 命令（原生 + 自定义）
Moltbot 启动时会向 Telegram 的机器人菜单注册原生命令（如 `/status`、`/reset`、`/model`）。
你可以在配置中添加自定义命令：

```json5
{
  channels: {
    telegram: {
      customCommands: [
        { command: "backup", description: "Git 备份" },
        { command: "generate", description: "生成图片" }
      ]
    }
  }
}
```

## 故障排查

- 日志中出现 `setMyCommands failed` 往往说明到 `api.telegram.org` 的出站 HTTPS/DNS 被阻断。
- 若出现 `sendMessage` 或 `sendChatAction` 失败，检查 IPv6 路由与 DNS。

更多帮助：见 [渠道排查](/channels/troubleshooting)。

说明：
- 自定义命令**仅是菜单项**；Moltbot 不会自动实现，除非你另行处理。
- 命令名会被规范化（去掉前导 `/`，小写），必须匹配 `a-z`、`0-9`、`_`（1–32 字符）。
- 自定义命令**不能覆盖原生命令**。冲突会被忽略并记录日志。
- 若禁用 `commands.native`，只注册自定义命令（或若没有则清空）。

## 限制
- 出站文本按 `channels.telegram.textChunkLimit` 分块（默认 4000）。
- 可选换行分块：设置 `channels.telegram.chunkMode="newline"`，会在长度分块前按空行（段落边界）切分。
- 媒体下载/上传限制：`channels.telegram.mediaMaxMb`（默认 5）。
- Telegram Bot API 请求超时：`channels.telegram.timeoutSeconds`（默认 500，via grammY）。可降低以避免长时间挂起。
- 群历史上下文使用 `channels.telegram.historyLimit`（或 `channels.telegram.accounts.*.historyLimit`），回退到 `messages.groupChat.historyLimit`。设为 `0` 禁用（默认 50）。
- 私聊历史可通过 `channels.telegram.dmHistoryLimit` 限制（按用户回合）。按用户覆盖：`channels.telegram.dms["<user_id>"].historyLimit`。

## 群激活模式

默认情况下，机器人只在群聊被提及时响应（`@botname` 或 `agents.list[].groupChat.mentionPatterns`）。若要修改此行为：

### 通过配置（推荐）

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": { requireMention: false }  // 该群总是响应
      }
    }
  }
}
```

**重要：** 设置 `channels.telegram.groups` 会创建**允许列表**——只接受列出的群（或 `"*"`）。
论坛主题继承其父群配置（allowFrom、requireMention、skills、prompts），除非你在 `channels.telegram.groups.<groupId>.topics.<topicId>` 下设置按主题覆盖。

允许所有群并总是响应：
```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false }  // 所有群，总是响应
      }
    }
  }
}
```

保持所有群仅提及响应（默认行为）：
```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: true }  // 或完全省略 groups
      }
    }
  }
}
```

### 通过命令（会话级）

在群内发送：
- `/activation always` — 对所有消息响应
- `/activation mention` — 需要提及（默认）

**注意：** 命令只更新会话状态。要在重启后生效，请使用配置。

### 获取群聊 ID

把群里的任意消息转发给 Telegram 的 `@userinfobot` 或 `@getidsbot`，即可看到聊天 ID（负数，如 `-1001234567890`）。

**提示：** 获取自己的用户 ID，可以私聊机器人（配对消息会回复用户 ID），或在启用命令后使用 `/whoami`。

**隐私提示：** `@userinfobot` 是第三方机器人。如需避免第三方，可将机器人加入群后发送消息，然后用 `moltbot logs --follow` 查看 `chat.id`，或使用 Bot API 的 `getUpdates`。

## 配置写入
默认允许 Telegram 写入由渠道事件或 `/config set|unset` 触发的配置更新。

触发场景：
- 群升级为超级群并触发 `migrate_to_chat_id`（chat ID 变化）。Moltbot 可自动迁移 `channels.telegram.groups`。
- 在 Telegram 聊天里运行 `/config set` 或 `/config unset`（需要 `commands.config: true`）。

禁用方式：
```json5
{
  channels: { telegram: { configWrites: false } }
}
```

## 主题（论坛超级群）
Telegram 论坛主题每条消息包含 `message_thread_id`。Moltbot：
- 在 Telegram 群会话键后追加 `:topic:<threadId>`，使每个主题隔离。
- 发送输入指示与回复时带 `message_thread_id`，让响应留在主题内。
- 通用主题（thread id `1`）特殊：发送消息时不包含 `message_thread_id`（Telegram 会拒绝），但输入指示仍包含它。
- 在模板上下文中暴露 `MessageThreadId` 与 `IsForum`，用于路由/模板。
- 按主题配置位于 `channels.telegram.groups.<chatId>.topics.<threadId>`（skills、allowlists、自动回复、系统提示、禁用）。
- 主题配置默认继承群设置（requireMention、allowlists、skills、prompts、enabled），除非在主题级覆盖。

私聊在少数情况下也会带 `message_thread_id`。Moltbot 不改变 DM 会话键，但在存在时仍用于回复/草稿流式输出。

## 内联按钮

Telegram 支持带回调按钮的内联键盘。

```json5
{
  "channels": {
    "telegram": {
      "capabilities": {
        "inlineButtons": "allowlist"
      }
    }
  }
}
```

按账号配置：
```json5
{
  "channels": {
    "telegram": {
      "accounts": {
        "main": {
          "capabilities": {
            "inlineButtons": "allowlist"
          }
        }
      }
    }
  }
}
```

作用域：
- `off` — 禁用内联按钮
- `dm` — 仅私聊（群目标被阻止）
- `group` — 仅群聊（私聊目标被阻止）
- `all` — 私聊 + 群聊
- `allowlist` — 私聊 + 群聊，但仅允许 `allowFrom`/`groupAllowFrom` 的发送者（与控制命令相同规则）

默认值：`allowlist`。
旧版：`capabilities: ["inlineButtons"]` 等同 `inlineButtons: "all"`。

### 发送按钮

使用消息工具的 `buttons` 参数：

```json5
{
  "action": "send",
  "channel": "telegram",
  "to": "123456789",
  "message": "选择一个选项：",
  "buttons": [
    [
      {"text": "Yes", "callback_data": "yes"},
      {"text": "No", "callback_data": "no"}
    ],
    [
      {"text": "Cancel", "callback_data": "cancel"}
    ]
  ]
}
```

当用户点击按钮时，回调数据会以如下格式作为消息发送回 agent：
`callback_data: value`

### 配置选项

Telegram capabilities 可以配置在两层（上面为对象形式；旧版字符串数组也支持）：

- `channels.telegram.capabilities`：全局默认能力配置，除非被账号覆盖。
- `channels.telegram.accounts.<account>.capabilities`：按账号覆盖。

当所有机器人/账号需同样行为时用全局设置；不同机器人行为不同则用按账号配置（例如一个只处理私聊，另一个允许群聊）。
## 访问控制（私聊 + 群聊）

### 私聊访问
- 默认：`channels.telegram.dmPolicy = "pairing"`。陌生发送者会收到配对码；在批准前消息被忽略（码 1 小时过期）。
- 批准方式：
  - `moltbot pairing list telegram`
  - `moltbot pairing approve telegram <CODE>`
- 配对是 Telegram 私聊的默认令牌交换方式。详情：见 [配对](/start/pairing)
- `channels.telegram.allowFrom` 接受数字用户 ID（推荐）或 `@username`。它**不是**机器人用户名；请使用人类发送者 ID。向导会在可能时把 `@username` 解析为数字 ID。

#### 查找你的 Telegram 用户 ID
更安全方式（不依赖第三方）：
1) 启动 gateway 并私聊你的机器人。
2) 运行 `moltbot logs --follow` 并查找 `from.id`。

替代方式（官方 Bot API）：
1) 私聊机器人。
2) 用 bot token 拉取更新并读取 `message.from.id`：
   ```bash
   curl "https://api.telegram.org/bot<bot_token>/getUpdates"
   ```

第三方（隐私较弱）：
- 私聊 `@userinfobot` 或 `@getidsbot`，使用返回的 user id。

### 群聊访问

两个独立控制：

**1. 允许哪些群**（`channels.telegram.groups` 的群 allowlist）：
- 未配置 `groups` = 允许所有群
- 配置 `groups` = 仅允许列出的群或 `"*"`
- 示例：`"groups": { "-1001234567890": {}, "*": {} }` 允许所有群

**2. 允许哪些发送者**（`channels.telegram.groupPolicy` 的发送者过滤）：
- `"open"` = 允许群内所有发送者
- `"allowlist"` = 仅允许 `channels.telegram.groupAllowFrom` 中的发送者
- `"disabled"` = 完全不接收群消息
默认 `groupPolicy: "allowlist"`（若不添加 `groupAllowFrom` 则阻止）。

多数用户需要：`groupPolicy: "allowlist"` + `groupAllowFrom` + 在 `channels.telegram.groups` 中列出具体群。

## 长轮询 vs webhook
- 默认：长轮询（无需公网 URL）。
- Webhook 模式：设置 `channels.telegram.webhookUrl`（可选 `channels.telegram.webhookSecret` + `channels.telegram.webhookPath`）。
  - 本地监听器默认绑定 `0.0.0.0:8787`，并提供 `POST /telegram-webhook`。
  - 若公网 URL 不同，请用反向代理并让 `channels.telegram.webhookUrl` 指向公网端点。

## 回复线程
Telegram 支持通过标签进行可选线程回复：
- `[[reply_to_current]]` -- 回复触发消息。
- `[[reply_to:<id>]]` -- 回复指定消息 id。

由 `channels.telegram.replyToMode` 控制：
- `first`（默认）、`all`、`off`。

## 音频消息（语音 vs 文件）
Telegram 区分**语音便签**（圆形气泡）与**音频文件**（信息卡）。
Moltbot 默认发送音频文件以保持兼容。

若要在 agent 回复中强制发送语音便签，请在回复中任意位置加入标签：
- `[[audio_as_voice]]` — 将音频作为语音便签发送，而不是文件。

该标签会从最终文本中移除。其他渠道会忽略此标签。

对于 message 工具发送，使用 `asVoice: true` 与可作语音的音频 `media` URL（有媒体时 `message` 可选）：

```json5
{
  "action": "send",
  "channel": "telegram",
  "to": "123456789",
  "media": "https://example.com/voice.ogg",
  "asVoice": true
}
```

## 贴纸

Moltbot 支持接收和发送 Telegram 贴纸，并带智能缓存。

### 接收贴纸

当用户发送贴纸时，Moltbot 会按类型处理：

- **静态贴纸（WEBP）：** 下载并走视觉处理。消息内容中显示为 `<media:sticker>` 占位符。
- **动画贴纸（TGS）：** 跳过（不支持 Lottie 格式）。
- **视频贴纸（WEBM）：** 跳过（不支持视频格式处理）。

接收贴纸时可用的模板上下文字段：
- `Sticker` — 对象，包含：
  - `emoji` — 贴纸关联的 emoji
  - `setName` — 贴纸包名称
  - `fileId` — Telegram 文件 ID（可用它回发同一贴纸）
  - `fileUniqueId` — 稳定 ID，用于缓存查找
  - `cachedDescription` — 如有则为缓存的视觉描述

### 贴纸缓存

贴纸会经过 AI 视觉能力生成描述。由于同一贴纸经常重复发送，Moltbot 会缓存描述以避免重复调用 API。

**工作方式：**

1. **首次遇见：** 贴纸图片发送给 AI 做视觉分析，生成描述（如“一个挥手的卡通猫”）。
2. **缓存保存：** 描述与贴纸 file ID、emoji、set name 一起保存。
3. **再次遇见：** 直接使用缓存描述，不再发送图片给 AI。

**缓存位置：** `~/.clawdbot/telegram/sticker-cache.json`

**缓存条目格式：**
```json
{
  "fileId": "CAACAgIAAxkBAAI...",
  "fileUniqueId": "AgADBAADb6cxG2Y",
  "emoji": "👋",
  "setName": "CoolCats",
  "description": "A cartoon cat waving enthusiastically",
  "cachedAt": "2026-01-15T10:30:00.000Z"
}
```

**收益：**
- 避免重复视觉调用，降低 API 成本
- 缓存命中时响应更快（无视觉处理延迟）
- 可基于缓存描述进行贴纸搜索

缓存会在接收贴纸时自动填充，无需手动管理。

### 发送贴纸

agent 可以使用 `sticker` 与 `sticker-search` 动作发送与搜索贴纸。默认禁用，需要在配置中开启：

```json5
{
  channels: {
    telegram: {
      actions: {
        sticker: true
      }
    }
  }
}
```

**发送贴纸：**

```json5
{
  "action": "sticker",
  "channel": "telegram",
  "to": "123456789",
  "fileId": "CAACAgIAAxkBAAI..."
}
```

参数：
- `fileId`（必填）— Telegram 贴纸文件 ID。可从接收贴纸的 `Sticker.fileId` 获取，或来自 `sticker-search` 结果。
- `replyTo`（可选）— 要回复的消息 ID。
- `threadId`（可选）— 论坛主题的 message thread ID。

**搜索贴纸：**

agent 可按描述、emoji、贴纸包名称搜索缓存贴纸：

```json5
{
  "action": "sticker-search",
  "channel": "telegram",
  "query": "cat waving",
  "limit": 5
}
```

返回匹配的缓存贴纸：
```json5
{
  "ok": true,
  "count": 2,
  "stickers": [
    {
      "fileId": "CAACAgIAAxkBAAI...",
      "emoji": "👋",
      "description": "A cartoon cat waving enthusiastically",
      "setName": "CoolCats"
    }
  ]
}
```

搜索对描述文本、emoji 字符与贴纸包名称做模糊匹配。

**带线程示例：**

```json5
{
  "action": "sticker",
  "channel": "telegram",
  "to": "-1001234567890",
  "fileId": "CAACAgIAAxkBAAI...",
  "replyTo": 42,
  "threadId": 123
}
```

## 流式输出（草稿）
Telegram 可以在 agent 生成回复时流式显示**草稿气泡**。
Moltbot 使用 Bot API 的 `sendMessageDraft`（非真实消息），然后再发送最终回复。

要求（Telegram Bot API 9.3+）：
- **私聊且启用主题**（为机器人启用论坛主题模式）。
- 入站消息必须包含 `message_thread_id`（私聊主题线程）。
- 群/超级群/频道不支持流式草稿。

配置：
- `channels.telegram.streamMode: "off" | "partial" | "block"`（默认：`partial`）
  - `partial`：用最新流式文本更新草稿气泡。
  - `block`：按较大块更新草稿气泡（分块）。
  - `off`：禁用草稿流式。
- 可选（仅 `streamMode: "block"`）：
  - `channels.telegram.draftChunk: { minChars?, maxChars?, breakPreference? }`
    - 默认：`minChars: 200`、`maxChars: 800`、`breakPreference: "paragraph"`（会被 `channels.telegram.textChunkLimit` 夹取）。

注意：草稿流式与**块流式**（渠道消息）是分离的。
块流式默认关闭；如需提前发送 Telegram 消息而不是草稿更新，需 `channels.telegram.blockStreaming: true`。

推理流（仅 Telegram）：
- `/reasoning stream` 会在生成回复时将推理流到草稿气泡，然后发送不含推理的最终答案。
- 若 `channels.telegram.streamMode` 为 `off`，推理流被禁用。
更多背景：见 [流式输出与分块](/concepts/streaming)。

## 重试策略
Telegram 出站 API 在临时网络/429 错误时会指数退避与抖动重试。通过 `channels.telegram.retry` 配置。见 [重试策略](/concepts/retry)。

## Agent 工具（消息 + 反应）
- 工具：`telegram` 的 `sendMessage` 动作（`to`、`content`，可选 `mediaUrl`、`replyToMessageId`、`messageThreadId`）。
- 工具：`telegram` 的 `react` 动作（`chatId`、`messageId`、`emoji`）。
- 工具：`telegram` 的 `deleteMessage` 动作（`chatId`、`messageId`）。
- 反应移除语义：见 [/tools/reactions](/tools/reactions)。
- 工具开关：`channels.telegram.actions.reactions`、`channels.telegram.actions.sendMessage`、`channels.telegram.actions.deleteMessage`（默认启用），以及 `channels.telegram.actions.sticker`（默认禁用）。

## 反应通知

**反应如何工作：**
Telegram 反应以**单独的 `message_reaction` 事件**到达，而不是消息字段。当用户添加反应时，Moltbot：

1. 从 Telegram API 接收 `message_reaction` 更新
2. 将其转换为**系统事件**，格式：`"Telegram reaction added: {emoji} by {user} on msg {id}"`
3. 使用与普通消息相同的会话键入队
4. 下条消息到来时，系统事件被抽取并前置到 agent 上下文

因此 agent 在对话历史中看到的是**系统通知**，不是消息元数据。

**配置：**
- `channels.telegram.reactionNotifications`：控制哪些反应触发通知
  - `"off"` — 忽略所有反应
  - `"own"` — 用户对机器人消息的反应通知（尽力而为；内存态）（默认）
  - `"all"` — 所有反应都通知

- `channels.telegram.reactionLevel`：控制 agent 的反应能力
  - `"off"` — agent 不能反应
  - `"ack"` — 机器人发送确认反应（处理中用 👀）（默认）
  - `"minimal"` — 可适度反应（建议每 5–10 次互动 1 次）
  - `"extensive"` — 可更频繁反应（视情况）

**论坛群组：** 论坛群组中的反应包含 `message_thread_id`，会话键形如 `agent:main:telegram:group:{chatId}:topic:{threadId}`，确保反应与同主题消息保持一致。

**配置示例：**
```json5
{
  channels: {
    telegram: {
      reactionNotifications: "all",  // 查看所有反应
      reactionLevel: "minimal"        // agent 适度反应
    }
  }
}
```

**要求：**
- Telegram 机器人必须显式在 `allowed_updates` 中请求 `message_reaction`（Moltbot 会自动配置）
- Webhook 模式中，反应包含在 webhook 的 `allowed_updates`
- Polling 模式中，反应包含在 `getUpdates` 的 `allowed_updates`

## 投递目标（CLI/cron）
- 使用 chat id（`123456789`）或用户名（`@name`）作为目标。
- 示例：`moltbot message send --channel telegram --target 123456789 --message "hi"`。

## 故障排查

**机器人在群里对非提及消息不响应：**
- 若设置 `channels.telegram.groups.*.requireMention=false`，必须关闭 Telegram Bot API 的**隐私模式**。
  - BotFather：`/setprivacy` → **Disable**（然后移除并重新加入机器人）
- `moltbot channels status` 会在配置期望未提及消息时提示警告。
- `moltbot channels status --probe` 还能检查显式数字群 ID 的成员资格（无法审计通配 `"*"` 规则）。
- 快速测试：`/activation always`（仅会话；持久化请用配置）

**机器人完全看不到群消息：**
- 若设置了 `channels.telegram.groups`，群必须列出或使用 `"*"`
- 在 @BotFather 的 Privacy Settings 中确认 “Group Privacy” 应为 **OFF**
- 确认机器人确实是成员（不只是管理员但无读权限）
- 查看 gateway 日志：`moltbot logs --follow`（查找 "skipping group message"）

**机器人响应提及但 `/activation always` 无效：**
- `/activation` 只更新会话状态，不会持久化到配置
- 持久化行为请在 `channels.telegram.groups` 中设置 `requireMention: false`

**`/status` 等命令不工作：**
- 确认你的 Telegram 用户 ID 已授权（配对或 `channels.telegram.allowFrom`）
- 即使 `groupPolicy: "open"`，命令仍需要授权

**Node 22+ 上长轮询立刻中止（常伴代理/自定义 fetch）：**
- Node 22+ 对 `AbortSignal` 更严格；外部信号可能导致 `fetch` 立即中止。
- 升级到会规范化 abort signal 的 Moltbot 版本，或在可升级前使用 Node 20 运行 gateway。

**机器人启动后悄然不再响应（或日志出现 `HttpError: Network request ... failed`）：**
- 有些主机优先解析 `api.telegram.org` 的 IPv6。若服务器没有可用 IPv6 出站，grammY 可能卡在 IPv6 请求。
- 解决：启用 IPv6 出站，**或** 强制 `api.telegram.org` 走 IPv4（例如在 `/etc/hosts` 添加 IPv4 A 记录，或在系统 DNS 中优先 IPv4），然后重启 gateway。
- 快速检查：`dig +short api.telegram.org A` 与 `dig +short api.telegram.org AAAA` 以确认 DNS 返回。

## 配置参考（Telegram）
完整配置：见 [配置](/gateway/configuration)

Provider 选项：
- `channels.telegram.enabled`：启用/禁用渠道启动。
- `channels.telegram.botToken`：机器人 token（BotFather）。
- `channels.telegram.tokenFile`：从文件读取 token。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.telegram.allowFrom`：私聊 allowlist（ID/用户名）。`open` 需包含 `"*"`。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.telegram.groupAllowFrom`：群发送者 allowlist（ID/用户名）。
- `channels.telegram.groups`：按群默认 + allowlist（用 `"*"` 作为全局默认）。
  - `channels.telegram.groups.<id>.requireMention`：提及门控默认值。
  - `channels.telegram.groups.<id>.skills`：技能过滤（省略 = 所有技能；空数组 = 无技能）。
  - `channels.telegram.groups.<id>.allowFrom`：按群发送者 allowlist 覆盖。
  - `channels.telegram.groups.<id>.systemPrompt`：群聊额外系统提示。
  - `channels.telegram.groups.<id>.enabled`：为 `false` 时禁用该群。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：按主题覆盖（字段同群）。
  - `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：按主题提及门控覆盖。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（默认：allowlist）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：按账号覆盖。
- `channels.telegram.replyToMode`：`off | first | all`（默认：`first`）。
- `channels.telegram.textChunkLimit`：出站分块大小（字符）。
- `channels.telegram.chunkMode`：`length`（默认）或 `newline`（按空行分段再按长度分块）。
- `channels.telegram.linkPreview`：出站消息链接预览开关（默认：true）。
- `channels.telegram.streamMode`：`off | partial | block`（草稿流式）。
- `channels.telegram.mediaMaxMb`：入站/出站媒体上限（MB）。
- `channels.telegram.retry`：Telegram 出站 API 重试策略（attempts、minDelayMs、maxDelayMs、jitter）。
- `channels.telegram.network.autoSelectFamily`：覆盖 Node 的 autoSelectFamily（true=启用，false=禁用）。Node 22 默认禁用以避免 Happy Eyeballs 超时。
- `channels.telegram.proxy`：Bot API 代理 URL（SOCKS/HTTP）。
- `channels.telegram.webhookUrl`：启用 webhook 模式。
- `channels.telegram.webhookSecret`：webhook 密钥（可选）。
- `channels.telegram.webhookPath`：本地 webhook 路径（默认 `/telegram-webhook`）。
- `channels.telegram.actions.reactions`：Telegram 工具反应开关。
- `channels.telegram.actions.sendMessage`：Telegram 工具发送开关。
- `channels.telegram.actions.deleteMessage`：Telegram 工具删除开关。
- `channels.telegram.actions.sticker`：Telegram 贴纸动作开关 — 发送与搜索（默认：false）。
- `channels.telegram.reactionNotifications`：`off | own | all` — 控制触发系统事件的反应（默认：未设置时为 `own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` — 控制 agent 的反应能力（默认：未设置时为 `minimal`）。

相关全局选项：
- `agents.list[].groupChat.mentionPatterns`（提及门控模式）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `commands.native`（默认 `"auto"` → Telegram/Discord 开启、Slack 关闭）、`commands.text`、`commands.useAccessGroups`（命令行为）。可用 `channels.telegram.commands.native` 覆盖。
- `messages.responsePrefix`、`messages.ackReaction`、`messages.ackReactionScope`、`messages.removeAckAfterReply`。
