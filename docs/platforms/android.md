---
summary: "Android 应用（节点）：连接手册与 Canvas/聊天/相机"
read_when:
  - 配对或重连 Android 节点
  - 调试 Android 的 gateway 发现或认证
  - 验证各客户端的聊天历史一致性
---

# Android 应用（节点）

## 支持概览
- 角色：伴随节点应用（Android 不承载 Gateway）。
- Gateway 必需：是（运行在 macOS、Linux 或 Windows via WSL2）。
- 安装：[Getting Started](/start/getting-started) + [Pairing](/gateway/pairing)。
- Gateway：[Runbook](/gateway) + [Configuration](/gateway/configuration)。
  - 协议：[Gateway protocol](/gateway/protocol)（节点与控制平面）。

## 系统控制

系统控制（launchd/systemd）在 Gateway 主机上。见 [Gateway](/gateway)。

## 连接手册

Android 节点应用 ⇄（mDNS/NSD + WebSocket）⇄ **Gateway**

Android 直接连接 Gateway WebSocket（默认 `ws://<host>:18789`）并使用 Gateway 管理的配对。

### 先决条件

- 你可以在“主机”上运行 Gateway。
- Android 设备或模拟器可访问 gateway WebSocket：
  - 同一局域网并支持 mDNS/NSD，**或**
  - 同一 Tailscale tailnet，使用 Wide-Area Bonjour / unicast DNS-SD（见下文），**或**
  - 手动指定 gateway host/port（兜底）
- 你可以在 gateway 主机上运行 CLI（`moltbot`）（或通过 SSH）。

### 1) 启动 Gateway

```bash
moltbot gateway --port 18789 --verbose
```

确认日志中看到类似：
- `listening on ws://0.0.0.0:18789`

对于仅 tailnet 的部署（例如 Vienna ⇄ London），将 gateway 绑定到 tailnet IP：

- 在 gateway 主机 `~/.clawdbot/moltbot.json` 中设置 `gateway.bind: "tailnet"`。
- 重启 Gateway 或 macOS 菜单栏应用。

### 2) 验证发现（可选）

在 gateway 主机：

```bash
dns-sd -B _moltbot-gw._tcp local.
```

更多调试说明见 [Bonjour](/gateway/bonjour)。

#### Tailnet（Vienna ⇄ London）通过 unicast DNS-SD 发现

Android 的 NSD/mDNS 发现不会跨网络。如果 Android 节点与 gateway 在不同网络但通过 Tailscale 连接，请使用 Wide-Area Bonjour / unicast DNS-SD：

1) 在 gateway 主机上设置 DNS-SD 区域（示例 `moltbot.internal.`）并发布 `_moltbot-gw._tcp` 记录。
2) 配置 Tailscale split DNS，将 `moltbot.internal` 指向该 DNS 服务器。

详情与 CoreDNS 示例见 [Bonjour](/gateway/bonjour)。

### 3) 从 Android 连接

在 Android 应用中：

- 应用使用**前台服务**保持 gateway 连接（常驻通知）。
- 打开 **Settings**。
- 在 **Discovered Gateways** 下选择你的 gateway 并点击 **Connect**。
- 如果 mDNS 被阻断，使用 **Advanced → Manual Gateway**（host + port）并点击 **Connect (Manual)**。

首次配对成功后，Android 会在启动时自动重连：
- 若启用 manual endpoint，优先使用 manual；否则
- 使用上次发现的 gateway（尽力而为）。

### 4) 批准配对（CLI）

在 gateway 主机：

```bash
moltbot nodes pending
moltbot nodes approve <requestId>
```

配对详情：[Gateway pairing](/gateway/pairing)。

### 5) 验证节点已连接

- 通过 nodes status：
  ```bash
  moltbot nodes status
  ```
- 通过 Gateway：
  ```bash
  moltbot gateway call node.list --params "{}"
  ```

### 6) 聊天与历史

Android 节点的聊天视图使用 gateway 的**主会话键**（`main`），因此历史与回复在 WebChat 和其他客户端共享：

- History：`chat.history`
- Send：`chat.send`
- 推送更新（尽力而为）：`chat.subscribe` → `event:"chat"`

### 7) Canvas 与相机

#### Gateway Canvas Host（推荐用于网页内容）

如果你希望节点展示真实的 HTML/CSS/JS 且 agent 可在磁盘上编辑，请将节点指向 Gateway canvas host。

注意：节点使用 `canvasHost.port` 的独立 canvas host（默认 `18793`）。

1) 在 gateway 主机创建 `~/clawd/canvas/index.html`。

2) 导航节点到该地址（LAN）：

```bash
moltbot nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18793/__moltbot__/canvas/"}'
```

Tailnet（可选）：若两台设备都在 Tailscale 中，使用 MagicDNS 名称或 tailnet IP 替代 `.local`，例如 `http://<gateway-magicdns>:18793/__moltbot__/canvas/`。

该服务器会向 HTML 注入 live-reload 客户端，并在文件变更时重载。
A2UI host 地址为 `http://<gateway-host>:18793/__moltbot__/a2ui/`。

Canvas 命令（仅前台）：
- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回默认脚手架）。`canvas.snapshot` 返回 `{ format, base64 }`（默认 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 为旧别名）

相机命令（仅前台；需权限）：
- `camera.snap`（jpg）
- `camera.clip`（mp4）

参数与 CLI helper 见 [Camera node](/nodes/camera)。
