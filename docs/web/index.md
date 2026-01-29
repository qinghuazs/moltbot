---
summary: "Gateway Web 入口：Control UI 绑定方式与安全"
read_when:
  - 你想通过 Tailscale 访问 Gateway
  - 你需要浏览器 Control UI 与配置编辑
---
# Web（Gateway）

Gateway 从与 WebSocket 相同的端口提供一个小型 **浏览器 Control UI**（Vite + Lit）：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/moltbot`）

功能详见 [Control UI](/web/control-ui)。
本页重点讲绑定方式、安全与 Web 入口。

## Webhooks

当 `hooks.enabled=true` 时，Gateway 会在同一 HTTP 服务器上暴露一个 webhook 端点。
见 [Gateway configuration](/gateway/configuration) → `hooks` 获取认证与 payload 说明。

## 配置（默认开启）

当静态资源存在（`dist/control-ui`）时，Control UI **默认启用**。
可通过配置控制：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/moltbot" } // basePath 可选
  }
}
```

## Tailscale 访问

### 集成 Serve（推荐）

保持 Gateway 绑定 loopback，然后让 Tailscale Serve 代理：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" }
  }
}
```

然后启动 gateway：

```bash
moltbot gateway
```

打开：
- `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

### Tailnet 绑定 + token

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" }
  }
}
```

然后启动 gateway（非 loopback 绑定需要 token）：

```bash
moltbot gateway
```

打开：
- `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

### 公网（Funnel）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" } // 或 CLAWDBOT_GATEWAY_PASSWORD
  }
}
```

## 安全说明

- Gateway 认证默认开启（token/password 或 Tailscale 身份头）。
- 非 loopback 绑定仍**必须**共享 token/password（`gateway.auth` 或环境变量）。
- 向导默认生成 gateway token（即便 loopback）。
- UI 会发送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 在 Serve 模式下，当 `gateway.auth.allowTailscale` 为 `true` 时，Tailscale 身份头可满足认证（无需 token/password）。设置 `gateway.auth.allowTailscale: false` 可强制要求显式凭据。参见 [Tailscale](/gateway/tailscale) 与 [Security](/gateway/security)。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建 UI

Gateway 从 `dist/control-ui` 提供静态文件。构建命令：

```bash
pnpm ui:build # 首次运行会自动安装 UI 依赖
```
