---
summary: "通过 SSH 隧道与 tailnet 的远程访问（Gateway WS）"
read_when:
  - 运行或排查远程网关配置
---
# 远程访问（SSH、隧道与 tailnet）

本仓库通过在专用主机（桌面机/服务器）上运行单一 Gateway（主实例），并让客户端连接它，来支持“通过 SSH 远程”。

- 对 **operator（你 / macOS 应用）**：SSH 隧道是通用兜底方案。
- 对 **node（iOS/Android 与未来设备）**：连接 Gateway **WebSocket**（按需用 LAN/tailnet 或 SSH 隧道）。

## 核心思路

- Gateway WebSocket 绑定在 **loopback** 端口（默认 18789）。
- 远程使用时，把该 loopback 端口通过 SSH 转发（或用 tailnet/VPN 减少隧道需求）。

## 常见 VPN/tailnet 方案（agent 所在位置）

把 **Gateway 主机** 视为“agent 所在地”。它拥有会话、认证配置、渠道和状态。
你的笔记本/台式机（以及 nodes）连接到这台主机。

### 1）tailnet 内常驻 Gateway（VPS 或家庭服务器）

在持久在线主机上运行 Gateway，通过 **Tailscale** 或 SSH 访问。

- **最佳体验：** 保持 `gateway.bind: "loopback"`，并用 **Tailscale Serve** 提供 Control UI。
- **兜底：** 保持 loopback + 从需要访问的机器建立 SSH 隧道。
- **示例：** [exe.dev](/platforms/exe-dev)（轻量 VM）或 [Hetzner](/platforms/hetzner)（生产 VPS）。

适用于笔记本经常休眠但又希望 agent 常驻的场景。

### 2）家用台式机运行 Gateway，笔记本远程控制

笔记本 **不** 运行 agent，只远程连接：

- 使用 macOS 应用的 **SSH 远程模式**（设置 → 通用 → “Moltbot runs”）。
- 应用会打开并管理隧道，因此 WebChat + 健康检查都能“即用”。

Runbook: [macOS remote access](/platforms/mac/remote)。

### 3）笔记本运行 Gateway，其他机器远程访问

保持 Gateway 本地运行，但安全暴露：

- 从其他机器 SSH 隧道到笔记本，或
- 用 Tailscale Serve 提供 Control UI，并保持 Gateway 仅 loopback。

指南： [Tailscale](/gateway/tailscale) 与 [Web 概览](/web)。

## 命令流转（哪些地方跑什么）

单一 gateway 服务拥有状态 + 渠道，nodes 是外设。

流转示例（Telegram → node）：
- Telegram 消息到达 **Gateway**。
- Gateway 运行 **agent**，决定是否调用 node 工具。
- Gateway 通过 Gateway WebSocket（`node.*` RPC）调用 **node**。
- Node 返回结果，Gateway 回写到 Telegram。

说明：
- **Nodes 不运行 gateway 服务。** 除非你刻意运行隔离配置，否则每台主机应只有一个 gateway（见 [多个网关](/gateway/multiple-gateways)）。
- macOS 应用的“node 模式”只是通过 Gateway WebSocket 的 node 客户端。

## SSH 隧道（CLI + 工具）

建立本地到远端 Gateway WS 的隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

隧道建立后：
- `moltbot health` 与 `moltbot status --deep` 会通过 `ws://127.0.0.1:18789` 访问远端网关。
- `moltbot gateway {status,health,send,agent,call}` 也可在需要时用 `--url` 指向转发地址。

注意：把 `18789` 替换为你配置的 `gateway.port`（或 `--port`/`CLAWDBOT_GATEWAY_PORT`）。

## CLI 远程默认值

你可以持久化远程目标，让 CLI 命令默认使用它：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://127.0.0.1:18789",
      token: "your-token"
    }
  }
}
```

当 gateway 仅绑定 loopback 时，请保持 URL 为 `ws://127.0.0.1:18789` 并先建立 SSH 隧道。

## 通过 SSH 使用 Chat UI

WebChat 不再使用独立 HTTP 端口。SwiftUI 聊天界面直接连接 Gateway WebSocket。

- 通过 SSH 转发 `18789`（见上文），然后让客户端连接 `ws://127.0.0.1:18789`。
- 在 macOS 上，优先使用应用的“SSH 远程模式”，它会自动管理隧道。

## macOS 应用的 SSH 远程模式

macOS 菜单栏应用可端到端驱动同一套流程（远程状态检查、WebChat、语音唤醒转发）。

Runbook: [macOS remote access](/platforms/mac/remote)。

## 安全规则（远程/VPN）

简版：**除非确认需要，否则保持 Gateway 仅 loopback。**

- **Loopback + SSH/Tailscale Serve** 是最安全的默认方案（不对公网暴露）。
- **非 loopback 绑定**（`lan`/`tailnet`/`custom`，或在 loopback 不可用时的 `auto`）必须使用认证令牌或密码。
- `gateway.remote.token` **只** 用于远程 CLI 调用 — **不会** 启用本地认证。
- `gateway.remote.tlsFingerprint` 用于在 `wss://` 时固定远端 TLS 证书。
- **Tailscale Serve** 可在 `gateway.auth.allowTailscale: true` 时通过身份头认证。
  若希望改用令牌/密码，请设为 `false`。
- 将浏览器控制视为 operator 访问：仅 tailnet + 谨慎的 node 配对。

深入阅读：[Security](/gateway/security)。
