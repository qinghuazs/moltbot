---
summary: "mac 应用如何嵌入 Gateway WebChat 及其调试方式"
read_when:
  - 调试 mac WebChat 视图或 loopback 端口
---
# WebChat（macOS app）

macOS 菜单栏应用将 WebChat UI 作为原生 SwiftUI 视图嵌入。它连接 Gateway，并默认使用所选代理的**主会话**（带会话切换器）。

- **本地模式**：直接连接本地 Gateway WebSocket。
- **远程模式**：通过 SSH 转发 Gateway 控制端口，并以该隧道作为数据通道。

## 启动与调试

- 手动：Lobster 菜单 → “Open Chat”。
- 自动打开用于测试：
  ```bash
  dist/Moltbot.app/Contents/MacOS/Moltbot --webchat
  ```
- 日志：`./scripts/clawlog.sh`（子系统 `bot.molt`，分类 `WebChatSwiftUI`）。

## 线路连接

- 数据通道：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`、
  `chat.inject`，以及事件 `chat`、`agent`、`presence`、`tick`、`health`。
- 会话：默认主会话（`main`，或全局范围时为 `global`）。UI 可切换会话。
- 引导流程使用专用会话，避免与首次运行设置混在一起。

## 安全面

- 远程模式仅通过 SSH 转发 Gateway WebSocket 控制端口。

## 已知限制

- UI 优化于聊天会话（不是完整的浏览器沙箱）。
