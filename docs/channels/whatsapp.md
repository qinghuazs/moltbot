---
summary: "WhatsApp（Web 渠道）集成：登录、收件箱、回复、媒体与运维"
read_when:
  - 在排查 WhatsApp/Web 渠道行为或收件箱路由时
---
# WhatsApp（Web 渠道）

状态：仅支持通过 Baileys 的 WhatsApp Web。Gateway 持有会话。

## 快速上手（新手）
1) 尽量使用**独立手机号**（推荐）。
2) 在 `~/.clawdbot/moltbot.json` 中配置 WhatsApp。
3) 运行 `moltbot channels login` 扫描二维码（已连接设备）。
4) 启动 gateway。

最小配置：
```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"]
    }
  }
}
```

## 目标
- 在同一个 Gateway 进程中支持多个 WhatsApp 账号（多账号）。
- 确定性路由：回复回到 WhatsApp，不经过模型路由。
- 模型看到足够上下文以理解引用回复。

## 配置写入
默认允许 WhatsApp 写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用方式：
```json5
{
  channels: { whatsapp: { configWrites: false } }
}
```

## 架构（谁负责什么）
- **Gateway** 负责 Baileys socket 与收件箱循环。
- **CLI / macOS app** 只与 gateway 通信；不直接使用 Baileys。
- **主动监听** 是外发消息的前提，否则发送会快速失败。

## 获取手机号（两种模式）

WhatsApp 需要真实手机号码验证。VoIP 和虚拟号通常会被封。Moltbot 在 WhatsApp 上有两种支持方式：

### 专用号码（推荐）
为 Moltbot 使用**独立手机号**。体验最好，路由干净，没有自聊的怪异情况。理想配置：**备用/旧 Android 手机 + eSIM**。保持联网供电，通过二维码关联。

**WhatsApp Business：** 你可以在同一设备上用不同号码运行 WhatsApp Business，适合与个人号分离 — 安装 WhatsApp Business 并在其中注册 Moltbot 号码。

**示例配置（专用号码，单人 allowlist）：**
```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"]
    }
  }
}
```

**配对模式（可选）：**
若想用配对而非 allowlist，将 `channels.whatsapp.dmPolicy` 设为 `pairing`。陌生联系人会收到配对码；通过以下命令批准：
`moltbot pairing approve whatsapp <code>`

### 个人号码（备用）
快捷退路：在**自己的号码**上运行 Moltbot。测试时给自己发消息（WhatsApp “发给自己”）以避免打扰联系人。安装和实验过程中要在主手机上读取验证码。**必须开启自聊模式。**
当向导询问你的个人 WhatsApp 号码时，输入**你会从哪个手机号发送消息**（拥有者/发送者），而不是助手的号码。

**示例配置（个人号，自聊）：**
```json
{
  "whatsapp": {
    "selfChatMode": true,
    "dmPolicy": "allowlist",
    "allowFrom": ["+15551234567"]
  }
}
```

当 `messages.responsePrefix` 未设置时，自聊回复会默认加前缀 `[{identity.name}]`（若已设置，否则为 `[moltbot]`）。
可显式设置以自定义或禁用前缀（用 `""` 移除）。

