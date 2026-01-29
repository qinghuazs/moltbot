---
summary: "Discord 机器人支持状态、能力与配置"
read_when:
  - 在处理 Discord 渠道功能时
---
# Discord（Bot API）

状态：通过官方 Discord 机器人网关支持私聊与服务器文本频道。

## 快速上手（新手）
1) 创建 Discord 机器人并复制 bot token。
2) 在 Discord 应用设置中启用 **Message Content Intent**（如果需要 allowlist 或名称查找，还要启用 **Server Members Intent**）。
3) 为 Moltbot 设置 token：
   - 环境变量：`DISCORD_BOT_TOKEN=...`
   - 或配置：`channels.discord.token: "..."`。
   - 两者同时设置时，配置优先（环境变量仅用于默认账号）。
4) 用消息权限将机器人邀请到你的服务器（若仅需私聊，可建一个私人服务器）。
5) 启动 gateway。
6) 私聊默认配对；首次联系时批准配对码。

最小配置：
```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN"
    }
  }
}
```

## 目标
- 通过 Discord 私聊或服务器频道与 Moltbot 对话。
- 私聊会折叠到 agent 主会话（默认 `agent:main:main`）；服务器频道保持隔离为 `agent:<agentId>:discord:channel:<channelId>`（显示名使用 `discord:<guildSlug>#<channelSlug>`）。
- 群 DM 默认忽略；可通过 `channels.discord.dm.groupEnabled` 启用，并可用 `channels.discord.dm.groupChannels` 限制。
- 保持确定性路由：回复总是回到消息来源频道。

## 工作方式
1. 创建 Discord 应用 → Bot，启用所需 intents（私聊 + 服务器消息 + message content），并获取 bot token。
2. 用所需权限将机器人邀请到服务器，以便读取/发送消息。
3. 用 `channels.discord.token` 配置 Moltbot（或使用 `DISCORD_BOT_TOKEN` 作为兜底）。
4. 运行 gateway；当有 token 且 `channels.discord.enabled` 非 `false` 时会自动启动 Discord 渠道（配置优先，环境变量兜底）。
   - 若偏好环境变量，只需设置 `DISCORD_BOT_TOKEN`（配置块可选）。
5. 私聊投递：使用 `user:<id>`（或 `<@id>` 提及）。所有轮次进入共享 `main` 会话。裸数字 ID 有歧义会被拒绝。
6. 服务器频道：用 `channel:<channelId>` 投递。默认需要提及，可按服务器或频道设置。
7. 私聊默认安全：`channels.discord.dm.policy`（默认：`"pairing"`）。陌生发送者得到配对码（1 小时过期）；用 `moltbot pairing approve discord <code>` 批准。
   - 保持旧的“开放给所有人”：设 `channels.discord.dm.policy="open"` 且 `channels.discord.dm.allowFrom=["*"]`。
   - 仅 allowlist：设 `channels.discord.dm.policy="allowlist"` 并在 `channels.discord.dm.allowFrom` 列出发送者。
   - 忽略所有私聊：设 `channels.discord.dm.enabled=false` 或 `channels.discord.dm.policy="disabled"`。
8. 群 DM 默认忽略；用 `channels.discord.dm.groupEnabled` 启用，并可用 `channels.discord.dm.groupChannels` 限制。
9. 可选服务器规则：在 `channels.discord.guilds` 中按服务器 id（优先）或 slug 配置，并可设置按频道规则。
10. 可选原生命令：`commands.native` 默认 `"auto"`（Discord/Telegram 开、Slack 关）。可用 `channels.discord.commands.native: true|false|"auto"` 覆盖；`false` 会清除已注册命令。文本命令由 `commands.text` 控制，必须作为独立 `/...` 消息发送。用 `commands.useAccessGroups: false` 可绕过命令访问组检查。
    - 完整命令列表与配置：见 [Slash 命令](/tools/slash-commands)
11. 可选服务器上下文历史：设置 `channels.discord.historyLimit`（默认 20，回退到 `messages.groupChat.historyLimit`），用于回复提及时注入最近 N 条消息。设为 `0` 禁用。
12. 反应：agent 可通过 `discord` 工具触发反应（由 `channels.discord.actions.*` 控制）。
    - 反应移除语义：见 [/tools/reactions](/tools/reactions)。
    - `discord` 工具仅在当前渠道为 Discord 时暴露。
