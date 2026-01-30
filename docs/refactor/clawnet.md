---
summary: "Clawnet 重构：统一网络协议、角色、认证、审批与身份"
read_when:
  - 为节点与操作端规划统一网络协议
  - 重新设计跨设备审批、配对、TLS 与在线状态
---
# Clawnet 重构（协议与认证统一）

## Hi
Hi Peter — 方向很好；这会带来更简单的体验和更强的安全性。

## 目的
提供一份严格的单一文档：
- 当前状态：协议、流程与信任边界。
- 痛点：审批、多跳路由、UI 重复。
- 目标状态：单一协议、清晰角色、统一认证与配对、TLS 绑定。
- 身份模型：稳定 ID + 可爱的 slug。
- 迁移计划、风险与未决问题。

## 目标（来自讨论）
- 所有客户端共用一个协议（mac app、CLI、iOS、Android、无界面节点）。
- 所有网络参与者都需认证与配对。
- 角色清晰：节点 vs 操作端。
- 审批集中路由到用户所在位置。
- 所有远程流量使用 TLS 加密 + 可选 pinning。
- 最小化代码重复。
- 同一台机器只显示一次（避免 UI 与 node 重复条目）。

## 非目标（明确）
- 移除能力隔离（仍需最小权限）。
- 在无 scope 校验时暴露完整 gateway 控制面。
- 让认证依赖人类标签（slug 仍非安全要素）。

---

# 当前状态（现有）

## 两套协议

### 1) Gateway WebSocket（控制面）
- 完整 API：配置、渠道、模型、会话、代理运行、日志、节点等。
- 默认绑定：loopback。远程访问通过 SSH 或 Tailscale。
- 认证：`connect` 使用 token 或密码。
- 无 TLS pinning（依赖 loopback 或隧道）。
- 代码：
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Bridge（节点传输）
- 窄允许列表面，节点身份与配对。
- TCP 上 JSONL；可选 TLS + 证书指纹 pinning。
- TLS 在发现 TXT 中广播指纹。
- 代码：
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## 当前控制面客户端
- CLI → Gateway WS（`callGateway`，`src/gateway/call.ts`）。
- macOS app UI → Gateway WS（`GatewayConnection`）。
- Web Control UI → Gateway WS。
- ACP → Gateway WS。
- 浏览器控制使用独立 HTTP 控制服务。

## 当前节点
- macOS app（节点模式）连接 Gateway bridge（`MacNodeBridgeSession`）。
- iOS/Android 连接 Gateway bridge。
- 配对与每节点 token 存储在 gateway。

## 当前审批流程（exec）
- 代理通过 Gateway 调用 `system.run`。
- Gateway 通过 bridge 调用节点。
- 节点运行时决定审批。
- mac app 在节点侧展示 UI。
- 节点返回 `invoke-res` 给 Gateway。
- 多跳，且 UI 绑定到节点主机。

## 当前在线状态与身份
- Gateway WS 客户端产生 presence 条目。
- Bridge 节点产生 presence 条目。
- mac app 可能同一机器显示两条（UI + node）。
- 节点身份存在配对存储；UI 身份独立。

---

# 问题与痛点

- 维护两套协议栈（WS + Bridge）。
- 远程节点审批：提示出现在节点主机，而不是用户当前设备。
- TLS pinning 仅在 bridge；WS 依赖 SSH 或 Tailscale。
- 身份重复：同一机器显示多个实例。
- 角色不清：UI、node、CLI 能力边界不明确。

---

# 目标状态（Clawnet）

## 单一协议，双角色
单一 WS 协议，带角色与 scope。
- **角色：node**（能力主机）
- **角色：operator**（控制面）
- 操作端可选 scope：
  - `operator.read`（状态与查看）
  - `operator.write`（代理运行、发送）
  - `operator.admin`（配置、渠道、模型）

### 角色行为

**Node**
- 注册能力（`caps`、`commands`、permissions）。
- 接收 `invoke` 命令（`system.run`、`camera.*`、`canvas.*`、`screen.record` 等）。
- 发送事件：`voice.transcript`、`agent.request`、`chat.subscribe`。
- 不能调用 config/models/channels/sessions/agent 的控制面 API。

