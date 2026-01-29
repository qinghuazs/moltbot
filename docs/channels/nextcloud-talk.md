---
summary: "Nextcloud Talk 支持状态、能力与配置"
read_when:
  - 在处理 Nextcloud Talk 渠道功能时
---
# Nextcloud Talk（插件）

状态：通过插件支持（webhook bot）。支持私聊、房间、反应与 Markdown 消息。

## 需要插件
Nextcloud Talk 作为插件提供，不随核心安装包附带。

通过 CLI 安装（npm registry）：
```bash
moltbot plugins install @moltbot/nextcloud-talk
```

本地检出（从 git 仓库运行时）：
```bash
moltbot plugins install ./extensions/nextcloud-talk
```

若在配置/引导中选择 Nextcloud Talk 且检测到 git 检出，
Moltbot 会自动提供本地安装路径。

详情：见 [插件](/plugin)

## 快速上手（新手）
1) 安装 Nextcloud Talk 插件。
2) 在你的 Nextcloud 服务器上创建 bot：
   ```bash
   ./occ talk:bot:install "Moltbot" "<shared-secret>" "<webhook-url>" --feature reaction
   ```
3) 在目标房间设置中启用 bot。
4) 配置 Moltbot：
   - 配置：`channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - 或环境变量：`NEXTCLOUD_TALK_BOT_SECRET`（仅默认账号）
5) 重启 gateway（或完成引导）。

最小配置：
```json5
{
  channels: {
    "nextcloud-talk": {
      enabled: true,
      baseUrl: "https://cloud.example.com",
      botSecret: "shared-secret",
      dmPolicy: "pairing"
    }
  }
}
```

## 说明
- Bot 不能主动发起私聊，用户必须先联系 bot。
- Webhook URL 必须可被 Gateway 访问；若在代理后，设置 `webhookPublicUrl`。
- Bot API 不支持媒体上传；媒体以 URL 形式发送。
- Webhook payload 无法区分私聊与房间；设置 `apiUser` + `apiPassword` 可启用房间类型查询（否则私聊会被当作房间）。

## 访问控制（私聊）
- 默认：`channels.nextcloud-talk.dmPolicy = "pairing"`。陌生发送者收到配对码。
- 批准方式：
  - `moltbot pairing list nextcloud-talk`
  - `moltbot pairing approve nextcloud-talk <CODE>`
- 开放私聊：`channels.nextcloud-talk.dmPolicy="open"` 且 `channels.nextcloud-talk.allowFrom=["*"]`。

## 房间（群组）
- 默认：`channels.nextcloud-talk.groupPolicy = "allowlist"`（提及门控）。
- 用 `channels.nextcloud-talk.rooms` allowlist 房间：
```json5
{
  channels: {
    "nextcloud-talk": {
      rooms: {
        "room-token": { requireMention: true }
      }
    }
  }
}
```
- 若不允许任何房间，保持 allowlist 为空或设置 `channels.nextcloud-talk.groupPolicy="disabled"`。

## 能力
| 功能 | 状态 |
|---------|--------|
| 私聊 | 支持 |
| 房间 | 支持 |
| 线程 | 不支持 |
| 媒体 | 仅 URL |
| 反应 | 支持 |
| 原生命令 | 不支持 |

## 配置参考（Nextcloud Talk）
完整配置：见 [配置](/gateway/configuration)

Provider 选项：
- `channels.nextcloud-talk.enabled`：启用/禁用渠道启动。
- `channels.nextcloud-talk.baseUrl`：Nextcloud 实例 URL。
- `channels.nextcloud-talk.botSecret`：bot 共享密钥。
- `channels.nextcloud-talk.botSecretFile`：密钥文件路径。
- `channels.nextcloud-talk.apiUser`：用于房间查询的 API 用户（私聊识别）。
- `channels.nextcloud-talk.apiPassword`：用于房间查询的 API/应用密码。
- `channels.nextcloud-talk.apiPasswordFile`：API 密码文件路径。
- `channels.nextcloud-talk.webhookPort`：webhook 监听端口（默认 8788）。
- `channels.nextcloud-talk.webhookHost`：webhook 主机（默认 0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`：webhook 路径（默认 /nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`：外部可达的 webhook URL。
- `channels.nextcloud-talk.dmPolicy`：`pairing | allowlist | open | disabled`。
- `channels.nextcloud-talk.allowFrom`：私聊 allowlist（用户 ID）。`open` 需包含 `"*"`。
- `channels.nextcloud-talk.groupPolicy`：`allowlist | open | disabled`。
- `channels.nextcloud-talk.groupAllowFrom`：群 allowlist（用户 ID）。
- `channels.nextcloud-talk.rooms`：按房间设置与 allowlist。
- `channels.nextcloud-talk.historyLimit`：群历史限制（0 禁用）。
- `channels.nextcloud-talk.dmHistoryLimit`：私聊历史限制（0 禁用）。
- `channels.nextcloud-talk.dms`：按私聊覆盖（historyLimit）。
- `channels.nextcloud-talk.textChunkLimit`：出站分块大小（字符）。
- `channels.nextcloud-talk.chunkMode`：`length`（默认）或 `newline`（按空行分段再按长度分块）。
- `channels.nextcloud-talk.blockStreaming`：禁用该渠道的块流式。
- `channels.nextcloud-talk.blockStreamingCoalesce`：块流式合并调优。
- `channels.nextcloud-talk.mediaMaxMb`：入站媒体上限（MB）。