13. 原生命令使用隔离会话键（`agent:<agentId>:discord:slash:<userId>`），而不是共享 `main` 会话。

注意：名称 → id 解析使用服务器成员搜索，需要 Server Members Intent；若机器人无法搜索成员，请用 id 或 `<@id>` 提及。
注意：slug 为小写，空格替换为 `-`。频道名 slug 不含前导 `#`。
注意：服务器上下文 `[from:]` 行包含 `author.tag` + `id`，便于回复时直接 @。

## 配置写入
默认允许 Discord 写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用方式：
```json5
{
  channels: { discord: { configWrites: false } }
}
```

## 如何创建自己的机器人

这是在 Discord Developer Portal 中为 Moltbot 在服务器（guild）频道（如 `#help`）运行的设置步骤。

### 1) 创建 Discord 应用 + bot 用户
1. Discord Developer Portal → **Applications** → **New Application**
2. 在你的应用中：
   - **Bot** → **Add Bot**
   - 复制 **Bot Token**（即 `DISCORD_BOT_TOKEN`）

### 2) 启用 Moltbot 所需 intents
Discord 会阻止“特权 intents”，必须显式启用。

在 **Bot** → **Privileged Gateway Intents** 中启用：
- **Message Content Intent**（读取多数服务器中的消息文本必需；否则会看到 “Used disallowed intents” 或连接后不响应）
- **Server Members Intent**（推荐；用于成员/用户查询与服务器 allowlist 匹配）

通常**不需要** **Presence Intent**。

### 3) 生成邀请 URL（OAuth2 URL Generator）
在应用中：**OAuth2** → **URL Generator**

**Scopes**
- ✅ `bot`
- ✅ `applications.commands`（原生命令必需）

**Bot 权限**（最小基线）
- ✅ View Channels
- ✅ Send Messages
- ✅ Read Message History
- ✅ Embed Links
- ✅ Attach Files
- ✅ Add Reactions（可选但推荐）
- ✅ Use External Emojis / Stickers（可选，仅在需要时）

除非在调试且完全信任机器人，否则避免 **Administrator**。

复制生成的 URL，打开后选择服务器并安装机器人。

### 4) 获取 id（服务器/用户/频道）
Discord 到处使用数字 id；Moltbot 配置优先使用 id。

1. Discord（桌面/网页）→ **User Settings** → **Advanced** → 启用 **Developer Mode**
2. 右键：
   - 服务器名称 → **Copy Server ID**（guild id）
   - 频道（如 `#help`） → **Copy Channel ID**
   - 你的用户 → **Copy User ID**

### 5) 配置 Moltbot

#### Token
通过环境变量设置 bot token（服务器上推荐）：
- `DISCORD_BOT_TOKEN=...`

