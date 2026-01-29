---
summary: "Gateway 仪表盘（Control UI）的访问与认证"
read_when:
  - 修改仪表盘认证或暴露方式
---
# 仪表盘（Control UI）

Gateway 仪表盘是默认在 `/` 提供的浏览器 Control UI
（可用 `gateway.controlUi.basePath` 覆盖）。

快速打开（本地 Gateway）：
- http://127.0.0.1:18789/（或 http://localhost:18789/）

关键参考：
- [Control UI](/web/control-ui) 了解使用与功能。
- [Tailscale](/gateway/tailscale) 了解 Serve/Funnel 自动化。
- [Web surfaces](/web) 了解绑定方式与安全说明。

认证在 WebSocket 握手阶段通过 `connect.params.auth` 执行（token 或 password）。
`gateway.auth` 详见 [Gateway configuration](/gateway/configuration)。

安全提示：Control UI 是**管理员入口**（聊天、配置、exec 审批）。不要公开暴露。
UI 在首次加载后把 token 存入 `localStorage`。优先使用 localhost、Tailscale Serve 或 SSH 隧道。

## 快速路径（推荐）

- 引导完成后，CLI 会自动用 token 打开仪表盘，并打印同样的带 token 链接。
- 随时重开：`moltbot dashboard`（复制链接、尽量打开浏览器；无头时显示 SSH 提示）。
- token 仅在查询参数中传递；UI 在首次加载后移除并保存到 localStorage。

## Token 基础（本地与远程）

- **Localhost**：打开 `http://127.0.0.1:18789/`。如果看到 “unauthorized”，运行 `moltbot dashboard` 并使用带 token 链接（`?token=...`）。
- **Token 来源**：`gateway.auth.token`（或 `CLAWDBOT_GATEWAY_TOKEN`）；UI 首次加载后会保存。
- **非 localhost**：使用 Tailscale Serve（若 `gateway.auth.allowTailscale: true` 则无 token）、tailnet 绑定 + token，或 SSH 隧道。见 [Web surfaces](/web)。

## 如果看到 “unauthorized” 或 1008

- 运行 `moltbot dashboard` 获取新的带 token 链接。
- 确认 gateway 可达（本地：`moltbot status`；远程：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 后打开 `http://127.0.0.1:18789/?token=...`）。
- 在仪表盘设置中粘贴与 `gateway.auth.token`（或 `CLAWDBOT_GATEWAY_TOKEN`）一致的 token。