**Operator**
- 控制面 API，受 scope 限制。
- 接收所有审批。
- 不直接执行 OS 动作；通过节点路由。

### 关键规则
角色按连接区分，而非设备。一个设备可分别建立两个角色连接。

---

# 统一认证与配对

## 客户端身份
每个客户端提供：
- `deviceId`（稳定，来自设备密钥）。
- `displayName`（人类名称）。
- `role` + `scope` + `caps` + `commands`。

## 统一配对流程
- 客户端未认证连接。
- Gateway 为该 `deviceId` 创建**配对请求**。
- 操作端收到提示，批准或拒绝。
- Gateway 发行绑定到以下项的凭据：
  - 设备公钥
  - 角色
  - scope
  - capabilities/commands
- 客户端持久化 token 并以认证方式重连。

## 设备绑定认证（避免 Bearer 重放）
优先：设备密钥对。
- 设备生成一次密钥对。
- `deviceId = fingerprint(publicKey)`。
- Gateway 发 nonce；设备签名；Gateway 验证。
- Token 绑定公钥（proof-of-possession），而不是字符串。

替代方案：
- mTLS（客户端证书）：最强，但运维复杂。
- 短期 bearer token 仅作为过渡（轮换 + 提前吊销）。

## 静默审批（SSH 规则）
精确定义以避免弱点，优先选择之一：
- **仅本地**：loopback 或 Unix socket 连接时自动配对。
- **通过 SSH 证明**：gateway 发 nonce，客户端通过 SSH 获取并证明。
- **物理在场窗口**：网关主机 UI 本地批准后，短时间允许自动配对（如 10 分钟）。

所有自动审批都记录并可撤销。

---

# TLS 全面覆盖（开发与生产）

## 复用 bridge TLS
复用现有 TLS 运行时与指纹 pinning：
- `src/infra/bridge/server/tls.ts`
- `src/node-host/bridge-client.ts` 中的指纹校验逻辑

## 应用于 WS
- WS 服务支持 TLS，使用相同证书与指纹。
- WS 客户端可选 pinning。
- 发现中广播 TLS 与指纹，用于所有端点。
  - 发现仅作定位提示，不作为信任根。

## 原因
- 减少对 SSH 或 Tailscale 的保密依赖。
- 让远程移动连接默认安全。

---

# 审批重构（集中式）

## 当前
审批发生在节点主机；提示显示在节点所在机器。

## 目标
审批**由 gateway 托管**，UI 交付给操作端客户端。

### 新流程
1) Gateway 接收 `system.run` 意图（代理）。
2) Gateway 创建审批记录：`approval.requested`。
3) 操作端 UI 弹窗。
4) 审批决策发回 gateway：`approval.resolve`。
5) Gateway 在批准后调用节点命令。
6) 节点执行并返回 `invoke-res`。

### 审批语义（加固）
- 广播给所有操作端；仅活跃 UI 弹 modal，其余显示 toast。
- 首个决策生效；后续决策被拒绝为已处理。
- 默认超时：N 秒后拒绝（如 60s），并记录原因。
- 决策需要 `operator.approvals` scope。

## 益处
- 提示出现在用户所在位置（Mac 或手机）。
- 远程节点审批一致。
- 节点运行时保持无界面，不依赖 UI。

---

# 角色清晰示例

## iPhone app
- **node 角色**：麦克风、相机、语音聊天、位置、按住说话。
- 可选 **operator.read**：状态与聊天视图。
- 可选 **operator.write/admin**：仅在显式开启时启用。

## macOS app
- 默认操作端角色（控制 UI）。
- 启用 “Mac node” 时开启 node 角色（system.run、screen、camera）。
- 同一 deviceId 对应两条连接 -> UI 合并为单条实例。

## CLI
- 始终为操作端角色。
- scope 由子命令决定：
  - `status`、`logs` → read
  - `agent`、`message` → write
  - `config`、`channels` → admin
  - approvals + pairing → `operator.approvals` / `operator.pairing`