或通过配置：

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN"
    }
  }
}
```

多账号支持：使用 `channels.discord.accounts` 为每个账号配置 token 和可选 `name`。共享模式见 [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts)。

#### Allowlist + 频道路由
示例“单服务器，仅允许我，仅允许 #help”：

```json5
{
  channels: {
    discord: {
      enabled: true,
      dm: { enabled: false },
      guilds: {
        "YOUR_GUILD_ID": {
          users: ["YOUR_USER_ID"],
          requireMention: true,
          channels: {
            help: { allow: true, requireMention: true }
          }
        }
      },
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1
      }
    }
  }
}
```

说明：
- `requireMention: true` 表示只有被提及时才回复（共享频道推荐）。
- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）也会作为服务器消息的提及。
- 多代理覆盖：在 `agents.list[].groupChat.mentionPatterns` 为每个 agent 设置。
- 若存在 `channels`，未列出的频道默认拒绝。
- 使用 `"*"` 频道条目可设置所有频道的默认值；显式频道条目覆盖通配。
- 线程会继承父频道配置（allowlist、`requireMention`、skills、prompts 等），除非你显式添加线程频道 id。
- 默认忽略机器人消息；设 `channels.discord.allowBots=true` 可允许（自己的消息仍会过滤）。
- 警告：若允许回复其他机器人（`channels.discord.allowBots=true`），请用 `requireMention`、`channels.discord.guilds.*.channels.<id>.users` allowlist，和/或在 `AGENTS.md`、`SOUL.md` 中收紧 guardrails，防止机器人互相循环回复。

### 6) 验证是否工作
1. 启动 gateway。
2. 在服务器频道里发送：`@Krill hello`（或你的机器人名）。
3. 若无响应：查看下方 **故障排查**。

### 故障排查
- 首先：运行 `moltbot doctor` 与 `moltbot channels status --probe`（可操作警告 + 快速审计）。
- **“Used disallowed intents”**：在 Developer Portal 启用 **Message Content Intent**（很可能还需 **Server Members Intent**），然后重启 gateway。
- **机器人连接但在服务器频道不回复**：
  - 缺少 **Message Content Intent**，或
  - 机器人缺少频道权限（View/Send/Read History），或
  - 配置要求提及但你未提及，或
  - 服务器/频道 allowlist 拒绝该频道/用户。
- **`requireMention: false` 仍不回复**：
- `channels.discord.groupPolicy` 默认是 **allowlist**；设为 `"open"` 或在 `channels.discord.guilds` 下添加服务器条目（也可在 `channels.discord.guilds.<id>.channels` 列出频道以限制）。
  - 若你只设置了 `DISCORD_BOT_TOKEN` 且未创建 `channels.discord` 配置段，运行时默认 `groupPolicy` 为 `open`。要锁定它，请添加 `channels.discord.groupPolicy`、
    `channels.defaults.groupPolicy`，或配置服务器/频道 allowlist。
- `requireMention` 必须在 `channels.discord.guilds`（或具体频道）下设置。顶层 `channels.discord.requireMention` 会被忽略。
- **权限审计**（`channels status --probe`）只检查数字频道 ID。若 `channels.discord.guilds.*.channels` 使用 slug/名称作为 key，则审计无法验证权限。
- **私聊不工作**：`channels.discord.dm.enabled=false`、`channels.discord.dm.policy="disabled"`，或尚未批准（`channels.discord.dm.policy="pairing"`）。

## 能力与限制
- 私聊与服务器文本频道（线程视为独立频道；不支持语音）。
- 输入指示尽力发送；消息分块使用 `channels.discord.textChunkLimit`（默认 2000），并按行数分割长回复（`channels.discord.maxLinesPerMessage`，默认 17）。
- 可选换行分块：设置 `channels.discord.chunkMode="newline"`，先按空行（段落边界）分块，再按长度分块。
- 文件上传上限：`channels.discord.mediaMaxMb`（默认 8 MB）。
- 默认提及门控，避免机器人在服务器里噪声太大。
- 当消息引用另一条消息时会注入回复上下文（引用内容 + id）。
- 原生线程回复**默认关闭**；通过 `channels.discord.replyToMode` 与回复标签启用。

## 重试策略
Discord 出站 API 在遇到限流（429）时，会在可用的 `retry_after` 基础上指数退避与抖动重试。通过 `channels.discord.retry` 配置。见 [重试策略](/concepts/retry)。

## 配置

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "abc.123",
      groupPolicy: "allowlist",
      guilds: {
        "*": {
          channels: {
            general: { allow: true }
          }
        }
      },
      mediaMaxMb: 8,
      actions: {
        reactions: true,
        stickers: true,
        emojiUploads: true,
        stickerUploads: true,
        polls: true,
        permissions: true,
        messages: true,
        threads: true,
        pins: true,
        search: true,
        memberInfo: true,
        roleInfo: true,
        roles: false,
        channelInfo: true,
        channels: true,
        voiceStatus: true,
        events: true,
        moderation: false
      },
      replyToMode: "off",
      dm: {
        enabled: true,
        policy: "pairing", // pairing | allowlist | open | disabled
        allowFrom: ["123456789012345678", "steipete"],
        groupEnabled: false,
        groupChannels: ["clawd-dm"]
      },
      guilds: {
        "*": { requireMention: true },
        "123456789012345678": {
          slug: "friends-of-clawd",
          requireMention: false,
          reactionNotifications: "own",
          users: ["987654321098765432", "steipete"],
          channels: {
            general: { allow: true },
            help: {
              allow: true,
              requireMention: true,
              users: ["987654321098765432"],
              skills: ["search", "docs"],
              systemPrompt: "Keep answers short."
            }
          }
        }
      }
    }
  }
}
```

