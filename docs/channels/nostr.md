---
summary: "通过 NIP-04 加密私信的 Nostr DM 渠道"
read_when:
  - 你希望 Moltbot 通过 Nostr 接收私信
  - 正在设置去中心化消息
---
# Nostr

**状态：** 可选插件（默认禁用）。

Nostr 是去中心化社交协议。本渠道允许 Moltbot 通过 NIP-04 接收并回复加密私信（DM）。

## 安装（按需）

### 引导（推荐）

- 引导向导（`moltbot onboard`）与 `moltbot channels add` 会列出可选渠道插件。
- 选择 Nostr 会提示按需安装插件。

安装默认策略：

- **Dev 通道 + 可用 git 检出：** 使用本地插件路径。
- **Stable/Beta：** 从 npm 下载。

你可以在提示中随时覆盖。

### 手动安装

```bash
moltbot plugins install @moltbot/nostr
```

使用本地检出（开发流程）：

```bash
moltbot plugins install --link <path-to-moltbot>/extensions/nostr
```

安装或启用插件后请重启 Gateway。

## 快速上手

1) 生成 Nostr 密钥对（如需要）：

```bash
# 使用 nak
nak key generate
```

2) 写入配置：

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}"
    }
  }
}
```

3) 导出密钥：

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4) 重启 Gateway。

## 配置参考

| Key | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `privateKey` | string | required | 私钥（`nsec` 或 hex） |
| `relays` | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | Relay URL（WebSocket） |
| `dmPolicy` | string | `pairing` | 私聊访问策略 |
| `allowFrom` | string[] | `[]` | 允许的发送者公钥 |
| `enabled` | boolean | `true` | 启用/禁用渠道 |
| `name` | string | - | 显示名称 |
| `profile` | object | - | NIP-01 资料元数据 |

## Profile 元数据

Profile 会以 NIP-01 `kind:0` 事件发布。你可以在控制台 UI（Channels → Nostr → Profile）管理，或在配置中直接设置。

示例：

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "profile": {
        "name": "moltbot",
        "displayName": "Moltbot",
        "about": "Personal assistant DM bot",
        "picture": "https://example.com/avatar.png",
        "banner": "https://example.com/banner.png",
        "website": "https://example.com",
        "nip05": "moltbot@example.com",
        "lud16": "moltbot@example.com"
      }
    }
  }
}
```

说明：

- Profile URL 必须使用 `https://`。
- 从 relay 导入会合并字段并保留本地覆盖。

## 访问控制

### 私聊策略

- **pairing**（默认）：陌生发送者收到配对码。
- **allowlist**：仅 `allowFrom` 中的公钥可私聊。
- **open**：公开私聊（需 `allowFrom: ["*"]`）。
- **disabled**：忽略入站私聊。

### Allowlist 示例

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "dmPolicy": "allowlist",
      "allowFrom": ["npub1abc...", "npub1xyz..."]
    }
  }
}
```

## 密钥格式

支持的格式：

- **私钥：** `nsec...` 或 64 位 hex
- **公钥（`allowFrom`）：** `npub...` 或 hex

## Relays

默认：`relay.damus.io` 与 `nos.lol`。

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": [
        "wss://relay.damus.io",
        "wss://relay.primal.net",
        "wss://nostr.wine"
      ]
    }
  }
}
```

提示：

- 使用 2–3 个 relay 做冗余。
- 避免过多 relay（延迟、重复）。
- 付费 relay 可提高可靠性。
- 本地 relay 也可用于测试（`ws://localhost:7777`）。

## 协议支持

| NIP | 状态 | 说明 |
| --- | --- | --- |
| NIP-01 | Supported | 基础事件格式 + profile 元数据 |
| NIP-04 | Supported | 加密私信（`kind:4`） |
| NIP-17 | Planned | Gift-wrapped 私信 |
| NIP-44 | Planned | 版本化加密 |

## 测试

### 本地 relay

```bash
# 启动 strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry
```

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": ["ws://localhost:7777"]
    }
  }
}
```

### 手动测试

1) 从日志中记录 bot 的公钥（npub）。
2) 打开 Nostr 客户端（Damus、Amethyst 等）。
3) 给该公钥发私信。
4) 验证回复。

## 故障排查

### 收不到消息

- 验证私钥有效。
- 确认 relay URL 可达且使用 `wss://`（本地用 `ws://`）。
- 确认 `enabled` 未设为 `false`。
- 查看 Gateway 日志是否有 relay 连接错误。

### 发不出回复

- 检查 relay 是否允许写入。
- 验证出站网络连通性。
- 注意 relay 限流。

### 重复回复

- 多 relay 会导致重复，这是预期行为。
- 消息按事件 ID 去重，仅首个投递触发回复。

## 安全

- 不要提交私钥。
- 使用环境变量存放密钥。
- 生产机器人建议使用 `allowlist`。

## 限制（MVP）

- 仅私聊（无群聊）。
- 无媒体附件。
- 仅 NIP-04（计划支持 NIP-17）。
