---
summary: "用于 Gateway 仪表盘的 Tailscale Serve/Funnel 集成"
read_when:
  - 将 Gateway Control UI 暴露到 localhost 之外
  - 自动化 tailnet 或公网仪表盘访问
---
# Tailscale（Gateway 仪表盘）

Moltbot 可自动配置 Tailscale **Serve**（tailnet）或 **Funnel**（公网）用于 Gateway 仪表盘与 WebSocket 端口。这样 Gateway 仍绑定在 loopback，同时由 Tailscale 提供 HTTPS、路由与（Serve 模式下的）身份头。

## 模式

- `serve`：通过 `tailscale serve` 的 tailnet-only Serve。Gateway 保持 `127.0.0.1`。
- `funnel`：通过 `tailscale funnel` 的公网 HTTPS。Moltbot 要求共享密码。
- `off`：默认（不自动化 Tailscale）。

## 认证

设置 `gateway.auth.mode` 控制握手：

- `token`（设置了 `CLAWDBOT_GATEWAY_TOKEN` 时默认）
- `password`（通过 `CLAWDBOT_GATEWAY_PASSWORD` 或配置共享密钥）

当 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 为 `true` 时，
有效的 Serve 代理请求可通过 Tailscale 身份头（`tailscale-user-login`）认证，
无需 token/password。Moltbot 通过本地 Tailscale 守护进程（`tailscale whois`）解析
`x-forwarded-for` 并与 header 匹配后才接受请求。Moltbot 仅在请求来自 loopback
且带有 Tailscale 注入的 `x-forwarded-for`、`x-forwarded-proto`、`x-forwarded-host`
头时，才视为 Serve。
若要强制显式凭据，设置 `gateway.auth.allowTailscale: false` 或强制
`gateway.auth.mode: "password"`。

## 配置示例

### Tailnet-only（Serve）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" }
  }
}
```

打开：`https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

### Tailnet-only（绑定到 Tailnet IP）

当你希望 Gateway 直接监听 Tailnet IP（不使用 Serve/Funnel）时使用。

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" }
  }
}
```

从其他 Tailnet 设备连接：
- Control UI：`http://<tailscale-ip>:18789/`
- WebSocket：`ws://<tailscale-ip>:18789`

注意：此模式下 loopback（`http://127.0.0.1:18789`）**不可用**。

### 公网（Funnel + 共享密码）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" }
  }
}
```

请优先使用 `CLAWDBOT_GATEWAY_PASSWORD`，避免把密码写进磁盘。

## CLI 示例

```bash
moltbot gateway --tailscale serve
moltbot gateway --tailscale funnel --auth password
```

## 说明

- Tailscale Serve/Funnel 需要安装并登录 `tailscale` CLI。
- `tailscale.mode: "funnel"` 若 auth 不是 `password` 将拒绝启动，以避免公网暴露。
- 若希望 Moltbot 在退出时撤销 `tailscale serve` 或 `tailscale funnel` 配置，设置 `gateway.tailscale.resetOnExit`。
- `gateway.bind: "tailnet"` 是直接绑定 Tailnet（无 HTTPS、无 Serve/Funnel）。
- `gateway.bind: "auto"` 优先 loopback；若想 Tailnet-only，请用 `tailnet`。
- Serve/Funnel 仅暴露 **Gateway control UI + WS**。节点连接同一 Gateway WS 端点，因此 Serve 也可用于节点访问。

## 浏览器控制（远程 Gateway + 本地浏览器）

若 Gateway 在一台机器而浏览器在另一台机器，请在浏览器机器上运行 **node host** 并保持同一 tailnet。
Gateway 会代理浏览器动作；无需额外控制服务器或 Serve URL。

浏览器控制不要使用 Funnel；将节点配对视为 operator 访问。

## Tailscale 前置条件 + 限制

- Serve 需要 tailnet 已启用 HTTPS；CLI 会提示开启。
- Serve 注入 Tailscale 身份头；Funnel 不会。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、HTTPS 启用，以及 funnel 节点属性。
- Funnel 仅支持 `443`、`8443`、`10000` 端口的 TLS。
- macOS 上的 Funnel 需要开源版 Tailscale 应用。

## 了解更多

- Tailscale Serve 概览：https://tailscale.com/kb/1312/serve
- `tailscale serve` 命令：https://tailscale.com/kb/1242/tailscale-serve
- Tailscale Funnel 概览：https://tailscale.com/kb/1223/tailscale-funnel
- `tailscale funnel` 命令：https://tailscale.com/kb/1311/tailscale-funnel