确认反应由 `messages.ackReaction` +
`messages.ackReactionScope` 全局控制。用 `messages.removeAckAfterReply` 在机器人回复后移除确认反应。

- `dm.enabled`：设为 `false` 忽略所有私聊（默认 `true`）。
- `dm.policy`：私聊访问控制（推荐 `pairing`）。`"open"` 需要 `dm.allowFrom=["*"]`。
- `dm.allowFrom`：私聊 allowlist（用户 id 或名称）。用于 `dm.policy="allowlist"` 与 `dm.policy="open"` 校验。向导在机器人可搜索成员时接受用户名并解析为 id。
- `dm.groupEnabled`：启用群 DM（默认 `false`）。
- `dm.groupChannels`：群 DM 频道 id 或 slug 的可选 allowlist。
- `groupPolicy`：控制服务器频道处理（`open|disabled|allowlist`）；`allowlist` 需要频道 allowlist。
- `guilds`：按服务器规则（key 为服务器 id，优先）或 slug。
- `guilds."*"`：无明确条目时应用的默认服务器设置。
- `guilds.<id>.slug`：可选友好 slug，用于显示名。
- `guilds.<id>.users`：按服务器用户 allowlist（id 或名称）。
- `guilds.<id>.tools`：按服务器工具策略覆盖（`allow`/`deny`/`alsoAllow`），当频道未覆盖时生效。
- `guilds.<id>.toolsBySender`：按发送者工具策略覆盖（服务器级；频道未覆盖时生效；支持 `"*"`）。
- `guilds.<id>.channels.<channel>.allow`：当 `groupPolicy="allowlist"` 时允许/禁止频道。
- `guilds.<id>.channels.<channel>.requireMention`：频道提及门控。
- `guilds.<id>.channels.<channel>.tools`：按频道工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `guilds.<id>.channels.<channel>.toolsBySender`：频道内按发送者工具策略覆盖（支持 `"*"`）。
- `guilds.<id>.channels.<channel>.users`：频道用户 allowlist。
- `guilds.<id>.channels.<channel>.skills`：技能过滤（省略 = 所有技能；空数组 = 无技能）。
- `guilds.<id>.channels.<channel>.systemPrompt`：频道额外系统提示（与频道主题合并）。
- `guilds.<id>.channels.<channel>.enabled`：设为 `false` 禁用该频道。
- `guilds.<id>.channels`：频道规则（key 为频道 slug 或 id）。
- `guilds.<id>.requireMention`：按服务器提及要求（可被频道覆盖）。
- `guilds.<id>.reactionNotifications`：反应系统事件模式（`off`、`own`、`all`、`allowlist`）。
- `textChunkLimit`：出站文本分块大小（字符）。默认：2000。
- `chunkMode`：`length`（默认）仅在超过 `textChunkLimit` 时分块；`newline` 在分块前按空行（段落边界）切分。
- `maxLinesPerMessage`：每条消息最大行数（软限制）。默认：17。
- `mediaMaxMb`：限制入站媒体保存到磁盘的大小。
- `historyLimit`：回复提及时注入的最近服务器消息数（默认 20；回退到 `messages.groupChat.historyLimit`；设 `0` 禁用）。
- `dmHistoryLimit`：私聊历史限制（用户回合）。按用户覆盖：`dms["<user_id>"].historyLimit`。
- `retry`：Discord 出站 API 重试策略（attempts、minDelayMs、maxDelayMs、jitter）。
- `actions`：按动作工具开关；省略表示全部允许（设 `false` 禁用）。
  - `reactions`（覆盖 react + read reactions）
  - `stickers`、`emojiUploads`、`stickerUploads`、`polls`、`permissions`、`messages`、`threads`、`pins`、`search`
  - `memberInfo`、`roleInfo`、`channelInfo`、`voiceStatus`、`events`
  - `channels`（创建/编辑/删除频道 + 分类 + 权限）
  - `roles`（角色增删，默认 `false`）
  - `moderation`（禁言/踢出/封禁，默认 `false`）

