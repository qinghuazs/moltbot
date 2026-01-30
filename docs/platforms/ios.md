---
summary: "iOS 节点应用：连接 Gateway、配对、Canvas 与故障排查"
read_when:
  - 配对或重连 iOS 节点
  - 从源码运行 iOS 应用
  - 调试 gateway 发现或 canvas 命令
---
# iOS 应用（节点）

可用性：内部预览。iOS 应用尚未公开发布。

## 功能

- 通过 WebSocket 连接 Gateway（LAN 或 tailnet）。
- 暴露节点能力：Canvas、屏幕快照、相机拍摄、位置、Talk 模式、语音唤醒。
- 接收 `node.invoke` 命令并上报节点状态事件。

## 要求

- Gateway 运行在另一台设备（macOS、Linux 或 Windows via WSL2）。
- 网络路径：
  - 同一局域网（Bonjour），**或**
  - Tailnet（unicast DNS-SD，`moltbot.internal.`），**或**
  - 手动 host/port（兜底）。

## 快速开始（配对与连接）

1) 启动 Gateway：

```bash
moltbot gateway --port 18789
```

2) 在 iOS 应用中打开 Settings，选择发现到的 gateway（或启用 Manual Host 并输入 host/port）。

3) 在 gateway 主机上批准配对请求：

```bash
moltbot nodes pending
moltbot nodes approve <requestId>
```

4) 验证连接：

```bash
moltbot nodes status
moltbot gateway call node.list --params "{}"
```

## 发现路径

### Bonjour（LAN）

Gateway 在 `local.` 上广播 `_moltbot._tcp`。iOS 应用会自动列出。

### Tailnet（跨网络）

如果 mDNS 被阻断，使用 unicast DNS-SD 区域（推荐域名：`moltbot.internal.`）并配合 Tailscale split DNS。
CoreDNS 示例见 [Bonjour](/gateway/bonjour)。

### 手动 host/port

在 Settings 中启用 **Manual Host** 并输入 gateway host + port（默认 `18789`）。

## Canvas 与 A2UI

iOS 节点渲染 WKWebView canvas。使用 `node.invoke` 驱动：

```bash
moltbot nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18793/__moltbot__/canvas/"}'
```

说明：
- Gateway canvas host 提供 `/__moltbot__/canvas/` 与 `/__moltbot__/a2ui/`。
- 当发现 canvas host URL 时，iOS 节点会在连接时自动导航到 A2UI。
- 使用 `canvas.navigate` 并传 `{"url":""}` 可返回内置脚手架。

### Canvas eval / snapshot

```bash
moltbot nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__moltbot; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
moltbot nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒与 Talk 模式

- 语音唤醒与 Talk 模式在 Settings 中可用。
- iOS 可能挂起后台音频；当应用不在前台时，语音功能仅尽力而为。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：将 iOS 应用切到前台（canvas/camera/screen 需要前台）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway 未广播 canvas host URL；检查 [Gateway configuration](/gateway/configuration) 中的 `canvasHost`。
- 配对提示不出现：运行 `moltbot nodes pending` 并手动批准。
- 重装后无法重连：Keychain 中的配对 token 被清除；重新配对节点。

## 相关文档

- [Pairing](/gateway/pairing)
- [Discovery](/gateway/discovery)
- [Bonjour](/gateway/bonjour)
