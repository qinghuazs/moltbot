---
summary: "通过 imsg（stdio 上的 JSON-RPC）支持 iMessage，包含设置与 chat_id 路由"
read_when:
  - 设置 iMessage 支持
  - 排查 iMessage 收发
---
# iMessage（imsg）

状态：外部 CLI 集成。Gateway 启动 `imsg rpc`（stdio 上的 JSON-RPC）。

## 快速上手（新手）
1) 确认此 Mac 的 Messages 已登录。
2) 安装 `imsg`：
   - `brew install steipete/tap/imsg`
3) 用 `channels.imessage.cliPath` 与 `channels.imessage.dbPath` 配置 Moltbot。
4) 启动 gateway 并批准所有 macOS 提示（Automation + Full Disk Access）。

最小配置：
```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/<you>/Library/Messages/chat.db"
    }
  }
}
```

## 这是什么
- 基于 macOS `imsg` 的 iMessage 渠道。
- 确定性路由：回复总是回到 iMessage。
- 私聊共享 agent 主会话；群聊隔离（`agent:<agentId>:imessage:group:<chat_id>`）。
- 若多参与者线程带 `is_group=false`，仍可通过 `channels.imessage.groups` 按 `chat_id` 隔离（见下文“类群线程”）。

## 配置写入
默认允许 iMessage 写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用方式：
```json5
{
  channels: { imessage: { configWrites: false } }
}
```

## 要求
- macOS 且 Messages 已登录。
- Moltbot 与 `imsg` 需要 Full Disk Access（访问 Messages DB）。
- 发送时需 Automation 权限。
- `channels.imessage.cliPath` 可以指向任意 stdin/stdout 代理命令（例如 SSH 到另一台 Mac 运行 `imsg rpc` 的脚本）。

## 设置（快速路径）
1) 确保此 Mac 的 Messages 已登录。
2) 配置 iMessage 并启动 gateway。

### 独立 bot 的 macOS 用户（隔离身份）
若希望机器人使用**独立的 iMessage 身份**（避免污染个人 Messages），使用专用 Apple ID + 专用 macOS 用户。

1) 创建专用 Apple ID（例：`my-cool-bot@icloud.com`）。
   - Apple 可能需要手机号用于验证/2FA。
2) 创建 macOS 用户（例：`clawdshome`）并登录。
3) 在该用户中打开 Messages，用机器人 Apple ID 登录 iMessage。
4) 启用 Remote Login（系统设置 → 通用 → 共享 → 远程登录）。
5) 安装 `imsg`：
   - `brew install steipete/tap/imsg`
6) 配置 SSH，确保 `ssh <bot-macos-user>@localhost true` 可免密。
7) 将 `channels.imessage.accounts.bot.cliPath` 指向一个 SSH 包装器，以 bot 用户身份运行 `imsg`。

首次运行提示：发送/接收可能需要在**bot macOS 用户**中批准 GUI 权限（Automation + Full Disk Access）。若 `imsg rpc` 卡住或退出，请登录该用户（可用屏幕共享），先运行一次 `imsg chats --limit 1` / `imsg send ...`，批准提示后重试。

示例包装器（`chmod +x`）。将 `<bot-macos-user>` 替换为实际用户名：
```bash
#!/usr/bin/env bash
set -euo pipefail

# 先跑一次交互式 SSH 以接受 host key：
#   ssh <bot-macos-user>@localhost true
exec /usr/bin/ssh -o BatchMode=yes -o ConnectTimeout=5 -T <bot-macos-user>@localhost \
  "/usr/local/bin/imsg" "$@"
```

示例配置：
```json5
{
  channels: {
    imessage: {
      enabled: true,
      accounts: {
        bot: {
          name: "Bot",
          enabled: true,
          cliPath: "/path/to/imsg-bot",
          dbPath: "/Users/<bot-macos-user>/Library/Messages/chat.db"
        }
      }
    }
  }
}
```

单账号场景下，使用扁平选项（`channels.imessage.cliPath`、`channels.imessage.dbPath`）而不是 `accounts` 映射。

### 远程/SSH 方案（可选）
若 iMessage 运行在另一台 Mac，可将 `channels.imessage.cliPath` 设为通过 SSH 在远端运行 `imsg` 的包装器。Moltbot 只需要 stdio。

示例包装器：
```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

**远程附件：** 当 `cliPath` 指向远端主机（SSH）时，Messages 数据库中的附件路径指向远端机器。可设置 `channels.imessage.remoteHost` 让 Moltbot 通过 SCP 自动拉取：

```json5
{
  channels: {
    imessage: {
      cliPath: "~/.clawdbot/scripts/imsg-ssh",                     // 远程 Mac 的 SSH 包装器
      remoteHost: "user@gateway-host",           // 用于 SCP 传输
      includeAttachments: true
    }
  }
}
```

若未设置 `remoteHost`，Moltbot 会尝试解析你的 SSH 包装器脚本自动检测。为稳定起见建议显式配置。

#### 通过 Tailscale 连接远程 Mac（示例）
若 Gateway 在 Linux 主机/VM 上，但 iMessage 必须在 Mac 上运行，Tailscale 是最简桥接：Gateway 通过 tailnet 连接 Mac，用 SSH 运行 `imsg`，并通过 SCP 拉取附件。

架构：
```
┌──────────────────────────────┐          SSH (imsg rpc)          ┌──────────────────────────┐
│ Gateway host (Linux/VM)      │──────────────────────────────────▶│ Mac with Messages + imsg │
│ - moltbot gateway           │          SCP (attachments)        │ - Messages signed in     │
│ - channels.imessage.cliPath  │◀──────────────────────────────────│ - Remote Login enabled   │
└──────────────────────────────┘                                   └──────────────────────────┘
              ▲
              │ Tailscale tailnet (hostname or 100.x.y.z)
              ▼
        user@gateway-host