反应通知使用 `guilds.<id>.reactionNotifications`：
- `off`：无反应事件。
- `own`：机器人自己的消息上的反应（默认）。
- `all`：所有消息上的所有反应。
- `allowlist`：来自 `guilds.<id>.users` 的反应（空列表表示禁用）。

### 工具动作默认值

| 动作组 | 默认 | 说明 |
| --- | --- | --- |
| reactions | enabled | 反应 + 列表反应 + emojiList |
| stickers | enabled | 发送贴纸 |
| emojiUploads | enabled | 上传表情 |
| stickerUploads | enabled | 上传贴纸 |
| polls | enabled | 创建投票 |
| permissions | enabled | 频道权限快照 |
| messages | enabled | 读/发/改/删 |
| threads | enabled | 创建/列表/回复 |
| pins | enabled | 置顶/取消置顶/列表 |
| search | enabled | 消息搜索（预览特性） |
| memberInfo | enabled | 成员信息 |
| roleInfo | enabled | 角色列表 |
| channelInfo | enabled | 频道信息 + 列表 |
| channels | enabled | 频道/分类管理 |
| voiceStatus | enabled | 语音状态查询 |
| events | enabled | 计划事件列表/创建 |
| roles | disabled | 角色增删 |
| moderation | disabled | 禁言/踢出/封禁 |
- `replyToMode`：`off`（默认）、`first` 或 `all`。仅在模型输出包含回复标签时生效。

## 回复标签
若模型需要线程回复，可在输出中包含一个标签：
- `[[reply_to_current]]` — 回复触发的 Discord 消息。
- `[[reply_to:<id>]]` — 回复上下文/历史中的指定消息 id。
当前消息 id 会以 `[message_id: …]` 追加到 prompt；历史条目已包含 id。

由 `channels.discord.replyToMode` 控制：
- `off`：忽略标签。
- `first`：仅第一段出站分块/附件是回复。
- `all`：每个出站分块/附件都是回复。

Allowlist 匹配说明：
- `allowFrom`/`users`/`groupChannels` 接受 id、名称、tag 或 `<@id>` 提及。
- 支持 `discord:`/`user:`（用户）与 `channel:`（群 DM）前缀。
- 用 `*` 允许任意发送者/频道。
- 当存在 `guilds.<id>.channels` 时，未列出频道默认拒绝。
- 当省略 `guilds.<id>.channels` 时，allowlist 服务器内所有频道允许。
- 要**禁止所有频道**，设 `channels.discord.groupPolicy: "disabled"`（或保持空 allowlist）。
- 配置向导接受 `Guild/Channel` 名称（公开 + 私有），在可能时解析为 ID。
- 启动时 Moltbot 会将 allowlist 中的频道/用户名称解析为 ID（机器人可搜索成员时），并记录映射；无法解析的条目会保留原样。

原生命令说明：
- 已注册命令与 Moltbot 聊天命令一致。
- 原生命令遵循与私聊/服务器消息相同的 allowlist（`channels.discord.dm.allowFrom`、`channels.discord.guilds`、按频道规则）。
- Slash 命令可能仍会对未授权用户显示；Moltbot 在执行时会检查 allowlist，并回复 “not authorized”。

## 工具动作
agent 可调用 `discord` 执行动作：
- `react` / `reactions`（添加或列出反应）
- `sticker`、`poll`、`permissions`
- `readMessages`、`sendMessage`、`editMessage`、`deleteMessage`
- 读取/搜索/置顶工具 payload 包含标准化的 `timestampMs`（UTC epoch 毫秒）与 `timestampUtc`，以及原始 Discord `timestamp`。
- `threadCreate`、`threadList`、`threadReply`
- `pinMessage`、`unpinMessage`、`listPins`
- `searchMessages`、`memberInfo`、`roleInfo`、`roleAdd`、`roleRemove`、`emojiList`
- `channelInfo`、`channelList`、`voiceStatus`、`eventList`、`eventCreate`
- `timeout`、`kick`、`ban`

Discord 消息 id 会出现在注入上下文中（`[discord message id: …]` 与历史行），以便 agent 定位。
emoji 可以是 unicode（如 `✅`）或自定义表情语法（如 `<:party_blob:1234567890>`）。
