---
summary: "macOS 应用如何报告 gateway/Baileys 的健康状态"
read_when:
  - 调试 mac 应用的健康指示
---
# macOS 上的健康检查

如何从菜单栏应用判断已连接渠道是否健康。

## 菜单栏
- 状态点现在反映 Baileys 健康：
  - 绿：已链接且近期打开过 socket。
  - 橙：连接中/重试中。
  - 红：已登出或探测失败。
- 次级行显示 “linked · auth 12m” 或失败原因。
- “Run Health Check” 菜单项会触发按需探测。

## 设置
- General 标签新增 Health 卡片，显示：链接状态、auth 时长、会话存储路径与数量、最后检查时间、最后错误/状态码，并提供 Run Health Check / Reveal Logs 按钮。
- 使用缓存快照让 UI 快速加载，离线时也能优雅回退。
- **Channels 标签**显示 WhatsApp/Telegram 的状态与控制（登录二维码、登出、探测、最近断开/错误）。

## 探测原理
- 应用通过 `ShellExecutor` 每 ~60 秒运行一次 `moltbot health --json`（并支持按需触发）。探测会加载凭据并报告状态，但不会发送消息。
- 分别缓存最后一次成功快照与最后错误，避免 UI 闪烁；显示各自时间戳。

## 不确定时
- 仍可使用 [Gateway health](/gateway/health) 的 CLI 流程（`moltbot status`、`moltbot status --deep`、`moltbot health --json`），并 tail `/tmp/moltbot/moltbot-*.log` 以查看 `web-heartbeat` / `web-reconnect`。
