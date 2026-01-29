---
summary: "Bridge 协议（遗留节点）：TCP JSONL、配对、范围化 RPC"
read_when:
  - 构建或排查节点客户端（iOS/Android/macOS 节点模式）
  - 排查配对或 Bridge 认证失败
  - 审计网关暴露的节点表面
---

# Bridge 协议（遗留节点传输）

Bridge 协议是 **遗留** 的节点传输方案（TCP JSONL）。新的节点客户端
应改用统一的 Gateway WebSocket 协议。

如果你在构建运营端或节点客户端，请使用
[Gateway 协议](/gateway/protocol)。

**注意：** 当前 Moltbot 构建已不再包含 TCP bridge 监听器；本文仅用于历史参考。
遗留的 `bridge.*` 配置键不再属于配置 schema。

## 为什么会同时存在两套

- **安全边界**：bridge 只暴露一个小型允许列表，而不是完整的网关 API 表面。
- **配对与节点身份**：节点准入由网关负责，并绑定到每个节点的令牌。
- **发现体验**：节点可以通过局域网的 Bonjour 发现网关，或直接走 tailnet 连接。
- **本地环回 WS**：完整的 WS 控制面默认仅本地可见，除非通过 SSH 隧道。

## 传输层

- TCP，每行一个 JSON 对象（JSONL）。
- 可选 TLS（当 `bridge.tls.enabled` 为 true）。
- 遗留默认监听端口为 `18790`（当前构建不会启动 TCP bridge）。

启用 TLS 时，发现 TXT 记录会包含 `bridgeTls=1` 与
`bridgeTlsSha256`，方便节点对证书进行固定。

## 握手与配对

1) 客户端发送 `hello`，包含节点元数据 + 令牌（若已配对）。  
2) 若未配对，网关回复 `error`（`NOT_PAIRED`/`UNAUTHORIZED`）。  
3) 客户端发送 `pair-request`。  
4) 网关等待审批，然后发送 `pair-ok` 与 `hello-ok`。

`hello-ok` 会返回 `serverName`，并可能包含 `canvasHostUrl`。

## 帧类型

客户端 → 网关：
- `req` / `res`：范围化网关 RPC（chat、sessions、config、health、voicewake、skills.bins）
- `event`：节点信号（语音转写、代理请求、聊天订阅、exec 生命周期）

网关 → 客户端：
- `invoke` / `invoke-res`：节点命令（`canvas.*`、`camera.*`、`screen.record`、
  `location.get`、`sms.send`）
- `event`：订阅会话的聊天更新
- `ping` / `pong`：保活

遗留允许列表的校验曾在 `src/gateway/server-bridge.ts` 中实现（已移除）。

## Exec 生命周期事件

节点可发送 `exec.finished` 或 `exec.denied` 事件，用于上报 system.run 活动。
这些事件会映射为网关中的系统事件。（遗留节点可能仍会发送 `exec.started`。）

负载字段（除注明外均可选）：
- `sessionKey`（必填）：接收系统事件的代理会话。
- `runId`：用于分组的唯一 exec id。
- `command`：原始或格式化的命令字符串。
- `exitCode`、`timedOut`、`success`、`output`：完成信息（仅 finished）。
- `reason`：拒绝原因（仅 denied）。

## Tailnet 使用

- 将 bridge 绑定到 tailnet IP：在 `~/.clawdbot/moltbot.json` 中设置
  `bridge.bind: "tailnet"`。
- 客户端通过 MagicDNS 名称或 tailnet IP 连接。
- Bonjour **不会** 跨网络；需要时使用手动 host/port 或广域 DNS‑SD。

## 版本管理

Bridge 目前为 **隐式 v1**（无 min/max 协商）。预期保持向后兼容；在任何破坏性
变更之前，应先加入 bridge 协议版本字段。
