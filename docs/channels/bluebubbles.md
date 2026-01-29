---
summary: "通过 BlueBubbles macOS 服务器的 iMessage（REST 收发、输入、反应、配对与高级动作）。"
read_when:
  - 设置 BlueBubbles 渠道
  - 排查 webhook 配对
  - 在 macOS 上配置 iMessage
---
# BlueBubbles（macOS REST）

状态：内置插件，通过 HTTP 与 BlueBubbles macOS 服务器通信。**推荐的 iMessage 集成方式**，相比旧版 imsg 渠道 API 更丰富、设置更简单。

## 概览
- 在 macOS 上通过 BlueBubbles 辅助应用运行（[bluebubbles.app](https://bluebubbles.app)）。
- 推荐/测试：macOS Sequoia (15)。macOS Tahoe (26) 可用；Tahoe 上编辑当前不可用，群图标更新可能显示成功但不同步。
- Moltbot 通过其 REST API 通信（`GET /api/v1/ping`、`POST /message/text`、`POST /chat/:id/*`）。
- 入站消息通过 webhook 到达；出站回复、输入指示、已读回执与 tapback 为 REST 调用。
- 附件与贴纸作为入站媒体摄取（尽可能呈现给 agent）。
- 配对/allowlist 与其他渠道一致（`/start/pairing` 等），使用 `channels.bluebubbles.allowFrom` + 配对码。
- 反应以系统事件呈现（类似 Slack/Telegram），便于 agent 回复前“提及”。
- 高级功能：编辑、撤回、回复线程、消息效果、群组管理。

## 快速开始
1. 在 Mac 上安装 BlueBubbles 服务器（参考 [bluebubbles.app/install](https://bluebubbles.app/install)）。
2. 在 BlueBubbles 配置中启用 Web API 并设置密码。
3. 运行 `moltbot onboard` 并选择 BlueBubbles，或手动配置：
   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         serverUrl: "http://192.168.1.100:1234",
         password: "example-password",
         webhookPath: "/bluebubbles-webhook"
       }
     }
   }
   ```
4. 将 BlueBubbles webhook 指向你的 gateway（示例：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
5. 启动 gateway；它会注册 webhook 处理器并开始配对。

## 引导
BlueBubbles 可在交互式向导中配置：
```
moltbot onboard
```

向导会询问：
- **Server URL**（必填）：BlueBubbles 服务器地址（如 `http://192.168.1.100:1234`）
- **Password**（必填）：BlueBubbles Server 设置中的 API 密码
- **Webhook path**（可选）：默认 `/bluebubbles-webhook`
- **DM policy**：pairing / allowlist / open / disabled
- **Allow list**：手机号、邮箱或聊天目标

也可以用 CLI 添加：
```
moltbot channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 访问控制（私聊 + 群聊）
私聊：
- 默认：`channels.bluebubbles.dmPolicy = "pairing"`。
- 陌生发送者收到配对码；批准前消息被忽略（码 1 小时过期）。
- 批准方式：
  - `moltbot pairing list bluebubbles`
  - `moltbot pairing approve bluebubbles <CODE>`
- 配对是默认令牌交换。详情：见 [配对](/start/pairing)

群聊：
- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom` 控制 allowlist 下的群内触发者。

### 提及门控（群聊）
BlueBubbles 支持群聊提及门控，行为与 iMessage/WhatsApp 一致：
- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）检测提及。
- 当群组开启 `requireMention` 时，仅被提及时才回复。
- 来自已授权发送者的控制命令会绕过提及门控。

按群配置：
```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true },  // 所有群默认提及门控
        "iMessage;-;chat123": { requireMention: false }  // 特定群覆盖
      }
    }
  }
}
```

### 命令门控
- 控制命令（如 `/config`、`/model`）需要授权。
- 使用 `allowFrom` 与 `groupAllowFrom` 判断命令授权。
- 已授权发送者在群聊中无需提及即可执行控制命令。

