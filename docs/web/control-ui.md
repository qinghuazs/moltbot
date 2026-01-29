---
summary: "Gateway 的浏览器控制台（聊天、节点、配置）"
read_when:
  - 你想通过浏览器操作 Gateway
  - 你想在无需 SSH 隧道的情况下通过 Tailnet 访问
---
# Control UI（浏览器）

Control UI 是由 Gateway 提供的一个小型 **Vite + Lit** 单页应用：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/moltbot`）

它**直接**与同端口的 Gateway WebSocket 通信。

## 快速打开（本地）

如果 Gateway 与浏览器在同一台电脑上，打开：

- http://127.0.0.1:18789/（或 http://localhost:18789/）

如果页面加载失败，请先启动 Gateway：`moltbot gateway`。

认证在 WebSocket 握手中传递：
- `connect.params.auth.token`
- `connect.params.auth.password`
仪表盘设置面板可存 token；password 不会持久化。
引导向导默认会生成 gateway token，首次连接时请粘贴。

## 现在能做什么
- 通过 Gateway WS 与模型聊天（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）
- 在聊天中流式显示工具调用与实时输出卡片（agent 事件）
- 渠道：WhatsApp/Telegram/Discord/Slack + 插件渠道（Mattermost 等）的状态、二维码登录与按渠道配置（`channels.status`、`web.login.*`、`config.patch`）
- 实例：presence 列表与刷新（`system-presence`）
- 会话：列表与按会话的 thinking/verbose 覆盖（`sessions.list`、`sessions.patch`）
- Cron：列表/新增/运行/启用/禁用 + 运行历史（`cron.*`）
- 技能：状态、启用/禁用、安装、API key 更新（`skills.*`）
- 节点：列表与能力（`node.list`）
- Exec 审批：编辑 gateway 或 node allowlist + 查询 `exec host=gateway/node` 的策略（`exec.approvals.*`）
- 配置：查看/编辑 `~/.clawdbot/moltbot.json`（`config.get`、`config.set`）
- 配置：验证后应用并重启（`config.apply`），并唤醒最近活跃会话
- 配置写入包含 base-hash 保护，避免覆盖并发修改
- 配置 schema 与表单渲染（`config.schema`，含插件与渠道 schema）；Raw JSON 编辑器仍可用
- 调试：status/health/models 快照 + 事件日志 + 手动 RPC（`status`、`health`、`models.list`）
- 日志：gateway 文件日志的实时 tail（带过滤/导出）（`logs.tail`）
- 更新：运行包/源码更新并重启（`update.run`），含重启报告

## 聊天行为

- `chat.send` **非阻塞**：立即 ack `{ runId, status: "started" }`，响应通过 `chat` 事件流式返回。
- 使用相同 `idempotencyKey` 重发时，运行中返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
- `chat.inject` 向会话转录追加一条助手注记并广播 `chat` 事件，仅用于 UI 更新（不运行 agent，不投递到渠道）。
- 停止：
  - 点击 **Stop**（调用 `chat.abort`）
  - 输入 `/stop`（或 `stop|esc|abort|wait|exit|interrupt`）进行带外中止
  - `chat.abort` 支持 `{ sessionKey }`（无 `runId`）以终止该会话的所有运行

## Tailnet 访问（推荐）

### 集成 Tailscale Serve（首选）

保持 Gateway 在 loopback，让 Tailscale Serve 以 HTTPS 代理：

```bash
moltbot gateway --tailscale serve
```

打开：
- `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

默认情况下，Serve 请求可通过 Tailscale 身份头（`tailscale-user-login`）进行认证，当 `gateway.auth.allowTailscale` 为 `true`。
Moltbot 会通过 `tailscale whois` 解析 `x-forwarded-for` 地址并与头部匹配，并且仅在请求命中 loopback 且带有 Tailscale 的 `x-forwarded-*` 头时接受。若希望即便在 Serve 流量中也要求 token/password，请设置 `gateway.auth.allowTailscale: false`（或强制 `gateway.auth.mode: "password"`）。

### 绑定 tailnet + token

```bash
moltbot gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

打开：
- `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

在 UI 设置中粘贴 token（作为 `connect.params.auth.token` 发送）。

## 不安全的 HTTP

如果你通过纯 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表盘，浏览器运行在**非安全上下文**并会阻止 WebCrypto。默认情况下，Moltbot **会阻止**没有设备身份的 Control UI 连接。

**推荐修复：** 使用 HTTPS（Tailscale Serve）或本地打开：
- `https://<magicdns>/`（Serve）
- `http://127.0.0.1:18789/`（gateway 主机）

**降级示例（HTTP 仅 token）：**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" }
  }
}
```

这会禁用 Control UI 的设备身份与配对（即便是 HTTPS）。仅在你信任网络时使用。

HTTPS 设置指南见 [Tailscale](/gateway/tailscale)。

## 构建 UI

Gateway 从 `dist/control-ui` 提供静态文件。构建命令：

```bash
pnpm ui:build # 首次运行会自动安装 UI 依赖
```

可选绝对 base（当你需要固定资源 URL）：

```bash
CLAWDBOT_CONTROL_UI_BASE_PATH=/moltbot/ pnpm ui:build
```

本地开发（单独 dev server）：

```bash
pnpm ui:dev # 首次运行会自动安装 UI 依赖
```

然后把 UI 指向你的 Gateway WS URL（如 `ws://127.0.0.1:18789`）。

## 调试与测试：dev server + 远程 Gateway

Control UI 是静态文件；WebSocket 目标可配置，并可与 HTTP origin 不同。这在你想本地运行 Vite dev server 但 Gateway 在别处时很有用。

1) 启动 UI dev server：`pnpm ui:dev`
2) 打开如下 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可选的一次性认证（如需）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789&token=<gateway-token>
```

说明：
- `gatewayUrl` 在加载后写入 localStorage，并从 URL 中移除。
- `token` 存入 localStorage；`password` 只保存在内存中。
- 当 Gateway 位于 TLS 后面（Tailscale Serve、HTTPS 代理等）时使用 `wss://`。

远程访问设置详见：[Remote access](/gateway/remote)。
