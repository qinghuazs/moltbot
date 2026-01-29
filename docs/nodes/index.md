---
summary: "节点：配对 能力 权限 与用于 canvas/camera/screen/system 的 CLI 帮手"
read_when:
  - 将 iOS/Android 节点配对到 gateway
  - 使用节点的 canvas/camera 为 agent 提供上下文
  - 添加新的节点命令或 CLI 辅助
---

# 节点

**节点** 是连接到 Gateway **WebSocket** 的伴随设备（macOS/iOS/Android/无头），以 `role: "node"` 连接并通过 `node.invoke` 提供命令面（例如 `canvas.*`、`camera.*`、`system.*`）。协议细节见：[Gateway protocol](/gateway/protocol)。

旧版传输：[Bridge protocol](/gateway/bridge-protocol)（TCP JSONL；已弃用/已移除）。

macOS 也可运行在**节点模式**：菜单栏应用连接到 Gateway 的 WS 服务器，并将本地 canvas/camera 命令暴露为节点（使 `moltbot nodes …` 可以作用于这台 Mac）。

说明：
- 节点是**外设**，不是 gateway。它们不运行 gateway 服务。
- Telegram/WhatsApp 等消息落在**gateway**，不在节点。

## 配对与状态

**WS 节点使用设备配对。** 节点在 `connect` 时提供设备身份；Gateway 为 `role: node` 创建设备配对请求。通过 devices CLI（或 UI）批准。

快捷 CLI：

```bash
moltbot devices list
moltbot devices approve <requestId>
moltbot devices reject <requestId>
moltbot nodes status
moltbot nodes describe --node <idOrNameOrIp>
```

说明：
- `nodes status` 会在设备配对角色包含 `node` 时标记为**已配对**。
- `node.pair.*`（CLI：`moltbot nodes pending/approve/reject`）是独立的 gateway 侧节点配对存储，不会阻断 WS `connect` 握手。

## 远程节点主机（system.run）

当你的 Gateway 在一台机器上、而命令需要在另一台机器上执行时，使用**节点主机**。模型仍与**gateway**对话；当选择 `host=node` 时，gateway 将 `exec` 调用转发到**节点主机**。

### 哪些内容运行在哪
- **Gateway 主机**：接收消息、运行模型、路由工具调用。
- **节点主机**：在节点机器上执行 `system.run`/`system.which`。
- **审批**：在节点主机上通过 `~/.clawdbot/exec-approvals.json` 强制执行。

### 启动节点主机（前台）

在节点机器上：

```bash
moltbot node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 启动节点主机（服务）

```bash
moltbot node install --host <gateway-host> --port 18789 --display-name "Build Node"
moltbot node restart
```

### 配对与命名

在 gateway 主机上：

```bash
moltbot nodes pending
moltbot nodes approve <requestId>
moltbot nodes list
```

命名方式：
- 在 `moltbot node run` / `moltbot node install` 使用 `--display-name`（保存在节点的 `~/.clawdbot/node.json`）。
- `moltbot nodes rename --node <id|name|ip> --name "Build Node"`（gateway 侧覆盖）。

### 为命令设置 allowlist

Exec 审批是**按节点主机**生效的。可从 gateway 添加 allowlist 条目：

```bash
moltbot approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
moltbot approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

审批文件存储在节点主机 `~/.clawdbot/exec-approvals.json`。

### 将 exec 指向节点

配置默认值（gateway 配置）：

```bash
moltbot config set tools.exec.host node
moltbot config set tools.exec.security allowlist
moltbot config set tools.exec.node "<id-or-name>"
```

或按会话：

```
/exec host=node security=allowlist node=<id-or-name>
```

设置后，任何 `host=node` 的 `exec` 调用都会在节点主机上运行（受节点 allowlist/审批限制）。

相关：
- [Node host CLI](/cli/node)
- [Exec tool](/tools/exec)
- [Exec approvals](/tools/exec-approvals)

## 调用命令

低层调用（原始 RPC）：

```bash
moltbot nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

对于常见的“给 agent 一个 MEDIA 附件”的工作流，存在更高层的 CLI helper。

## 截图（canvas 快照）

如果节点正在显示 Canvas（WebView），`canvas.snapshot` 返回 `{ format, base64 }`。

CLI helper（写入临时文件并输出 `MEDIA:<path>`）：

```bash
moltbot nodes canvas snapshot --node <idOrNameOrIp> --format png
moltbot nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### Canvas 控制

```bash
moltbot nodes canvas present --node <idOrNameOrIp> --target https://example.com
moltbot nodes canvas hide --node <idOrNameOrIp>
moltbot nodes canvas navigate https://example.com --node <idOrNameOrIp>
moltbot nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

说明：
- `canvas present` 接受 URL 或本地文件路径（`--target`），并支持 `--x/--y/--width/--height` 进行定位。
- `canvas eval` 支持内联 JS（`--js`）或位置参数。

### A2UI（Canvas）

```bash
moltbot nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
moltbot nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
moltbot nodes canvas a2ui reset --node <idOrNameOrIp>
```

说明：
- 仅支持 A2UI v0.8 JSONL（v0.9/createSurface 会被拒绝）。

## 照片与视频（节点相机）

照片（`jpg`）：

```bash
moltbot nodes camera list --node <idOrNameOrIp>
moltbot nodes camera snap --node <idOrNameOrIp>            # 默认：前后摄各一张（2 条 MEDIA）
moltbot nodes camera snap --node <idOrNameOrIp> --facing front
```

视频片段（`mp4`）：

```bash
moltbot nodes camera clip --node <idOrNameOrIp> --duration 10s
moltbot nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

