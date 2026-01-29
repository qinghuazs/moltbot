---
summary: "Bonjour/mDNS 发现与调试（Gateway 广播、客户端与常见故障）"
read_when:
  - 排查 macOS/iOS 的 Bonjour 发现问题
  - 变更 mDNS 服务类型、TXT 记录或发现体验
---
# Bonjour / mDNS 发现

Moltbot 使用 Bonjour（mDNS / DNS‑SD）作为 **仅 LAN 的便捷发现** 来寻找活动 Gateway（WebSocket 端点）。它是尽力而为的，**不** 替代 SSH 或 Tailnet 连接。

## 通过 Tailscale 的广域 Bonjour（单播 DNS‑SD）

若节点与网关不在同一网络，多播 mDNS 无法跨越边界。你可以通过 **单播 DNS‑SD**（“Wide‑Area Bonjour”）在 Tailscale 上保持相同发现体验。

高层步骤：

1) 在网关主机上运行 DNS 服务器（通过 Tailnet 可达）。
2) 在独立 zone 下发布 `_moltbot-gw._tcp` 的 DNS‑SD 记录（例：`moltbot.internal.`）。
3) 配置 Tailscale **split DNS**，让客户端（含 iOS）通过该 DNS 服务器解析 `moltbot.internal`。

Moltbot 对该模式统一使用 `moltbot.internal.`。iOS/Android 节点会自动浏览 `local.` 和 `moltbot.internal.`。

### Gateway 配置（推荐）

```json5
{
  gateway: { bind: "tailnet" }, // 仅 tailnet（推荐）
  discovery: { wideArea: { enabled: true } } // 启用 moltbot.internal DNS‑SD 发布
}
```

### 一次性 DNS 服务器设置（网关主机）

```bash
moltbot dns setup --apply
```

它会安装 CoreDNS，并配置：
- 仅在网关的 Tailscale 网卡上监听 53 端口
- 从 `~/.clawdbot/dns/moltbot.internal.db` 提供 `moltbot.internal.`

在 tailnet 机器上验证：

```bash
dns-sd -B _moltbot-gw._tcp moltbot.internal.
dig @<TAILNET_IPV4> -p 53 _moltbot-gw._tcp.clawdbot.internal PTR +short
```

### Tailscale DNS 设置

在 Tailscale 管理后台：

- 添加指向网关 tailnet IP 的 nameserver（UDP/TCP 53）。
- 添加 split DNS，使域名 `moltbot.internal` 走该 nameserver。

客户端接受 tailnet DNS 后，iOS 节点即可在 `moltbot.internal.` 中浏览
`_moltbot-gw._tcp`，无需多播。

### Gateway 监听安全（推荐）

Gateway WS 端口（默认 `18789`）默认绑定在 loopback。若要 LAN/tailnet 访问，请明确绑定并保持认证启用。

针对 tailnet-only：
- 在 `~/.clawdbot/moltbot.json` 设置 `gateway.bind: "tailnet"`。
- 重启 Gateway（或重启 macOS 菜单栏应用）。

## 广播内容

只有 Gateway 会广播 `_moltbot-gw._tcp`。

## 服务类型

- `_moltbot-gw._tcp` — 网关传输 beacon（供 macOS/iOS/Android 节点使用）。

## TXT 键（非机密提示）

Gateway 会广播小型非机密提示，便于 UI 流程：

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>`（Gateway WS + HTTP）
- `gatewayTls=1`（仅在 TLS 启用时）
- `gatewayTlsSha256=<sha256>`（仅在 TLS 启用且有指纹时）
- `canvasPort=<port>`（仅在 canvas host 启用时；默认 `18793`）
- `sshPort=<port>`（未覆盖时默认 22）
- `transport=gateway`
- `cliPath=<path>`（可选：可运行 `moltbot` 入口的绝对路径）
- `tailnetDns=<magicdns>`（可选提示，Tailnet 可用时提供）

## 在 macOS 上调试

内置工具：

- 浏览实例：
  ```bash
  dns-sd -B _moltbot-gw._tcp local.
  ```
- 解析单个实例（替换 `<instance>`）：
  ```bash
  dns-sd -L "<instance>" _moltbot-gw._tcp local.
  ```

若浏览正常但解析失败，通常是 LAN 策略或 mDNS 解析器问题。

## 在 Gateway 日志中调试

Gateway 会写滚动日志文件（启动时打印 `gateway log file: ...`）。重点关注 `bonjour:` 行：

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## 在 iOS 节点上调试

iOS 节点使用 `NWBrowser` 发现 `_moltbot-gw._tcp`。

抓日志：
- 设置 → Gateway → 高级 → **Discovery Debug Logs**
- 设置 → Gateway → 高级 → **Discovery Logs** → 复现 → **Copy**

日志包含浏览器状态转移与结果集变化。

## 常见故障

- **Bonjour 不跨网络**：使用 Tailnet 或 SSH。
- **多播被禁**：某些 Wi‑Fi 会禁用 mDNS。
- **睡眠 / 网卡波动**：macOS 可能暂时丢失 mDNS 结果；重试。
- **浏览正常但解析失败**：保持机器名简单（避免表情或标点），然后重启 Gateway。服务实例名源自主机名，复杂名称可能让解析器出错。

## 转义实例名（`\032`）

Bonjour/DNS‑SD 常用十进制 `\DDD` 转义实例名中的字节（例如空格为 `\032`）。

- 这是协议层面的正常行为。
- UI 应解码显示（iOS 使用 `BonjourEscapes.decode`）。

## 禁用 / 配置

- `CLAWDBOT_DISABLE_BONJOUR=1` 禁用广播。
- `~/.clawdbot/moltbot.json` 中的 `gateway.bind` 控制 Gateway 绑定模式。
- `CLAWDBOT_SSH_PORT` 覆盖 TXT 中广播的 SSH 端口。
- `CLAWDBOT_TAILNET_DNS` 在 TXT 中发布 MagicDNS 提示。
- `CLAWDBOT_CLI_PATH` 覆盖广播的 CLI 路径。

## 相关文档

- 发现策略与传输选择：[Discovery](/gateway/discovery)
- 节点配对与审批：[Gateway pairing](/gateway/pairing)
