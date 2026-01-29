---
summary: "各渠道常见排障捷径（Discord/Telegram/WhatsApp）"
read_when:
  - 渠道已连接但消息不通
  - 排查渠道配置问题（intents、权限、隐私模式）
---
# 渠道故障排查

先从这里开始：

```bash
moltbot doctor
moltbot channels status --probe
```

`channels status --probe` 会在检测到常见配置问题时输出警告，并包含少量在线检查（凭据、部分权限/成员关系）。

## 渠道
- Discord：[/channels/discord#troubleshooting](/channels/discord#troubleshooting)
- Telegram：[/channels/telegram#troubleshooting](/channels/telegram#troubleshooting)
- WhatsApp：[/channels/whatsapp#troubleshooting-quick](/channels/whatsapp#troubleshooting-quick)

## Telegram 快速修复
- 日志出现 `HttpError: Network request for 'sendMessage' failed` 或 `sendChatAction` → 检查 IPv6 DNS。若 `api.telegram.org` 优先解析到 IPv6 而主机无 IPv6 出站，请强制 IPv4 或开启 IPv6。见 [/channels/telegram#troubleshooting](/channels/telegram#troubleshooting)。
- 日志出现 `setMyCommands failed` → 检查到 `api.telegram.org` 的出站 HTTPS 与 DNS 可达性（常见于被限制的 VPS 或代理）。
