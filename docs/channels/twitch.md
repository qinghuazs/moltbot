---
summary: "Twitch 聊天机器人配置与设置"
read_when:
  - 为 Moltbot 设置 Twitch 聊天集成
---
# Twitch（插件）

通过 IRC 连接支持 Twitch 聊天。Moltbot 以 Twitch 用户（机器人账号）身份连接，在频道内收发消息。

## 需要插件

Twitch 作为插件提供，不随核心安装包附带。

通过 CLI 安装（npm registry）：

```bash
moltbot plugins install @moltbot/twitch
```

本地检出（从 git 仓库运行时）：

```bash
moltbot plugins install ./extensions/twitch
```

详情：见 [插件](/plugin)

## 快速上手（新手）

1) 为机器人创建一个专用 Twitch 账号（或使用现有账号）。
2) 生成凭据：[Twitch Token Generator](https://twitchtokengenerator.com/)
   - 选择 **Bot Token**
   - 确认 scopes 已勾选 `chat:read` 与 `chat:write`
   - 复制 **Client ID** 与 **Access Token**
3) 查找你的 Twitch 用户 ID：<https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/>
4) 配置 token：
   - 环境变量：`CLAWDBOT_TWITCH_ACCESS_TOKEN=...`（仅默认账号）
   - 或配置：`channels.twitch.accessToken`
   - 两者同时设置时，配置优先（环境变量仅兜底默认账号）。
5) 启动 gateway。

**⚠️ 重要：** 请设置访问控制（`allowFrom` 或 `allowedRoles`）以避免未授权用户触发机器人。`requireMention` 默认为 `true`。

最小配置：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "moltbot",              // 机器人的 Twitch 账号
      accessToken: "oauth:abc123...",    // OAuth Access Token（或使用 CLAWDBOT_TWITCH_ACCESS_TOKEN）
      clientId: "xyz789...",             // Token Generator 提供的 Client ID
      channel: "vevisk",                 // 要加入的频道（必填）
      allowFrom: ["123456789"]           // （推荐）仅允许你的 Twitch 用户 ID
    }
  }
}
```

## 这是什么

- Gateway 持有的 Twitch 渠道。
- 确定性路由：回复总是回到 Twitch。
- 每个账号映射到独立会话键 `agent:<agentId>:twitch:<accountName>`。
- `username` 为机器人账号（用于认证），`channel` 为要加入的聊天频道。

## 设置（详细）

### 生成凭据

使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：
- 选择 **Bot Token**
- 确认勾选 `chat:read` 与 `chat:write`
- 复制 **Client ID** 与 **Access Token**

无需手动注册应用。Token 几小时后会过期。

### 配置机器人

**环境变量（仅默认账号）：**
```bash
CLAWDBOT_TWITCH_ACCESS_TOKEN=oauth:abc123...
```

**或配置：**
```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "moltbot",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk"
    }
  }
}
```

若 env 与 config 同时设置，以 config 为准。

### 访问控制（推荐）

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"],       // （推荐）仅允许你的 Twitch 用户 ID
      allowedRoles: ["moderator"]     // 或按角色限制
    }
  }
}
```

**可用角色：** `"moderator"`、`"owner"`、`"vip"`、`"subscriber"`、`"all"`。

**为什么用用户 ID？** 用户名可变，可能被冒用。用户 ID 永久不变。

查找你的 Twitch 用户 ID：<https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/>（将用户名转换为 ID）。

## Token 刷新（可选）

[Twitch Token Generator](https://twitchtokengenerator.com/) 生成的 token 无法自动刷新，过期需重新生成。

如需自动刷新，请在 [Twitch Developer Console](https://dev.twitch.tv/console) 创建应用并配置：

```json5
{
  channels: {
    twitch: {
      clientSecret: "your_client_secret",
      refreshToken: "your_refresh_token"
    }
  }
}
```

机器人会在过期前自动刷新并记录日志。

## 多账号支持

使用 `channels.twitch.accounts` 为每个账号配置 token。共享模式见 [`gateway/configuration`](/gateway/configuration)。

示例（一个机器人账号进两个频道）：

```json5
{
  channels: {
    twitch: {
      accounts: {
        channel1: {
          username: "moltbot",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "vevisk"
        },
        channel2: {
          username: "moltbot",
          accessToken: "oauth:def456...",
          clientId: "uvw012...",
          channel: "secondchannel"
        }
      }
    }
  }
}
```

**注意：** 每个账号需要自己的 token（每个频道一个 token）。

## 访问控制

### 基于角色限制

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator", "vip"]
        }
      }
    }
  }
}
```

### 按用户 ID allowlist（最安全）

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowFrom: ["123456789", "987654321"]
        }
      }
    }
  }
}
```

