---
summary: "Mattermost 机器人设置与 Moltbot 配置"
read_when:
  - 设置 Mattermost
  - 排查 Mattermost 路由
---

# Mattermost（插件）

状态：通过插件支持（bot token + WebSocket 事件）。支持频道、群组与私聊。
Mattermost 是可自托管的团队消息平台；产品详情与下载见
[mattermost.com](https://mattermost.com)。

## 需要插件
Mattermost 作为插件提供，不随核心安装包附带。

通过 CLI 安装（npm registry）：
```bash
moltbot plugins install @moltbot/mattermost
```

本地检出（从 git 仓库运行时）：
```bash
moltbot plugins install ./extensions/mattermost
```

若在配置/引导中选择 Mattermost 且检测到 git 检出，
Moltbot 会自动提供本地安装路径。

详情：见 [插件](/plugin)

## 快速上手
1) 安装 Mattermost 插件。
2) 创建 Mattermost 机器人账号并复制 **bot token**。
3) 复制 Mattermost **base URL**（如 `https://chat.example.com`）。
4) 配置 Moltbot 并启动 gateway。

最小配置：
```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing"
    }
  }
}
```

## 环境变量（默认账号）
若偏好 env 变量，在 gateway 主机设置：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

环境变量只对**默认**账号（`default`）生效；其他账号必须用配置。

## 聊天模式
Mattermost 会自动回复私聊。频道行为由 `chatmode` 控制：

- `oncall`（默认）：仅在频道被 @ 提及才回复。
- `onmessage`：对每条频道消息回复。
- `onchar`：当消息以触发前缀开头时回复。

配置示例：
```json5
{
  channels: {
    mattermost: {
      chatmode: "onchar",
      oncharPrefixes: [">", "!"]
    }
  }
}
```

说明：
- `onchar` 仍会响应显式 @ 提及。
- `channels.mattermost.requireMention` 会兼容旧配置，但推荐使用 `chatmode`。

## 访问控制（私聊）
- 默认：`channels.mattermost.dmPolicy = "pairing"`（陌生发送者收到配对码）。
- 批准方式：
  - `moltbot pairing list mattermost`
  - `moltbot pairing approve mattermost <CODE>`
- 开放私聊：`channels.mattermost.dmPolicy="open"` 且 `channels.mattermost.allowFrom=["*"]`。

## 频道（群组）
- 默认：`channels.mattermost.groupPolicy = "allowlist"`（提及门控）。
- 用 `channels.mattermost.groupAllowFrom` 允许发送者（用户 ID 或 `@username`）。
- 开放频道：`channels.mattermost.groupPolicy="open"`（仍提及门控）。

## 出站投递目标
用于 `moltbot message send` 或 cron/webhook 的目标格式：

- `channel:<id>` 发送到频道
- `user:<id>` 发送私聊
- `@username` 发送私聊（通过 Mattermost API 解析）

裸 ID 会被当作频道。

## 多账号
Mattermost 支持 `channels.mattermost.accounts` 多账号：

```json5
{
  channels: {
    mattermost: {
      accounts: {
        default: { name: "Primary", botToken: "mm-token", baseUrl: "https://chat.example.com" },
        alerts: { name: "Alerts", botToken: "mm-token-2", baseUrl: "https://alerts.example.com" }
      }
    }
  }
}
```

## 故障排查
- 频道无回复：确认机器人已在频道内并被提及（oncall），使用触发前缀（onchar），或设 `chatmode: "onmessage"`。
- 认证错误：检查 bot token、base URL 与账号是否启用。
- 多账号问题：环境变量仅应用于 `default` 账号。
