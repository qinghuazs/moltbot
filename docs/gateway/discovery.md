---
summary: "用于发现网关的节点发现与传输方式（Bonjour、Tailscale、SSH）"
read_when:
  - 实现或修改 Bonjour 发现/广播
  - 调整远程连接方式（直连 vs SSH）
  - 设计远程节点的发现与配对
---
# 发现与传输方式

Moltbot 有两个表面相似但不同的问题：

1) **Operator 远程控制**：macOS 菜单栏应用控制运行在其他位置的网关。
2) **Node 配对**：iOS/Android（以及未来节点）查找网关并安全配对。

设计目标是把所有网络发现/广播放在 **Node Gateway**（`clawd` / `moltbot gateway`）中，
而让客户端（mac 应用、iOS）作为消费者。

## 术语

- **Gateway**：单一常驻网关进程，拥有状态（会话、配对、节点注册）并运行渠道。多数场景每主机一个；也支持隔离的多网关。
- **Gateway WS（控制面）**：默认 `127.0.0.1:18789` 的 WebSocket 端点；可通过 `gateway.bind` 绑定到 LAN/tailnet。
- **直连 WS 传输**：面向 LAN/tailnet 的 Gateway WS 端点（无需 SSH）。
- **SSH 传输（兜底）**：通过 SSH 转发 `127.0.0.1:18789` 进行远程控制。
- **遗留 TCP bridge（已弃用/移除）**：旧节点传输（见 [Bridge protocol](/gateway/bridge-protocol)），不再用于发现。

协议详情：
- [Gateway protocol](/gateway/protocol)
- [Bridge protocol（遗留）](/gateway/bridge-protocol)

## 为什么同时保留直连与 SSH

- **直连 WS** 在同一网络或 tailnet 中体验最佳：
  - LAN 内通过 Bonjour 自动发现
  - 配对令牌与 ACL 由网关维护
  - 无需 shell 权限；协议表面可保持精简且可审计
- **SSH** 仍是通用兜底：
  - 只要有 SSH 访问就能用（即便跨完全不相关的网络）
  - 规避组播/mDNS 问题
  - 除 SSH 外不需要额外入站端口

## 发现输入（客户端如何知道网关在哪）

### 1）Bonjour / mDNS（仅 LAN）

Bonjour 是尽力而为，不跨网络，仅用于同一 LAN 的便捷发现。

目标方向：
- **网关** 通过 Bonjour 广播 WS 端点。
- 客户端浏览并展示“选择网关”列表，然后保存所选端点。

排障与 beacon 细节见 [Bonjour](/gateway/bonjour)。

#### 服务 beacon 细节

- 服务类型：
  - `_moltbot-gw._tcp`（网关传输 beacon）
- TXT 键（非密钥）：
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22`（或广播的其他端口）
  - `gatewayPort=18789`（Gateway WS + HTTP）
  - `gatewayTls=1`（仅在 TLS 启用时）
  - `gatewayTlsSha256=<sha256>`（仅在 TLS 启用且有指纹时）
  - `canvasPort=18793`（默认 canvas host 端口；提供 `/__moltbot__/canvas/`）
  - `cliPath=<path>`（可选；可运行的 `moltbot` 入口或二进制的绝对路径）
  - `tailnetDns=<magicdns>`（可选提示；检测到 Tailscale 时自动提供）

禁用/覆盖：
- `CLAWDBOT_DISABLE_BONJOUR=1` 禁用广播。
- `~/.clawdbot/moltbot.json` 中的 `gateway.bind` 控制 Gateway 绑定模式。
- `CLAWDBOT_SSH_PORT` 覆盖 TXT 中广播的 SSH 端口（默认 22）。
- `CLAWDBOT_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `CLAWDBOT_CLI_PATH` 覆盖广播的 CLI 路径。

### 2）Tailnet（跨网络）

在跨网场景（如远程地区）中，Bonjour 无法使用。推荐的直连目标为：
- Tailscale MagicDNS 名称（优先）或稳定 tailnet IP。

若网关检测到运行在 Tailscale 下，会发布 `tailnetDns` 作为可选提示（包括广域 beacon）。

### 3）手动 / SSH 目标

当没有直连路由（或直连被禁用）时，客户端总可通过 SSH 转发 loopback 端口连接。

见 [Remote access](/gateway/remote)。

## 传输选择（客户端策略）

推荐客户端行为：

1) 已配置并可达的直连端点则使用。
2) 否则，若 Bonjour 在 LAN 中发现网关，提供“一键使用该网关”的选择并保存为直连端点。
3) 否则，若配置了 tailnet DNS/IP，则尝试直连。
4) 否则，回退到 SSH。

## 配对与认证（直连传输）

网关是节点/客户端准入的唯一真相。

- 配对请求的创建/审批/拒绝都在网关内完成（见 [Gateway pairing](/gateway/pairing)）。
- 网关强制：
  - 认证（token / keypair）
  - scope/ACL（网关不是所有方法的透明代理）
  - 速率限制

## 组件职责

- **Gateway**：广播发现 beacon、做配对决策、托管 WS 端点。
- **macOS 应用**：帮助选择网关、显示配对提示，仅在兜底时使用 SSH。
- **iOS/Android 节点**：以 Bonjour 作为便捷发现方式，连接已配对的 Gateway WS。
