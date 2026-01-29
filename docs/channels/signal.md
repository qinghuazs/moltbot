---
summary: "通过 signal-cli（JSON-RPC + SSE）支持 Signal，包含设置与号码模型"
read_when:
  - 设置 Signal 支持
  - 排查 Signal 收发
---
# Signal（signal-cli）

状态：外部 CLI 集成。Gateway 通过 HTTP JSON-RPC + SSE 与 `signal-cli` 通信。

## 快速上手（新手）
1) 给机器人使用**独立的 Signal 号码**（推荐）。
2) 安装 `signal-cli`（需要 Java）。
3) 关联机器人设备并启动守护进程：
   - `signal-cli link -n "Moltbot"`
4) 配置 Moltbot 并启动 gateway。

最小配置：
```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"]
    }
  }
}
```

## 这是什么
- 通过 `signal-cli` 的 Signal 渠道（非内嵌 libsignal）。
- 确定性路由：回复总是回到 Signal。
- 私聊共享 agent 主会话；群聊隔离（`agent:<agentId>:signal:group:<groupId>`）。

## 配置写入
默认允许 Signal 写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用方式：
```json5
{
  channels: { signal: { configWrites: false } }
}
```

## 号码模型（重要）
- Gateway 连接到**一个 Signal 设备**（即 `signal-cli` 账号）。
- 若你用**个人 Signal 账号**运行机器人，会忽略你自己的消息（防循环）。
- 若要实现“我发消息给机器人，它回复我”，请使用**独立的机器人号码**。

## 设置（快速路径）
1) 安装 `signal-cli`（需要 Java）。
2) 关联机器人账号：
   - `signal-cli link -n "Moltbot"` 然后在 Signal 中扫描二维码。
3) 配置 Signal 并启动 gateway。

示例：
```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"]
    }
  }
}
```

多账号支持：使用 `channels.signal.accounts` 为每个账号配置，并可设置 `name`。共享模式见 [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts)。

## 外部守护进程模式（httpUrl）
若你想自行管理 `signal-cli`（慢 JVM 冷启动、容器初始化或共享 CPU），可单独运行守护进程并指向它：

```json5
{
  channels: {
    signal: {
      httpUrl: "http://127.0.0.1:8080",
      autoStart: false
    }
  }
}
```

这会跳过 Moltbot 的自动启动与等待。若自动启动很慢，可设置 `channels.signal.startupTimeoutMs`。

## 访问控制（私聊 + 群聊）
私聊：
- 默认：`channels.signal.dmPolicy = "pairing"`。
- 陌生发送者会收到配对码；在批准前消息被忽略（码 1 小时过期）。
- 批准方式：
  - `moltbot pairing list signal`
  - `moltbot pairing approve signal <CODE>`
- 配对是 Signal 私聊的默认令牌交换。详情：见 [配对](/start/pairing)
- 仅 UUID 的发送者（来自 `sourceUuid`）会以 `uuid:<id>` 形式存入 `channels.signal.allowFrom`。

群聊：
- `channels.signal.groupPolicy = open | allowlist | disabled`。
- 当 `allowlist` 启用时，`channels.signal.groupAllowFrom` 控制谁能在群里触发。

## 工作方式（行为）
- `signal-cli` 以守护进程运行；gateway 通过 SSE 读取事件。
- 入站消息会规范化为共享渠道信封。
- 回复总是回到同一号码或群。

## 媒体与限制
- 出站文本按 `channels.signal.textChunkLimit` 分块（默认 4000）。
- 可选换行分块：设置 `channels.signal.chunkMode="newline"`，先按空行（段落边界）分块，再按长度分块。
- 支持附件（从 `signal-cli` 获取 base64）。
- 默认媒体上限：`channels.signal.mediaMaxMb`（默认 8）。
- 使用 `channels.signal.ignoreAttachments` 跳过媒体下载。
- 群历史上下文使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），回退到 `messages.groupChat.historyLimit`。设 `0` 禁用（默认 50）。

## 输入指示与已读回执
- **输入指示**：Moltbot 通过 `signal-cli sendTyping` 发送输入状态，并在回复生成期间刷新。
- **已读回执**：当 `channels.signal.sendReadReceipts` 为 true 时，Moltbot 会为允许的私聊转发已读回执。
- signal-cli 不暴露群聊已读回执。

## 反应（message 工具）
- 使用 `message action=react` 且 `channel=signal`。
- 目标：发送者 E.164 或 UUID（用配对输出中的 `uuid:<id>`；裸 UUID 也可）。
- `messageId` 是你要反应的 Signal 消息时间戳。
- 群反应需要 `targetAuthor` 或 `targetAuthorUuid`。

示例：
```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

配置：
- `channels.signal.actions.reactions`：启用/禁用反应动作（默认 true）。
- `channels.signal.reactionLevel`：`off | ack | minimal | extensive`。
  - `off`/`ack` 禁用 agent 反应（message 工具 `react` 会报错）。
  - `minimal`/`extensive` 启用 agent 反应并设置引导级别。
- 按账号覆盖：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## 投递目标（CLI/cron）
- 私聊：`signal:+15551234567`（或纯 E.164）。
- UUID 私聊：`uuid:<id>`（或裸 UUID）。
- 群聊：`signal:group:<groupId>`。
- 用户名：`username:<name>`（如果你的 Signal 账号支持）。

## 配置参考（Signal）
完整配置：见 [配置](/gateway/configuration)

Provider 选项：
- `channels.signal.enabled`：启用/禁用渠道启动。
- `channels.signal.account`：机器人账号的 E.164。
- `channels.signal.cliPath`：`signal-cli` 路径。
- `channels.signal.httpUrl`：完整守护进程 URL（覆盖 host/port）。
- `channels.signal.httpHost`, `channels.signal.httpPort`：守护进程绑定（默认 127.0.0.1:8080）。
- `channels.signal.autoStart`：自动启动守护进程（默认在未设置 `httpUrl` 时启用）。
- `channels.signal.startupTimeoutMs`：启动等待超时（毫秒，最大 120000）。
- `channels.signal.receiveMode`：`on-start | manual`。
- `channels.signal.ignoreAttachments`：跳过附件下载。
- `channels.signal.ignoreStories`：忽略守护进程中的 stories。
- `channels.signal.sendReadReceipts`：转发已读回执。
- `channels.signal.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.signal.allowFrom`：私聊 allowlist（E.164 或 `uuid:<id>`）。`open` 需包含 `"*"`。Signal 无用户名；请用手机号/UUID。
- `channels.signal.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.signal.groupAllowFrom`：群发送者 allowlist。
- `channels.signal.historyLimit`：群上下文消息上限（0 禁用）。
- `channels.signal.dmHistoryLimit`：私聊历史限制（用户回合）。按用户覆盖：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`：出站分块大小（字符）。
- `channels.signal.chunkMode`：`length`（默认）或 `newline`（按空行分段再按长度分块）。
- `channels.signal.mediaMaxMb`：入站/出站媒体上限（MB）。

相关全局选项：
- `agents.list[].groupChat.mentionPatterns`（Signal 不支持原生提及）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `messages.responsePrefix`。
