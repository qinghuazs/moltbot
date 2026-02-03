---
name: bluebubbles
description: Build or update the BlueBubbles external channel plugin for Moltbot (extension package, REST send/probe, webhook inbound).
---

# BlueBubbles 插件

在处理 BlueBubbles 频道插件时使用此技能。

## 布局
- 扩展包：`extensions/bluebubbles/`（入口：`index.ts`）。
- 频道实现：`extensions/bluebubbles/src/channel.ts`。
- Webhook 处理：`extensions/bluebubbles/src/monitor.ts`（通过 `api.registerHttpHandler` 注册）。
- REST 辅助函数：`extensions/bluebubbles/src/send.ts` + `extensions/bluebubbles/src/probe.ts`。
- 运行时桥接：`extensions/bluebubbles/src/runtime.ts`（通过 `api.runtime` 设置）。
- 入门目录条目：`src/channels/plugins/catalog.ts`。

## 内部辅助函数（使用这些，而不是原始 API 调用）
- `probeBlueBubbles` 在 `extensions/bluebubbles/src/probe.ts` 中用于健康检查。
- `sendMessageBlueBubbles` 在 `extensions/bluebubbles/src/send.ts` 中用于文本传递。
- `resolveChatGuidForTarget` 在 `extensions/bluebubbles/src/send.ts` 中用于聊天查找。
- `sendBlueBubblesReaction` 在 `extensions/bluebubbles/src/reactions.ts` 中用于点按反应。
- `sendBlueBubblesTyping` + `markBlueBubblesChatRead` 在 `extensions/bluebubbles/src/chat.ts` 中。
- `downloadBlueBubblesAttachment` 在 `extensions/bluebubbles/src/attachments.ts` 中用于入站媒体。
- `buildBlueBubblesApiUrl` + `blueBubblesFetchWithTimeout` 在 `extensions/bluebubbles/src/types.ts` 中用于共享 REST 管道。

## Webhooks
- BlueBubbles 将 JSON 发布到网关 HTTP 服务器。
- 防御性地规范化发送者/聊天 ID（有效负载因版本而异）。
- 跳过标记为来自自己的消息。
- 通过插件运行时（`api.runtime`）和 `clawdbot/plugin-sdk` 辅助函数路由到核心回复管道。
- 对于附件/贴纸，当文本为空时使用 `<media:...>` 占位符，并通过入站上下文中的 `MediaUrl(s)` 附加媒体路径。

## 配置（核心）
- `channels.bluebubbles.serverUrl`（基础 URL）、`channels.bluebubbles.password`、`channels.bluebubbles.webhookPath`。
- 操作门控：`channels.bluebubbles.actions.reactions`（默认为 true）。

## 消息工具注意事项
- **反应：** `react` 操作除了 `messageId` 外还需要 `target`（电话号码或聊天标识符）。示例：`action=react target=+15551234567 messageId=ABC123 emoji=❤️`