### 号码来源建议
- **本地运营商 eSIM**（最可靠）
  - 奥地利：[hot.at](https://www.hot.at)
  - 英国：[giffgaff](https://www.giffgaff.com) — 免费 SIM，无合约
- **预付费 SIM** — 便宜，只需接收一条短信完成验证

**避免：** TextNow、Google Voice、多数“免费短信”服务 — WhatsApp 会强力封禁。

**提示：** 号码只需接收一次验证短信。之后 WhatsApp Web 会话会通过 `creds.json` 持久化。

## 为什么不使用 Twilio？
- Moltbot 早期版本支持 Twilio 的 WhatsApp Business 集成。
- WhatsApp Business 号码不适合个人助理。
- Meta 强制 24 小时回复窗口；若 24 小时内未回复，企业号不能主动发新消息。
- 高频或“聊天型”用法会触发封禁，因为企业号不应发送大量个人助理消息。
- 结果：投递不稳定且频繁被封，所以已移除支持。

## 登录与凭据
- 登录命令：`moltbot channels login`（已连接设备二维码）。
- 多账号登录：`moltbot channels login --account <id>`（`<id>` = `accountId`）。
- 默认账号（省略 `--account` 时）：存在 `default` 则用它，否则取配置里的第一个账号 id（排序后）。
- 凭据路径：`~/.clawdbot/credentials/whatsapp/<accountId>/creds.json`。
- 备份：`creds.json.bak`（损坏时恢复）。
- 兼容旧版：早期安装将 Baileys 文件直接存于 `~/.clawdbot/credentials/`。
- 登出：`moltbot channels logout`（或 `--account <id>`）会删除 WhatsApp 认证状态（但保留共享的 `oauth.json`）。
- 已登出 socket => 报错提示重新关联。

## 入站流程（私聊 + 群聊）
- WhatsApp 事件来自 `messages.upsert`（Baileys）。
- 为避免测试/重启时累积事件处理器，关机时会解绑 inbox 监听器。
- 忽略状态/广播聊天。
- 私聊使用 E.164；群聊使用 group JID。
- **DM 策略**：`channels.whatsapp.dmPolicy` 控制私聊访问（默认 `pairing`）。
  - 配对：陌生联系人收到配对码（通过 `moltbot pairing approve whatsapp <code>` 批准；码 1 小时过期）。
  - Open：要求 `channels.whatsapp.allowFrom` 包含 `"*"`。
  - 你已关联的 WhatsApp 号码会被隐式信任，自发消息跳过 `channels.whatsapp.dmPolicy` 与 `channels.whatsapp.allowFrom` 检查。

### 个人号码模式（备用）
若用**个人 WhatsApp 号码**运行 Moltbot，启用 `channels.whatsapp.selfChatMode`（见示例）。

行为：
- 外发私聊不会触发配对回复（防止骚扰联系人）。
- 入站陌生联系人仍遵循 `channels.whatsapp.dmPolicy`。
- 自聊模式（allowFrom 含你的号码）可避免自动已读，并忽略提及 JID。
- 非自聊私聊会发送已读回执。

## 已读回执
默认情况下，gateway 在接受 WhatsApp 入站消息后会标记为已读（蓝勾）。

全局关闭：
```json5
{
  channels: { whatsapp: { sendReadReceipts: false } }
}
```

按账号关闭：
```json5
{
  channels: {
    whatsapp: {
      accounts: {
        personal: { sendReadReceipts: false }
      }
    }
  }
}
```

说明：
- 自聊模式始终跳过已读回执。

## WhatsApp 常见问题：发送消息与配对

**关联 WhatsApp 后 Moltbot 会给随机联系人发消息吗？**  
不会。默认 DM 策略是**配对**，陌生联系人只会收到配对码，消息**不会被处理**。Moltbot 只会回复它收到的聊天，或你显式触发的发送（agent/CLI）。

**WhatsApp 的配对如何工作？**  
配对是陌生联系人私聊的入口控制：
- 新联系人第一次私聊会收到短码（消息不处理）。
- 用 `moltbot pairing approve whatsapp <code>` 通过（用 `moltbot pairing list whatsapp` 查看）。
- 配对码 1 小时过期；待处理请求每个渠道上限 3 个。

**多人能在一个 WhatsApp 号码上使用不同 Moltbot 吗？**  
可以，通过 `bindings` 把不同发送者路由到不同 agent（peer `kind: "dm"`，发送者 E.164 如 `+15551234567`）。回复仍来自**同一个 WhatsApp 账号**，且私聊会折叠到每个 agent 的主会话，所以建议**一人一个 agent**。DM 访问控制（`dmPolicy`/`allowFrom`）对同一 WhatsApp 账号是全局的。参见 [多代理路由](/concepts/multi-agent)。

**为什么向导要问我的手机号？**  
向导用它设置你的**allowlist/owner**，以便允许你自己的私聊。不会用于自动发送。如果你用个人 WhatsApp 号码运行，请填写同一个号码并启用 `channels.whatsapp.selfChatMode`。

## 消息规范化（模型看到的内容）
- `Body` 是当前消息主体，带信封信息。
- 引用回复上下文**始终追加**：
  ```
  [Replying to +1555 id:ABC123]
  <quoted text or <media:...>>
  [/Replying]
  ```
- 还会设置回复元数据：
  - `ReplyToId` = stanzaId
  - `ReplyToBody` = 引用文本或媒体占位符
  - `ReplyToSender` = 已知则为 E.164
- 仅媒体的入站消息使用占位符：
  - `<media:image|video|audio|document|sticker>`

## 群聊
- 群聊映射到 `agent:<agentId>:whatsapp:group:<jid>` 会话。
- 群策略：`channels.whatsapp.groupPolicy = open|disabled|allowlist`（默认 `allowlist`）。
- 激活模式：
  - `mention`（默认）：需要 @ 提及或正则匹配。
  - `always`：总是触发。
- `/activation mention|always` 仅 owner 可用，且必须独立发送。
- Owner = `channels.whatsapp.allowFrom`（若未设置则为自身 E.164）。
- **历史注入**（仅待处理消息）：
  - 最近*未处理*消息（默认 50）插入到：
    `[Chat messages since your last reply - for context]`（会话中已有消息不会重复注入）
  - 当前消息插入到：
    `[Current message - respond to this]`
  - 发送者后缀：`[from: Name (+E164)]`
- 群元数据缓存 5 分钟（主题 + 参与者）。

## 回复送达（线程）
- WhatsApp Web 发送标准消息（当前 gateway 不支持引用回复线程）。
- 回复标签在该渠道被忽略。

## 确认反应（收件自动表情）

WhatsApp 可以在收到消息后立即发送 emoji 反应，先于机器人回复与输入提示，以告诉用户已收到。

**配置：**
```json
{
  "whatsapp": {
    "ackReaction": {
      "emoji": "👀",
      "direct": true,
      "group": "mentions"
    }
  }
}
```

**选项：**
- `emoji`（string）：用于确认的表情（如 "👀"、"✅"、"📨"）。为空或省略则禁用。
- `direct`（boolean，默认 `true`）：在私聊中发送反应。
- `group`（string，默认 `"mentions"`）：群聊行为：
  - `"always"`：对所有群消息反应（即使未 @）
  - `"mentions"`：仅在机器人被 @ 时反应
  - `"never"`：群聊中从不反应

**按账号覆盖：**
```json
{
  "whatsapp": {
    "accounts": {
      "work": {
        "ackReaction": {
          "emoji": "✅",
          "direct": false,
          "group": "always"
        }
      }
    }
  }
}
```

**行为说明：**
- 反应在收件**立即**发送，早于输入指示或机器人回复。
- 当群聊 `requireMention: false`（激活总是）时，`group: "mentions"` 会对所有消息反应（不仅 @）。
- Fire-and-forget：反应失败会记录日志但不会阻止回复。
- 群反应会自动包含参与者 JID。
- WhatsApp 会忽略 `messages.ackReaction`；应使用 `channels.whatsapp.ackReaction`。

## Agent 工具（反应）
- 工具：`whatsapp` 的 `react` 动作（`chatJid`、`messageId`、`emoji`，可选 `remove`）。
- 可选：`participant`（群发送者）、`fromMe`（对自己消息反应）、`accountId`（多账号）。
- 反应移除语义：见 [/tools/reactions](/tools/reactions)。
- 工具开关：`channels.whatsapp.actions.reactions`（默认开启）。

## 限制
- 外发文本会按 `channels.whatsapp.textChunkLimit` 分块（默认 4000）。
- 可选换行分块：设置 `channels.whatsapp.chunkMode="newline"`，会在长度分块前按空行（段落边界）切分。
- 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 50 MB）。
- 出站媒体上限：`agents.defaults.mediaMaxMb`（默认 5 MB）。

## 出站发送（文本 + 媒体）
- 使用活跃的 web 监听器；若 gateway 未运行则报错。
- 文本分块：每条 4k 上限（可通过 `channels.whatsapp.textChunkLimit` 配置，支持 `channels.whatsapp.chunkMode`）。
- 媒体：
  - 支持图片/视频/音频/文档。
  - 音频以 PTT 发送；`audio/ogg` => `audio/ogg; codecs=opus`。
  - 仅第一条媒体带 caption。
  - 媒体抓取支持 HTTP(S) 与本地路径。
  - 动图 GIF：WhatsApp 期望 MP4 且 `gifPlayback: true` 以便内联循环。
    - CLI：`moltbot message send --media <mp4> --gif-playback`
    - Gateway：`send` 参数需包含 `gifPlayback: true`

## 语音便签（PTT 音频）
WhatsApp 将音频作为**语音便签**（PTT 气泡）发送。
- 最佳格式：OGG/Opus。Moltbot 会把 `audio/ogg` 重写为 `audio/ogg; codecs=opus`。
- `[[audio_as_voice]]` 在 WhatsApp 上被忽略（音频已作为语音发送）。

## 媒体限制与优化
- 默认出站上限：5 MB（每个媒体）。
- 覆盖：`agents.defaults.mediaMaxMb`。
- 图片会自动优化为低于上限的 JPEG（缩放 + 质量扫描）。
- 超限媒体 => 报错；媒体回复会退回到文本警告。

## 心跳
- **Gateway 心跳** 记录连接健康（`web.heartbeatSeconds`，默认 60s）。
- **Agent 心跳** 可按 agent 配置（`agents.list[].heartbeat`）或全局配置
  `agents.defaults.heartbeat`（当没有 per-agent 时回退）。
  - 使用配置的心跳提示（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）+ `HEARTBEAT_OK` 跳过行为。
  - 投递默认发到上次使用的渠道（或配置目标）。

## 重连行为
- 退避策略：`web.reconnect`：
  - `initialMs`、`maxMs`、`factor`、`jitter`、`maxAttempts`。
- 达到 maxAttempts 后，web 监控停止（降级）。
- 登出 => 停止并要求重新关联。

## 配置速查
- `channels.whatsapp.dmPolicy`（私聊策略：pairing/allowlist/open/disabled）。
- `channels.whatsapp.selfChatMode`（同号方案；机器人使用你的个人 WhatsApp 号码）。
- `channels.whatsapp.allowFrom`（私聊 allowlist）。WhatsApp 使用 E.164 手机号（无用户名）。
- `channels.whatsapp.mediaMaxMb`（入站媒体保存上限）。
- `channels.whatsapp.ackReaction`（收件自动反应：`{emoji, direct, group}`）。
- `channels.whatsapp.accounts.<accountId>.*`（按账号设置 + 可选 `authDir`）。
- `channels.whatsapp.accounts.<accountId>.mediaMaxMb`（按账号入站上限）。
- `channels.whatsapp.accounts.<accountId>.ackReaction`（按账号确认反应覆盖）。
- `channels.whatsapp.groupAllowFrom`（群发送者 allowlist）。
- `channels.whatsapp.groupPolicy`（群策略）。
- `channels.whatsapp.historyLimit` / `channels.whatsapp.accounts.<accountId>.historyLimit`（群历史上下文；`0` 禁用）。
- `channels.whatsapp.dmHistoryLimit`（私聊历史限制，以用户回合计）。按用户覆盖：`channels.whatsapp.dms["<phone>"].historyLimit`。
- `channels.whatsapp.groups`（群 allowlist + 提及门控默认值；用 `"*"` 允许全部）。
- `channels.whatsapp.actions.reactions`（WhatsApp 工具反应开关）。
- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）
- `messages.groupChat.historyLimit`
- `channels.whatsapp.messagePrefix`（入站前缀；按账号：`channels.whatsapp.accounts.<accountId>.messagePrefix`；已弃用：`messages.messagePrefix`）
- `messages.responsePrefix`（出站前缀）
- `agents.defaults.mediaMaxMb`
- `agents.defaults.heartbeat.every`
- `agents.defaults.heartbeat.model`（可选覆盖）
- `agents.defaults.heartbeat.target`
- `agents.defaults.heartbeat.to`
- `agents.defaults.heartbeat.session`
- `agents.list[].heartbeat.*`（按 agent 覆盖）
- `session.*`（scope、idle、store、mainKey）
- `web.enabled`（为 false 时禁用渠道启动）
- `web.heartbeatSeconds`
- `web.reconnect.*`

## 日志与排查
- 子系统：`whatsapp/inbound`、`whatsapp/outbound`、`web-heartbeat`、`web-reconnect`。
- 日志文件：`/tmp/moltbot/moltbot-YYYY-MM-DD.log`（可配置）。
- 排查指南：见 [Gateway 排查](/gateway/troubleshooting)。

## 故障排查（速览）

**未关联 / 需要二维码登录**
- 现象：`channels status` 显示 `linked: false` 或提示 “Not linked”。
- 处理：在 gateway 主机上运行 `moltbot channels login` 并扫码（WhatsApp → 设置 → 已连接设备）。

**已关联但断开 / 重连循环**
- 现象：`channels status` 显示 `running, disconnected` 或提示 “Linked but disconnected”。
- 处理：运行 `moltbot doctor`（或重启 gateway）。若仍存在，重新 `channels login`，并查看 `moltbot logs --follow`。

**Bun 运行时**
- 不推荐使用 Bun。WhatsApp（Baileys）和 Telegram 在 Bun 上不可靠。
  使用 **Node** 运行 gateway。（参见入门运行时说明。）
