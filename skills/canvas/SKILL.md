# Canvas 技能

在已连接的 Moltbot 节点（Mac 应用、iOS、Android）上显示 HTML 内容。

## 概述

canvas 工具可让你在任何已连接节点的 canvas 视图中展示 Web 内容。适用于：
- 显示游戏、可视化、仪表盘
- 展示生成的 HTML 内容
- 交互式演示

## 工作原理

### 架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Canvas Host    │────▶│   Node Bridge    │────▶│  Node App   │
│  (HTTP Server)  │     │  (TCP Server)    │     │ (Mac/iOS/   │
│  Port 18793     │     │  Port 18790      │     │  Android)   │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

1. **Canvas Host 服务器**：从 `canvasHost.root` 目录提供静态 HTML/CSS/JS 文件
2. **Node Bridge**：将 canvas URL 传递给已连接的节点
3. **Node 应用**：在 WebView 中渲染内容

### Tailscale 集成

Canvas host 服务器根据 `gateway.bind` 设置进行绑定：

| 绑定模式 | 服务器绑定到 | Canvas URL 使用 |
|-----------|-----------------|-----------------|
| `loopback` | 127.0.0.1 | localhost（仅本地） |
| `lan` | LAN 接口 | LAN IP 地址 |
| `tailnet` | Tailscale 接口 | Tailscale 主机名 |
| `auto` | 最佳可用 | Tailscale > LAN > loopback |

**关键点：**`canvasHostHostForBridge` 派生自 `bridgeHost`。当绑定到 Tailscale 时，节点会收到如下 URL：
```
http://<tailscale-hostname>:18793/__moltbot__/canvas/<file>.html
```

这就是为什么 localhost URL 不起作用——节点从 bridge 接收的是 Tailscale 主机名！

## 操作

| 操作 | 描述 |
|--------|-------------|
| `present` | 显示 canvas，可选目标 URL |
| `hide` | 隐藏 canvas |
| `navigate` | 导航到新 URL |
| `eval` | 在 canvas 中执行 JavaScript |
| `snapshot` | 捕获 canvas 截图 |

## 配置

在 `~/.clawdbot/moltbot.json` 中：

```json
{
  "canvasHost": {
    "enabled": true,
    "port": 18793,
    "root": "/Users/you/clawd/canvas",
    "liveReload": true
  },
  "gateway": {
    "bind": "auto"
  }
}
```

### 实时重载

当 `liveReload: true`（默认）时，canvas host 会：
- 监视根目录的变更（通过 chokidar）
- 向 HTML 文件注入 WebSocket 客户端
- 当文件变更时自动重载已连接的 canvas

非常适合开发！

## 工作流程

### 1. 创建 HTML 内容

将文件放在 canvas 根目录（默认 `~/clawd/canvas/`）：

```bash
cat > ~/clawd/canvas/my-game.html << 'HTML'
<!DOCTYPE html>
<html>
<head><title>My Game</title></head>
<body>
  <h1>Hello Canvas!</h1>
</body>
</html>
HTML
```

### 2. 找到你的 canvas host URL

检查 gateway 的绑定方式：
```bash
cat ~/.clawdbot/moltbot.json | jq '.gateway.bind'
```

然后构建 URL：
- **loopback**：`http://127.0.0.1:18793/__moltbot__/canvas/<file>.html`
- **lan/tailnet/auto**：`http://<hostname>:18793/__moltbot__/canvas/<file>.html`

查找你的 Tailscale 主机名：
```bash
tailscale status --json | jq -r '.Self.DNSName' | sed 's/\.$//'
```

### 3. 查找已连接的节点

```bash
moltbot nodes list
```

查找具有 canvas 功能的 Mac/iOS/Android 节点。

### 4. 展示内容

```
canvas action:present node:<node-id> target:<full-url>
```

**示例：**
```
canvas action:present node:mac-63599bc4-b54d-4392-9048-b97abd58343a target:http://peters-mac-studio-1.sheep-coho.ts.net:18793/__moltbot__/canvas/snake.html
```

### 5. 导航、截图或隐藏

```
canvas action:navigate node:<node-id> url:<new-url>
canvas action:snapshot node:<node-id>
canvas action:hide node:<node-id>
```

## 调试

### 白屏 / 内容未加载

**原因：**服务器绑定与节点期望的 URL 不匹配。

**调试步骤：**
1. 检查服务器绑定：`cat ~/.clawdbot/moltbot.json | jq '.gateway.bind'`
2. 检查 canvas 使用的端口：`lsof -i :18793`
3. 直接测试 URL：`curl http://<hostname>:18793/__moltbot__/canvas/<file>.html`

**解决方案：**使用与绑定模式匹配的完整主机名，而不是 localhost。

### "node required" 错误

始终指定 `node:<node-id>` 参数。

### "node not connected" 错误

节点离线。使用 `moltbot nodes list` 查找在线节点。

### 内容未更新

如果实时重载不工作：
1. 检查配置中的 `liveReload: true`
2. 确保文件在 canvas 根目录中
3. 检查日志中的 watcher 错误

## URL 路径结构

Canvas host 从 `/__moltbot__/canvas/` 前缀提供服务：

```
http://<host>:18793/__moltbot__/canvas/index.html  → ~/clawd/canvas/index.html
http://<host>:18793/__moltbot__/canvas/games/snake.html → ~/clawd/canvas/games/snake.html
```

`/__moltbot__/canvas/` 前缀由 `CANVAS_HOST_PATH` 常量定义。

## 提示

- 保持 HTML 自包含（内联 CSS/JS）以获得最佳效果
- 使用默认的 index.html 作为测试页面（包含 bridge 诊断）
- Canvas 会持续显示直到你 `hide` 它或导航离开
- 实时重载使开发变得快速——只需保存即可更新！
- A2UI JSON 推送正在开发中——目前请使用 HTML 文件