说明：
- `canvas.*` 与 `camera.*` 需要节点**前台**（后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段时长会被限制（当前 `<= 60s`），避免过大的 base64 载荷。
- Android 会在可能时提示 `CAMERA`/`RECORD_AUDIO` 权限；被拒绝会返回 `*_PERMISSION_REQUIRED`。

## 录屏（节点）

节点暴露 `screen.record`（mp4）。示例：

```bash
moltbot nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
moltbot nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

说明：
- `screen.record` 要求节点应用在前台。
- Android 会在录制前弹出系统录屏提示。
- 录屏时长限制为 `<= 60s`。
- `--no-audio` 禁用麦克风采集（iOS/Android 支持；macOS 使用系统捕获音频）。
- 多屏场景可用 `--screen <index>` 选择显示器。

## 位置（节点）

当在设置中启用 Location 时，节点会暴露 `location.get`。

CLI helper：

```bash
moltbot nodes location get --node <idOrNameOrIp>
moltbot nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

说明：
- Location **默认关闭**。
- “Always” 需要系统权限；后台获取为尽力而为。
- 响应包含经纬度、精度（米）与时间戳。

## SMS（Android 节点）

当用户授予 **SMS** 权限且设备支持蜂窝通信时，Android 节点可暴露 `sms.send`。

低层调用：

```bash
moltbot nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from Moltbot"}'
```

说明：
- 必须在 Android 设备上接受权限提示后，能力才会被广播。
- 仅 Wi‑Fi 的设备若无蜂窝功能，不会暴露 `sms.send`。

## 系统命令（节点主机 或 mac 节点）

macOS 节点暴露 `system.run`、`system.notify`、`system.execApprovals.get/set`。
无头节点主机暴露 `system.run`、`system.which`、`system.execApprovals.get/set`。

示例：

```bash
moltbot nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
moltbot nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

说明：
- `system.run` 返回 stdout/stderr/exit code。
- `system.notify` 受 macOS 应用的通知权限影响。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout`、`--needs-screen-recording`。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 与 `--delivery <system|overlay|auto>`。
- macOS 节点会丢弃 `PATH` 覆盖；无头节点主机仅在 `PATH` 前置节点主机 PATH 时接受。
- 在 macOS 节点模式下，`system.run` 由 macOS 应用的 exec 审批门控（Settings → Exec approvals）。
  Ask/allowlist/full 的行为与无头节点主机相同；被拒绝时返回 `SYSTEM_RUN_DENIED`。
- 在无头节点主机上，`system.run` 由 `~/.clawdbot/exec-approvals.json` 门控。

## Exec 节点绑定

当可用节点有多个时，可把 exec 绑定到指定节点。
这会设置 `exec host=node` 的默认节点（可按 agent 覆盖）。

全局默认：

```bash
moltbot config set tools.exec.node "node-id-or-name"
```

按 agent 覆盖：

```bash
moltbot config get agents.list
moltbot config set agents.list[0].tools.exec.node "node-id-or-name"
```

取消绑定以允许任意节点：

```bash
moltbot config unset tools.exec.node
moltbot config unset agents.list[0].tools.exec.node
```

## 权限映射

节点可在 `node.list` / `node.describe` 中包含 `permissions` 映射，按权限名（例如 `screenRecording`、`accessibility`）提供布尔值（`true` = 已授予）。

## 无头节点主机（跨平台）

Moltbot 可以运行**无头节点主机**（无 UI），连接 Gateway WebSocket 并暴露 `system.run` / `system.which`。这适合 Linux/Windows，或在服务器旁运行一个最小节点。

启动：

```bash
moltbot node run --host <gateway-host> --port 18789
```

说明：
- 仍然需要配对（Gateway 会显示节点审批提示）。
- 节点主机将 node id、token、显示名与 gateway 连接信息存储于 `~/.clawdbot/node.json`。
- Exec 审批在本地通过 `~/.clawdbot/exec-approvals.json` 强制执行（见 [Exec approvals](/tools/exec-approvals)）。
- 在 macOS 上，无头节点主机在可用时优先使用伴侣应用的 exec host；若应用不可用则回退本地执行。设置 `CLAWDBOT_NODE_EXEC_HOST=app` 可强制要求应用，或设置 `CLAWDBOT_NODE_EXEC_FALLBACK=0` 禁用回退。
- 当 Gateway WS 使用 TLS 时，添加 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用作为节点连接到 Gateway WS 服务器（使 `moltbot nodes …` 可作用于此 Mac）。
- 远程模式下，应用会为 Gateway 端口打开 SSH 隧道并连接到 `localhost`。
