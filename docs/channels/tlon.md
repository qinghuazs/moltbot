---
summary: "Tlon/Urbit 支持状态、能力与配置"
read_when:
  - 在处理 Tlon/Urbit 渠道功能时
---
# Tlon（插件）

Tlon 是建立在 Urbit 之上的去中心化消息应用。Moltbot 连接到你的 Urbit ship，并可回复私聊与群聊消息。群聊默认需要 @ 提及，可通过 allowlist 进一步限制。

状态：通过插件支持。支持私聊、群提及、线程回复与文本媒体兜底（在说明中追加 URL）。不支持反应、投票与原生媒体上传。

## 需要插件

Tlon 作为插件提供，不随核心安装包附带。

通过 CLI 安装（npm registry）：

```bash
moltbot plugins install @moltbot/tlon
```

本地检出（从 git 仓库运行时）：

```bash
moltbot plugins install ./extensions/tlon
```

详情：见 [插件](/plugin)

## 设置

1) 安装 Tlon 插件。
2) 准备 ship URL 与登录码。
3) 配置 `channels.tlon`。
4) 重启 gateway。
5) 私聊机器人或在群频道中 @ 它。

最小配置（单账号）：

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup"
    }
  }
}
```

## 群频道

默认启用自动发现。也可手动固定频道：

```json5
{
  channels: {
    tlon: {
      groupChannels: [
        "chat/~host-ship/general",
        "chat/~host-ship/support"
      ]
    }
  }
}
```

禁用自动发现：

```json5
{
  channels: {
    tlon: {
      autoDiscoverChannels: false
    }
  }
}
```

## 访问控制

私聊 allowlist（为空 = 全部允许）：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"]
    }
  }
}
```

群聊授权（默认限制）：

```json5
{
  channels: {
    tlon: {
      defaultAuthorizedShips: ["~zod"],
      authorization: {
        channelRules: {
          "chat/~host-ship/general": {
            mode: "restricted",
            allowedShips: ["~zod", "~nec"]
          },
          "chat/~host-ship/announcements": {
            mode: "open"
          }
        }
      }
    }
  }
}
```

## 投递目标（CLI/cron）

用于 `moltbot message send` 或 cron 投递：

- 私聊：`~sampel-palnet` 或 `dm/~sampel-palnet`
- 群聊：`chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 说明

- 群聊回复需要提及（例如 `~your-bot-ship`）。
- 线程回复：若入站消息在 thread 中，Moltbot 会在同一 thread 回复。
- 媒体：`sendMedia` 会降级为文本 + URL（不支持原生上传）。
