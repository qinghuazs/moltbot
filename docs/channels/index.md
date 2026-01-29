---
summary: "Moltbot 可连接的消息平台"
read_when:
  - 你想为 Moltbot 选择一个聊天渠道
  - 你需要快速了解支持的消息平台
---
# 聊天渠道

Moltbot 可以在你已经使用的任何聊天应用上与您对话。每个渠道都通过 Gateway 连接。
文本在所有渠道都支持；媒体与表情反应会因渠道而异。

## 支持的渠道

- [WhatsApp](/channels/whatsapp) — 最常用；使用 Baileys，需要扫码配对。
- [Telegram](/channels/telegram) — 通过 grammY 的 Bot API；支持群组。
- [Discord](/channels/discord) — Discord Bot API + Gateway；支持服务器、频道与私信。
- [Slack](/channels/slack) — Bolt SDK；工作区应用。
- [Google Chat](/channels/googlechat) — Google Chat API 应用，通过 HTTP webhook。
- [Mattermost](/channels/mattermost) — Bot API + WebSocket；频道、群组、私信（插件，需单独安装）。
- [Signal](/channels/signal) — signal-cli；偏隐私。
- [BlueBubbles](/channels/bluebubbles) — **iMessage 推荐方案**；使用 BlueBubbles macOS 服务器 REST API，功能完整（编辑、撤回、效果、表情反应、群管理等 — 目前在 macOS 26 Tahoe 上编辑功能不可用）。
- [iMessage](/channels/imessage) — 仅 macOS；通过 imsg 原生集成（遗留方案，新部署建议使用 BlueBubbles）。
- [Microsoft Teams](/channels/msteams) — Bot Framework；企业支持（插件，需单独安装）。
- [LINE](/channels/line) — LINE Messaging API 机器人（插件，需单独安装）。
- [Nextcloud Talk](/channels/nextcloud-talk) — 通过 Nextcloud Talk 自托管聊天（插件，需单独安装）。
- [Matrix](/channels/matrix) — Matrix 协议（插件，需单独安装）。
- [Nostr](/channels/nostr) — 通过 NIP-04 的去中心化私信（插件，需单独安装）。
- [Tlon](/channels/tlon) — 基于 Urbit 的消息应用（插件，需单独安装）。
- [Twitch](/channels/twitch) — 通过 IRC 连接的 Twitch 聊天（插件，需单独安装）。
- [Zalo](/channels/zalo) — Zalo Bot API；越南常用消息应用（插件，需单独安装）。
- [Zalo Personal](/channels/zalouser) — 通过扫码登录的 Zalo 个人号（插件，需单独安装）。
- [WebChat](/web/webchat) — 通过 WebSocket 的 Gateway WebChat UI。

## 说明

- 渠道可同时运行；配置多个后，Moltbot 会按聊天路由。
- 最快的上手方式通常是 **Telegram**（简单的 bot token）。WhatsApp 需要扫码配对，
  且会在磁盘上存更多状态。
- 群组行为因渠道而异；参见 [群组](/concepts/groups)。
- 为安全起见会强制私信配对与允许列表；参见 [安全](/gateway/security)。
- Telegram 内部实现说明：见 [grammY 说明](/channels/grammy)。
- 故障排查：见 [渠道排查](/channels/troubleshooting)。
- 模型提供方另有文档；见 [模型提供方](/providers/models)。
