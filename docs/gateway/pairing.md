---
summary: "由 Gateway 管理的节点配对（选项 B），用于 iOS 与远程节点"
read_when:
  - 在无 macOS UI 情况下实现节点配对审批
  - 增加 CLI 的远程节点审批流程
  - 扩展带节点管理的网关协议
---
# Gateway 管理的配对（选项 B）

在 Gateway 管理的配对中，**Gateway** 是允许哪些节点加入的唯一真相。
UI（macOS 应用、未来客户端）只是前端，用于批准或拒绝待处理请求。

**重要：** WS 节点在 `connect` 时使用 **设备配对**（角色 `node`）。
`node.pair.*` 是一套独立的配对存储，**不会** 约束 WS 握手。
只有显式调用 `node.pair.*` 的客户端才走此流程。

## 概念

- **待处理请求**：节点申请加入，需要审批。
- **已配对节点**：已批准且发放了认证 token 的节点。
- **传输**：Gateway WS 端点只转发请求，不决定成员资格。（遗留 TCP bridge 已弃用/移除。）

## 配对流程

1. 节点连接 Gateway WS 并请求配对。
2. Gateway 存储 **待处理请求** 并发出 `node.pair.requested`。
3. 你批准或拒绝请求（CLI 或 UI）。
4. 批准后，Gateway 发放 **新 token**（重新配对会轮换 token）。
5. 节点使用 token 重连，状态变为“已配对”。

待处理请求会在 **5 分钟** 后自动过期。

## CLI 流程（适合无界面）

```bash
moltbot nodes pending
moltbot nodes approve <requestId>
moltbot nodes reject <requestId>
moltbot nodes status
moltbot nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 会显示已配对/已连接节点及其能力。

## API 表面（网关协议）

事件：
- `node.pair.requested` — 新待处理请求创建时发出。
- `node.pair.resolved` — 请求被批准/拒绝/过期时发出。

方法：
- `node.pair.request` — 创建或复用待处理请求。
- `node.pair.list` — 列出待处理 + 已配对节点。
- `node.pair.approve` — 批准待处理请求（发放 token）。
- `node.pair.reject` — 拒绝待处理请求。
- `node.pair.verify` — 校验 `{ nodeId, token }`。

说明：
- `node.pair.request` 对每个节点幂等：重复调用返回同一个待处理请求。
- 批准 **总会** 生成新 token；`node.pair.request` 不会返回 token。
- 请求可包含 `silent: true` 作为自动审批提示。

## 自动审批（macOS 应用）

macOS 应用可在以下条件下尝试 **静默审批**：
- 请求标记了 `silent`，并且
- 应用可用同一用户验证到网关主机的 SSH 连接。

静默审批失败会回退到常规“Approve/Reject”提示。

## 存储（本地、私有）

配对状态存储于 Gateway 状态目录（默认 `~/.clawdbot`）：

- `~/.clawdbot/nodes/paired.json`
- `~/.clawdbot/nodes/pending.json`

如覆盖 `CLAWDBOT_STATE_DIR`，`nodes/` 目录会随之迁移。

安全说明：
- Token 属于机密；请将 `paired.json` 视为敏感文件。
- 轮换 token 需要重新审批（或删除节点条目）。

## 传输行为

- 传输层 **无状态**，不存储成员信息。
- 若 Gateway 离线或禁用配对，节点无法配对。
- 若 Gateway 处于远程模式，配对仍在远程 Gateway 的存储中进行。
