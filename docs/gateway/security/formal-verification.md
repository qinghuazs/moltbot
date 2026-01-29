---
title: 形式化验证（安全模型）
summary: Moltbot 高风险路径的机器校验安全模型。
permalink: /security/formal-verification/
---

# 形式化验证（安全模型）

本页追踪 Moltbot 的 **形式化安全模型**（当前为 TLA+/TLC；后续按需扩展）。

> 注意：部分旧链接可能仍使用之前的项目名。

**目标（北极星）：** 在明确假设下，给出机器校验的论证，说明 Moltbot 按预期安全策略运行（授权、会话隔离、工具门控、误配置安全）。

**这是什么（当前）：** 一个可执行、以攻击者视角驱动的 **安全回归测试套件**：
- 每个主张都有可运行的有限状态空间模型检查。
- 许多主张配有 **负向模型**，可生成现实 bug 类别的反例轨迹。

**这还不是什么：** 不是“所有方面都安全”的证明，也不是 TypeScript 实现完全正确的证明。

## 模型仓库位置

模型维护在独立仓库：[vignesh07/clawdbot-formal-models](https://github.com/vignesh07/clawdbot-formal-models)。

## 重要限制

- 这些是 **模型**，不是完整 TypeScript 实现；模型与代码可能存在漂移。
- 结果受 TLC 探索的状态空间限制；“绿色”并不意味着超出建模假设与范围的安全性。
- 部分主张依赖明确的环境假设（如正确部署、正确输入配置）。

## 复现结果

当前复现方式是本地克隆模型仓库并运行 TLC（见下文）。未来可能提供：
- CI 运行并发布产物（反例轨迹、运行日志）
- 用于小范围检查的托管“运行模型”流程

开始方式：

```bash
git clone https://github.com/vignesh07/clawdbot-formal-models
cd clawdbot-formal-models

# 需要 Java 11+（TLC 运行在 JVM 上）。
# 仓库包含固定版本的 `tla2tools.jar`（TLA+ 工具）并提供 `bin/tlc` + Make 目标。

make <target>
```

### Gateway 暴露与开放网关误配置

**主张：** 超出 loopback 绑定且无认证会导致远程攻破可能/暴露增加；token/password 可阻止未授权攻击者（在模型假设下）。

- 绿色运行：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 红色（预期）：
  - `make gateway-exposure-v2-negative`

另见：模型仓库的 `docs/gateway-exposure-matrix.md`。

### Nodes.run 流水线（最高风险能力）

**主张：** `nodes.run` 需要 (a) 节点命令 allowlist + 声明命令，且 (b) 配置了实时审批时必须审批；审批使用 token 化以防重放（在模型中）。

- 绿色运行：
  - `make nodes-pipeline`
  - `make approvals-token`
- 红色（预期）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配对存储（DM 门控）

**主张：** 配对请求遵守 TTL 与待处理请求上限。

- 绿色运行：
  - `make pairing`
  - `make pairing-cap`
- 红色（预期）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入站门控（提及 + 控制命令绕过）

**主张：** 在需要提及的群场景中，未授权的“控制命令”不能绕过提及门控。

- 绿色：
  - `make ingress-gating`
- 红色（预期）：
  - `make ingress-gating-negative`

### 路由/会话键隔离

**主张：** 不同私信发起者不会合并到同一会话，除非明确链接/配置。

- 绿色：
  - `make routing-isolation`
- 红色（预期）：
  - `make routing-isolation-negative`


## v1++：额外有界模型（并发、重试、轨迹正确性）

这些后续模型提高对真实世界故障模式的逼真度（非原子更新、重试、消息扇出）。

### 配对存储并发 / 幂等性

**主张：** 配对存储在交错并发下仍应强制 `MaxPending` 与幂等性（即 “检查后写入” 必须原子/加锁；刷新不应产生重复）。

含义：
- 并发请求下，不能超过渠道的 `MaxPending`。
- 对同一 `(channel, sender)` 的重复请求/刷新不应产生重复的待处理记录。

- 绿色运行：
  - `make pairing-race`（原子/加锁的上限检查）
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 红色（预期）：
  - `make pairing-race-negative`（非原子 begin/commit 上限竞争）
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入站轨迹关联 / 幂等性

**主张：** 入站处理应在扇出时保持轨迹关联，并在 provider 重试时保持幂等。

含义：
- 一个外部事件变成多个内部消息时，每部分保持相同 trace/event 身份。
- 重试不会导致重复处理。
- 若 provider 事件 ID 缺失，去重应回退到安全 key（如 trace ID），以避免丢弃不同事件。

- 绿色：
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- 红色（预期）：
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### 路由 dmScope 优先级 + identityLinks

**主张：** 路由默认保持 DM 会话隔离，仅在明确配置时合并（按渠道优先级 + identity links）。

含义：
- 渠道级 dmScope 覆盖必须优先于全局默认。
- identityLinks 只能在明确的链接组内合并，而不是跨不相关 peers。

- 绿色：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 红色（预期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`
