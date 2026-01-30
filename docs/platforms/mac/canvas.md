---
summary: "通过 WKWebView 嵌入的 Agent 可控 Canvas 面板 + 自定义 URL scheme"
read_when:
  - 实现 macOS Canvas 面板
  - 添加可视化工作区的 agent 控制
  - 调试 WKWebView Canvas 加载
---
# Canvas（macOS 应用）

macOS 应用使用 `WKWebView` 嵌入一个由 agent 控制的 **Canvas 面板**。
它是一个轻量的 HTML/CSS/JS、A2UI 与小型交互式 UI 的视觉工作区。

## Canvas 的位置

Canvas 状态存储在 Application Support 下：

- `~/Library/Application Support/Moltbot/canvas/<session>/...`

Canvas 面板通过**自定义 URL scheme**提供这些文件：

- `moltbot-canvas://<session>/<path>`

示例：
- `moltbot-canvas://main/` → `<canvasRoot>/main/index.html`
- `moltbot-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `moltbot-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

如果根目录没有 `index.html`，应用会显示**内置脚手架页面**。

## 面板行为

- 无边框、可缩放面板，靠近菜单栏（或鼠标位置）。
- 按会话记忆大小与位置。
- 本地 Canvas 文件变更会自动重载。
- 同一时间仅显示一个 Canvas 面板（按需切换会话）。

可在 Settings → **Allow Canvas** 中关闭 Canvas。关闭后，canvas 节点命令返回 `CANVAS_DISABLED`。

## Agent API 面

Canvas 通过 **Gateway WebSocket** 暴露给 agent，因此 agent 可以：

- 显示/隐藏面板
- 导航到路径或 URL
- 执行 JavaScript
- 捕获快照图像

CLI 示例：

```bash
moltbot nodes canvas present --node <id>
moltbot nodes canvas navigate --node <id> --url "/"
moltbot nodes canvas eval --node <id> --js "document.title"
moltbot nodes canvas snapshot --node <id>
```

说明：
- `canvas.navigate` 接受**本地 Canvas 路径**、`http(s)` URL 和 `file://` URL。
- 传入 `"/"` 会显示本地脚手架或 `index.html`。

## Canvas 中的 A2UI

A2UI 由 Gateway canvas host 提供，并在 Canvas 面板中渲染。
当 Gateway 广播 Canvas host 时，macOS 应用在首次打开时会自动导航到 A2UI host 页面。

默认 A2UI host URL：

```
http://<gateway-host>:18793/__moltbot__/a2ui/
```

### A2UI 命令（v0.8）

Canvas 当前接受 **A2UI v0.8** server→client 消息：

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

不支持 `createSurface`（v0.9）。

CLI 示例：

```bash
cat > /tmp/a2ui-v0.8.jsonl <<'EOFA2'
{"surfaceUpdate":{"surfaceId":"main","components":[{"id":"root","component":{"Column":{"children":{"explicitList":["title","content"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"Canvas (A2UI v0.8)"},"usageHint":"h1"}}},{"id":"content","component":{"Text":{"text":{"literalString":"If you can read this, A2UI push works."},"usageHint":"body"}}}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
EOFA2

moltbot nodes canvas a2ui push --jsonl /tmp/a2ui-v0.8.jsonl --node <id>
```

快速烟雾：

```bash
moltbot nodes canvas a2ui push --node <id> --text "Hello from A2UI"
```

## 从 Canvas 触发 agent 运行

Canvas 可通过 deep link 触发新的 agent 运行：

- `moltbot://agent?...`

示例（JS）：

```js
window.location.href = "moltbot://agent?message=Review%20this%20design";
```

除非提供有效 key，否则应用会提示确认。

## 安全说明

- Canvas scheme 会阻止目录遍历；文件必须在会话根目录内。
- 本地 Canvas 内容使用自定义 scheme（无需 loopback 服务器）。
- 外部 `http(s)` URL 仅在显式导航时允许。
