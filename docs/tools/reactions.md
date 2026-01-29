---
summary: "跨渠道共享的反应语义"
read_when:
  - 在任意渠道处理中反应功能
---
# 反应工具语义

跨渠道共享的反应语义：

- 添加反应时必须提供 `emoji`。
- 当支持时，`emoji=""` 会移除机器人的反应。
- 当支持时，`remove: true` 移除指定 emoji（需要 `emoji`）。

渠道说明：

- **Discord/Slack**：空 `emoji` 会移除该消息上机器人的所有反应；`remove: true` 只移除指定 emoji。
- **Google Chat**：空 `emoji` 会移除该消息上应用的所有反应；`remove: true` 只移除指定 emoji。
- **Telegram**：空 `emoji` 会移除机器人的反应；`remove: true` 也可移除，但工具校验仍要求非空 `emoji`。
- **WhatsApp**：空 `emoji` 会移除机器人的反应；`remove: true` 映射为空 emoji（仍要求提供 `emoji`）。
- **Signal**：当启用 `channels.signal.reactionNotifications` 时，入站反应会发出系统事件。