---

# 身份与 slug

## 稳定 ID
用于认证，不可变。
推荐：
- 密钥指纹（公钥 hash）。

## 可爱 slug（龙虾主题）
仅人类标签。
- 示例：`scarlet-claw`、`saltwave`、`mantis-pinch`。
- 存于 gateway 注册表，可编辑。
- 冲突处理：`-2`、`-3`。

## UI 分组
同一 `deviceId` 的多角色连接 -> 单条 “Instance” 行：
- 徽章：`operator`、`node`。
- 显示能力与最后在线。

---

# 迁移策略

## 阶段 0：文档与对齐
- 发布本文档。
- 盘点所有协议调用与审批流程。

## 阶段 1：为 WS 添加角色与 scope
- 扩展 `connect` 参数：`role`、`scope`、`deviceId`。
- 对 node 角色添加 allowlist 门控。

## 阶段 2：Bridge 兼容
- Bridge 继续运行。
- 并行增加 WS node 支持。
- 使用配置开关门控。

## 阶段 3：集中审批
- 在 WS 中添加审批请求与决策事件。
- 更新 mac app UI 以提示与响应。
- 节点运行时不再弹 UI。

## 阶段 4：TLS 统一
- 为 WS 增加 TLS 配置，复用 bridge TLS 运行时。
- 为客户端增加 pinning。

## 阶段 5：弃用 bridge
- 将 iOS/Android/mac node 迁移到 WS。
- 保留 bridge 作为兜底，稳定后移除。

## 阶段 6：设备绑定认证
- 对所有非本地连接强制使用密钥身份。
- 添加吊销与轮换 UI。

---

# 安全说明

- 角色与 allowlist 在 gateway 边界强制。
- 没有 operator scope 的客户端不能获得“全量”API。
- 所有连接都必须配对。
- TLS + pinning 降低移动端 MITM 风险。
- SSH 静默审批只是便利功能，仍需记录并可撤销。
- 发现不是信任根。
- 能力声明是 **claim**，由服务端按平台与类型 allowlist 校验。

# Streaming 与大载荷（节点媒体）
控制面 WS 适合小消息，但节点还会处理：
- 相机视频
- 屏幕录制
- 音频流

选项：
1) WS 二进制帧 + 分块 + 背压规则。
2) 独立流式端点（仍 TLS + 认证）。
3) 对媒体重的命令保留 bridge 更久，最后再迁移。

在实现前需选择其一，避免漂移。

# 能力与命令策略
- 节点报告的 caps/commands 视为**声明**。
- Gateway 按平台 allowlist 强制校验。
- 新命令需要操作端审批或显式允许列表变更。
- 变更带时间戳审计。

# 审计与限流
- 记录：配对请求、审批或拒绝、token 签发、轮换与撤销。
- 对配对与审批提示做限流。

# 协议卫生
- 显式协议版本与错误码。
- 重连规则与心跳策略。
- presence TTL 与 last-seen 语义。

---

# 未决问题

1) 单设备双角色：token 模型
   - 建议每角色独立 token（node vs operator）。
   - 同一 deviceId，不同 scope，更易吊销。

2) 操作端 scope 粒度
   - read/write/admin + approvals + pairing（最小可用）。
   - 之后可考虑更细粒度。

3) Token 轮换与吊销体验
   - 角色变更时自动轮换。
   - 提供按 deviceId 与角色的吊销 UI。

4) 发现
   - 扩展现有 Bonjour TXT，加入 WS TLS 指纹与角色提示。
   - 仅作定位提示。

5) 跨网络审批
   - 广播给所有操作端；活跃 UI 弹窗。
   - 首次响应生效；gateway 保证原子性。

---

# 总结（TL;DR）

- 现状：WS 控制面 + Bridge 节点传输。
- 痛点：审批、重复条目、双协议栈。
- 方案：单一 WS 协议，明确角色 + scope，统一配对 + TLS pinning，gateway 托管审批，稳定 deviceId + 可爱 slug。
- 结果：体验更简单，安全更强，重复更少，移动端路由更好。