## 输入指示与已读回执
- **输入指示**：会在回复生成前后自动发送。
- **已读回执**：由 `channels.bluebubbles.sendReadReceipts` 控制（默认 `true`）。
- **输入指示**：Moltbot 发送“开始输入”事件；BlueBubbles 在发送或超时后自动清除（手动停止 DELETE 不可靠）。

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false  // 关闭已读回执
    }
  }
}
```

## 高级动作
BlueBubbles 在配置启用后支持高级消息动作：

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true,       // tapback（默认 true）
        edit: true,            // 编辑已发送消息（macOS 13+，macOS 26 Tahoe 上损坏）
        unsend: true,          // 撤回消息（macOS 13+）
        reply: true,           // 通过消息 GUID 回复
        sendWithEffect: true,  // 消息效果（slam、loud 等）
        renameGroup: true,     // 重命名群聊
        setGroupIcon: true,    // 设置群聊图标/头像（macOS 26 Tahoe 上不稳定）
        addParticipant: true,  // 添加群成员
        removeParticipant: true, // 移除群成员
        leaveGroup: true,      // 退出群聊
        sendAttachment: true   // 发送附件/媒体
      }
    }
  }
}
```

可用动作：
- **react**：添加/移除 tapback 反应（`messageId`、`emoji`、`remove`）
- **edit**：编辑已发送消息（`messageId`、`text`）
- **unsend**：撤回消息（`messageId`）
- **reply**：回复特定消息（`messageId`、`text`、`to`）
- **sendWithEffect**：发送带 iMessage 效果的消息（`text`、`to`、`effectId`）
- **renameGroup**：重命名群聊（`chatGuid`、`displayName`）
- **setGroupIcon**：设置群聊图标/头像（`chatGuid`、`media`）— 在 macOS 26 Tahoe 上不稳定（API 可能返回成功但图标不同步）。
- **addParticipant**：向群添加成员（`chatGuid`、`address`）
- **removeParticipant**：从群移除成员（`chatGuid`、`address`）
- **leaveGroup**：退出群聊（`chatGuid`）
- **sendAttachment**：发送媒体/文件（`to`、`buffer`、`filename`、`asVoice`）
  - 语音便签：设置 `asVoice: true` 并使用 **MP3** 或 **CAF** 音频发送 iMessage 语音消息。BlueBubbles 在发送语音时会将 MP3 转为 CAF。

### 消息 ID（短 ID vs 完整 ID）
Moltbot 可能提供**短**消息 ID（例如 `1`、`2`）以节省 token：
- `MessageSid` / `ReplyToId` 可能为短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含完整 provider ID。
- 短 ID 保存在内存中，可能在重启或缓存淘汰后失效。
- 动作可接受短或完整 `messageId`，但短 ID 在过期后会报错。

自动化与持久存储请使用完整 ID：
- 模板：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 上下文：入站 payload 中的 `MessageSidFull` / `ReplyToIdFull`

模板变量见 [配置](/gateway/configuration)。

## 块流式
控制回复是否分块发送：
```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true  // 启用块流式（默认）
    }
  }
}
```

## 媒体与限制
- 入站附件会下载并存入媒体缓存。
- 媒体上限由 `channels.bluebubbles.mediaMaxMb` 控制（默认 8 MB）。
- 出站文本按 `channels.bluebubbles.textChunkLimit` 分块（默认 4000 字符）。

## 配置参考
完整配置：见 [配置](/gateway/configuration)

Provider 选项：
- `channels.bluebubbles.enabled`：启用/禁用渠道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API base URL。
- `channels.bluebubbles.password`：API 密码。
- `channels.bluebubbles.webhookPath`：webhook 端点路径（默认 `/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.bluebubbles.allowFrom`：私聊 allowlist（handle、邮箱、E.164、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.bluebubbles.groupAllowFrom`：群发送者 allowlist。
- `channels.bluebubbles.groups`：按群配置（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：发送已读回执（默认 `true`）。
- `channels.bluebubbles.blockStreaming`：启用块流式（默认 `true`）。
- `channels.bluebubbles.textChunkLimit`：出站分块大小（字符，默认 4000）。
- `channels.bluebubbles.chunkMode`：`length`（默认）仅在超限时分块；`newline` 先按空行分段再按长度分块。
- `channels.bluebubbles.mediaMaxMb`：入站媒体上限（MB，默认 8）。