### allowlist + 角色组合

`allowFrom` 中的用户会跳过角色检查：

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowFrom: ["123456789"],
          allowedRoles: ["moderator"]
        }
      }
    }
  }
}
```

### 关闭 @mention 要求

默认 `requireMention` 为 `true`。若要响应所有消息：

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          requireMention: false
        }
      }
    }
  }
}
```

## 故障排查

先运行诊断命令：

```bash
moltbot doctor
moltbot channels status --probe
```

### 机器人不响应消息

**检查访问控制：** 临时设置 `allowedRoles: ["all"]` 测试。

**确认机器人已在频道中：** 机器人必须加入 `channel` 指定的频道。

### Token 问题

**“Failed to connect” 或认证错误：**
- 确认 `accessToken` 为 OAuth access token（通常以 `oauth:` 开头）
- 确认 token 包含 `chat:read` 与 `chat:write` scope
- 若使用自动刷新，确认 `clientSecret` 与 `refreshToken` 已设置

### Token 刷新不工作

**检查日志是否有刷新事件：**
```
Using env token source for mybot
Access token refreshed for user 123456 (expires in 14400s)
```

若看到 “token refresh disabled (no refresh token)”：
- 确认 `clientSecret` 已提供
- 确认 `refreshToken` 已提供

## 配置

**账号配置：**
- `username` - 机器人用户名
- `accessToken` - 带 `chat:read` 与 `chat:write` 的 OAuth access token
- `clientId` - Twitch Client ID（来自 Token Generator 或你的应用）
- `channel` - 要加入的频道（必填）
- `enabled` - 启用该账号（默认 `true`）
- `clientSecret` - 可选：用于自动刷新 token
- `refreshToken` - 可选：用于自动刷新 token
- `expiresIn` - token 过期秒数
- `obtainmentTimestamp` - token 获取时间戳
- `allowFrom` - 用户 ID allowlist
- `allowedRoles` - 角色访问控制（`"moderator" | "owner" | "vip" | "subscriber" | "all"`）
- `requireMention` - 要求 @mention（默认 `true`）

**Provider 选项：**
- `channels.twitch.enabled` - 启用/禁用渠道启动
- `channels.twitch.username` - 机器人用户名（简化单账号配置）
- `channels.twitch.accessToken` - OAuth access token（简化单账号配置）
- `channels.twitch.clientId` - Twitch Client ID（简化单账号配置）
- `channels.twitch.channel` - 频道（简化单账号配置）
- `channels.twitch.accounts.<accountName>` - 多账号配置（包含以上字段）

完整示例：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "moltbot",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
      clientSecret: "secret123...",
      refreshToken: "refresh456...",
      allowFrom: ["123456789"],
      allowedRoles: ["moderator", "vip"],
      accounts: {
        default: {
          username: "mybot",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "your_channel",
          enabled: true,
          clientSecret: "secret123...",
          refreshToken: "refresh456...",
          expiresIn: 14400,
          obtainmentTimestamp: 1706092800000,
          allowFrom: ["123456789", "987654321"],
          allowedRoles: ["moderator"]
        }
      }
    }
  }
}
```

## 工具动作

agent 可调用 `twitch` 执行动作：
- `send` - 向频道发送消息

示例：

```json5
{
  "action": "twitch",
  "params": {
    "message": "Hello Twitch!",
    "to": "#mychannel"
  }
}
```

## 安全与运维

- **将 token 视作密码** - 切勿提交到 git
- **长时运行机器人建议启用自动刷新**
- **访问控制优先使用用户 ID allowlist**（不要用用户名）
- **监控日志** 了解 token 刷新与连接状态
- **最小化 token 权限** - 仅申请 `chat:read` 与 `chat:write`
- **卡住时**：确认无其他进程占用会话后重启 gateway

## 限制

- 每条消息 **500 字符**（会按词边界自动分块）
- Markdown 在分块前会被剥离
- 无额外限流（使用 Twitch 内建限流）