```

具体配置示例（Tailscale 主机名）：
```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.clawdbot/scripts/imsg-ssh",
      remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
      includeAttachments: true,
      dbPath: "/Users/bot/Library/Messages/chat.db"
    }
  }
}
```

示例包装器（`~/.clawdbot/scripts/imsg-ssh`）：
```bash
#!/usr/bin/env bash
exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
```

说明：
- 确保 Mac 已登录 Messages 且启用 Remote Login。
- 使用 SSH key 免提示登录（`ssh bot@mac-mini.tailnet-1234.ts.net` 无交互）。
- `remoteHost` 应与 SSH 目标一致，便于 SCP 拉取附件。

多账号支持：使用 `channels.imessage.accounts` 为每个账号配置，并可设置 `name`。共享模式见 [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts)。不要提交 `~/.clawdbot/moltbot.json`（常含 token）。

## 访问控制（私聊 + 群聊）
私聊：
- 默认：`channels.imessage.dmPolicy = "pairing"`。
- 陌生发送者收到配对码；在批准前消息被忽略（码 1 小时过期）。
- 批准方式：
  - `moltbot pairing list imessage`
  - `moltbot pairing approve imessage <CODE>`
- 配对是 iMessage 私聊的默认令牌交换。详情：见 [配对](/start/pairing)

群聊：
- `channels.imessage.groupPolicy = open | allowlist | disabled`。
- 当 `allowlist` 启用时，`channels.imessage.groupAllowFrom` 控制谁能在群里触发。
- 提及门控使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`），因为 iMessage 没有原生提及元数据。
- 多代理覆盖：在 `agents.list[].groupChat.mentionPatterns` 中按 agent 设置。

## 工作方式（行为）
- `imsg` 流式输出消息事件；gateway 将其规范化为共享渠道信封。
- 回复总是回到同一 chat id 或 handle。

## 类群线程（`is_group=false`）
某些 iMessage 线程可能有多个参与者，但仍以 `is_group=false` 到达，具体取决于 Messages 的存储方式。

若你在 `channels.imessage.groups` 中显式配置某个 `chat_id`，Moltbot 会把该线程当作“群”，用于：
- 会话隔离（独立 `agent:<agentId>:imessage:group:<chat_id>` 会话键）
- 群 allowlist / 提及门控行为

示例：
```json5
{
  channels: {
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "42": { "requireMention": false }
      }
    }
  }
}
```
此功能适用于希望为特定线程使用独立人格/模型的场景（见 [多代理路由](/concepts/multi-agent)）。如需文件系统隔离，见 [沙箱](/gateway/sandboxing)。

## 媒体与限制
- 可通过 `channels.imessage.includeAttachments` 启用附件摄取。
- 媒体上限：`channels.imessage.mediaMaxMb`。

## 限制
- 出站文本按 `channels.imessage.textChunkLimit` 分块（默认 4000）。
- 可选换行分块：设置 `channels.imessage.chunkMode="newline"`，先按空行（段落边界）分块，再按长度分块。
- 媒体上传上限：`channels.imessage.mediaMaxMb`（默认 16）。

## 地址与投递目标
优先使用 `chat_id` 以获得稳定路由：
- `chat_id:123`（推荐）
- `chat_guid:...`
- `chat_identifier:...`
- 直接 handle：`imessage:+1555` / `sms:+1555` / `user@example.com`

列出聊天：
```
imsg chats --limit 20
```

## 配置参考（iMessage）
完整配置：见 [配置](/gateway/configuration)

Provider 选项：
- `channels.imessage.enabled`：启用/禁用渠道启动。
- `channels.imessage.cliPath`：`imsg` 路径。
- `channels.imessage.dbPath`：Messages 数据库路径。
- `channels.imessage.remoteHost`：当 `cliPath` 指向远端 Mac 时用于 SCP 传附件的 SSH 主机（如 `user@gateway-host`）。未设置时可从 SSH 包装器自动检测。
- `channels.imessage.service`：`imessage | sms | auto`。
- `channels.imessage.region`：SMS 区域。
- `channels.imessage.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.imessage.allowFrom`：私聊 allowlist（handles、邮箱、E.164、或 `chat_id:*`）。`open` 需包含 `"*"`。iMessage 无用户名；使用 handle 或 chat 目标。
- `channels.imessage.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.imessage.groupAllowFrom`：群发送者 allowlist。
- `channels.imessage.historyLimit` / `channels.imessage.accounts.*.historyLimit`：群上下文消息上限（0 禁用）。
- `channels.imessage.dmHistoryLimit`：私聊历史限制（用户回合）。按用户覆盖：`channels.imessage.dms["<handle>"].historyLimit`。
- `channels.imessage.groups`：按群默认值 + allowlist（用 `"*"` 作为全局默认）。
- `channels.imessage.includeAttachments`：将附件摄入上下文。
- `channels.imessage.mediaMaxMb`：入站/出站媒体上限（MB）。
- `channels.imessage.textChunkLimit`：出站分块大小（字符）。
- `channels.imessage.chunkMode`：`length`（默认）或 `newline`（按空行分段再按长度分块）。

相关全局选项：
- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。
