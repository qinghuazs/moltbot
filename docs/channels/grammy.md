---
summary: "通过 grammY 集成 Telegram Bot API（含设置说明）"
read_when:
  - 在处理 Telegram 或 grammY 路径时
---
# grammY 集成（Telegram Bot API）


# 为什么选择 grammY
- TS 优先的 Bot API 客户端，内置长轮询 + webhook 辅助、中间件、错误处理、限流器。
- 媒体处理更简洁，避免手写 fetch + FormData；覆盖所有 Bot API 方法。
- 易扩展：自定义 fetch 支持代理、session 中间件（可选）、类型安全上下文。

# 已交付内容
- **单一客户端路径：** 移除基于 fetch 的实现；grammY 现在是唯一 Telegram 客户端（发送 + gateway），默认启用 grammY throttler。
- **Gateway：** `monitorTelegramProvider` 构建 grammY `Bot`，接入提及/allowlist 门控，通过 `getFile`/`download` 下载媒体，使用 `sendMessage/sendPhoto/sendVideo/sendAudio/sendDocument` 发送回复。支持长轮询或 `webhookCallback`。
- **代理：** 可选 `channels.telegram.proxy`，通过 grammY 的 `client.baseFetch` 使用 `undici.ProxyAgent`。
- **Webhook 支持：** `webhook-set.ts` 封装 `setWebhook/deleteWebhook`；`webhook.ts` 负责 callback、健康检查与优雅关闭。gateway 在设置 `channels.telegram.webhookUrl` 时启用 webhook（否则长轮询）。
- **会话：** 私聊折叠到 agent 主会话（`agent:<agentId>:<mainKey>`）；群聊使用 `agent:<agentId>:telegram:group:<chatId>`；回复回到同一渠道。
- **配置项：** `channels.telegram.botToken`、`channels.telegram.dmPolicy`、`channels.telegram.groups`（allowlist + 提及默认值）、`channels.telegram.allowFrom`、`channels.telegram.groupAllowFrom`、`channels.telegram.groupPolicy`、`channels.telegram.mediaMaxMb`、`channels.telegram.linkPreview`、`channels.telegram.proxy`、`channels.telegram.webhookSecret`、`channels.telegram.webhookUrl`。
- **草稿流式：** 可选 `channels.telegram.streamMode` 在私聊主题中使用 `sendMessageDraft`（Bot API 9.3+）。这与渠道块流式是分离的。
- **测试：** grammY mocks 覆盖私聊 + 群提及门控与出站发送；仍欢迎更多媒体/webhook 夹具。

待定问题
- 若遇到 Bot API 429，是否使用可选的 grammY 插件（throttler）。
- 增加更多媒体测试（贴纸、语音便签）。
- 让 webhook 监听端口可配置（目前固定 8787，除非通过 gateway 线路接入）。
