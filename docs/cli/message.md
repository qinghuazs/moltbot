---
summary: "`moltbot message` 的 CLI 参考（发送与渠道操作）"
read_when:
  - 添加或修改 message CLI 动作
  - 调整外发渠道行为
---

# `moltbot message`

用于发送消息和执行渠道操作的统一命令
（Discord/Google Chat/Slack/Mattermost（插件）/Telegram/WhatsApp/Signal/iMessage/MS Teams）。

## 用法

```
moltbot message <subcommand> [flags]
```

渠道选择：
- 当配置了多个渠道时，必须使用 `--channel`。
- 仅配置一个渠道时，它会成为默认值。
- 可选值：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`（Mattermost 需要插件）

目标格式（`--target`）：
- WhatsApp：E.164 或群组 JID
- Telegram：chat id 或 `@username`
- Discord：`channel:<id>` 或 `user:<id>`（也支持 `<@id>` 提及；纯数字 id 视为 channel）
- Google Chat：`spaces/<spaceId>` 或 `users/<userId>`
- Slack：`channel:<id>` 或 `user:<id>`（可直接使用 channel id）
- Mattermost（插件）：`channel:<id>`、`user:<id>` 或 `@username`（纯数字 id 视为 channel）
- Signal：`+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage：handle、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- MS Teams：conversation id（`19:...@thread.tacv2`）或 `conversation:<id>` 或 `user:<aad-object-id>`

名称解析：
- 对支持的提供商（Discord/Slack 等），`Help` 或 `#help` 之类的渠道名会通过目录缓存解析。
- 缓存命中失败时，Moltbot 会在提供商支持的情况下尝试实时目录查询。

## 常用标志

- `--channel <name>`
- `--account <id>`
- `--target <dest>`（send/poll/read 等动作的目标渠道或用户）
- `--targets <name>`（可重复；仅用于 broadcast）
- `--json`
- `--dry-run`
- `--verbose`

## 动作

### 核心

- `send`
  - 渠道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/MS Teams
  - 必需：`--target`，并且提供 `--message` 或 `--media`
  - 可选：`--media`、`--reply-to`、`--thread-id`、`--gif-playback`
  - 仅 Telegram：`--buttons`（需要 `channels.telegram.capabilities.inlineButtons` 允许）
  - 仅 Telegram：`--thread-id`（论坛话题 id）
  - 仅 Slack：`--thread-id`（thread timestamp；`--reply-to` 复用该字段）
  - 仅 WhatsApp：`--gif-playback`

- `poll`
  - 渠道：WhatsApp/Discord/MS Teams
  - 必需：`--target`、`--poll-question`、`--poll-option`（可重复）
  - 可选：`--poll-multi`
  - 仅 Discord：`--poll-duration-hours`、`--message`

- `react`
  - 渠道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - 必需：`--message-id`、`--target`
  - 可选：`--emoji`、`--remove`、`--participant`、`--from-me`、`--target-author`、`--target-author-uuid`
  - 说明：`--remove` 需要 `--emoji`（省略 `--emoji` 可在支持的渠道清除自己的反应；见 /tools/reactions）
  - 仅 WhatsApp：`--participant`、`--from-me`
  - Signal 群组反应：需要 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 渠道：Discord/Google Chat/Slack
  - 必需：`--message-id`、`--target`
  - 可选：`--limit`

- `read`
  - 渠道：Discord/Slack
  - 必需：`--target`
  - 可选：`--limit`、`--before`、`--after`
  - 仅 Discord：`--around`

- `edit`
  - 渠道：Discord/Slack
  - 必需：`--message-id`、`--message`、`--target`

- `delete`
  - 渠道：Discord/Slack/Telegram
  - 必需：`--message-id`、`--target`

- `pin` / `unpin`
  - 渠道：Discord/Slack
  - 必需：`--message-id`、`--target`

- `pins`（列表）
  - 渠道：Discord/Slack
  - 必需：`--target`

- `permissions`
  - 渠道：Discord
  - 必需：`--target`

- `search`
  - 渠道：Discord
  - 必需：`--guild-id`、`--query`
  - 可选：`--channel-id`、`--channel-ids`（可重复）、`--author-id`、`--author-ids`（可重复）、`--limit`

### 线程

- `thread create`
  - 渠道：Discord
  - 必需：`--thread-name`、`--target`（channel id）
  - 可选：`--message-id`、`--auto-archive-min`

- `thread list`
  - 渠道：Discord
  - 必需：`--guild-id`
  - 可选：`--channel-id`、`--include-archived`、`--before`、`--limit`

- `thread reply`
  - 渠道：Discord
  - 必需：`--target`（thread id）、`--message`
  - 可选：`--media`、`--reply-to`

### 表情

- `emoji list`
  - Discord：`--guild-id`
  - Slack：无额外标志

- `emoji upload`
  - 渠道：Discord
  - 必需：`--guild-id`、`--emoji-name`、`--media`
  - 可选：`--role-ids`（可重复）

### 贴纸

- `sticker send`
  - 渠道：Discord
  - 必需：`--target`、`--sticker-id`（可重复）
  - 可选：`--message`

- `sticker upload`
  - 渠道：Discord
  - 必需：`--guild-id`、`--sticker-name`、`--sticker-desc`、`--sticker-tags`、`--media`

### 角色 / 渠道 / 成员 / 语音

- `role info`（Discord）：`--guild-id`
- `role add` / `role remove`（Discord）：`--guild-id`、`--user-id`、`--role-id`
- `channel info`（Discord）：`--target`
- `channel list`（Discord）：`--guild-id`
- `member info`（Discord/Slack）：`--user-id`（Discord 还需 `--guild-id`）
- `voice status`（Discord）：`--guild-id`、`--user-id`

### 事件

- `event list`（Discord）：`--guild-id`
- `event create`（Discord）：`--guild-id`、`--event-name`、`--start-time`
  - 可选：`--end-time`、`--desc`、`--channel-id`、`--location`、`--event-type`

### 管理（Discord）

- `timeout`：`--guild-id`、`--user-id`（可选 `--duration-min` 或 `--until`；两者都不传时清除 timeout）
- `kick`：`--guild-id`、`--user-id`（可选 `--reason`）
- `ban`：`--guild-id`、`--user-id`（可选 `--delete-days`、`--reason`）
  - `timeout` 也支持 `--reason`

### 广播

- `broadcast`
  - 渠道：任意已配置渠道；使用 `--channel all` 目标所有提供商
  - 必需：`--targets`（可重复）
  - 可选：`--message`、`--media`、`--dry-run`

## 示例

发送 Discord 回复：
```
moltbot message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

创建 Discord 投票：
```
moltbot message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

发送 Teams 主动消息：
```
moltbot message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 --message "hi"
```
