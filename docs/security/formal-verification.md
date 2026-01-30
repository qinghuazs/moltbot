---
title: 形式化验证（安全模型）
summary: Moltbot 高风险路径的机器校验安全模型。
permalink: /security/formal-verification/
---

# 形式化验证（安全模型）

本页跟踪 Moltbot 的**形式化安全模型**（目前为 TLA+/TLC，需要时扩展）。

> 说明：一些旧链接可能仍指向之前的项目名。

**目标（北极星）：**在明确假设下，给出一份可被机器验证的论证，证明 Moltbot 按预期执行安全策略（授权、会话隔离、工具门控与配置安全）。

**当前定义：**可执行、以攻击者视角编写的**安全回归套件**：
- 每个主张都有可运行的有限状态模型检查。
- 许多主张有配套的**负向模型**，用于产生真实 bug 类别的反例轨迹。

**尚非：**“Moltbot 在所有方面都安全”的证明，也不是 TypeScript 实现的正确性证明。

## 模型位置

模型维护在独立仓库：[vignesh07/clawdbot-formal-models](https://github.com/vignesh07/clawdbot-formal-models)。

## 重要注意事项

- 这是**模型**，不是完整 TypeScript 实现。模型与代码可能漂移。
- TLC 探索的状态空间有限；即使全绿，也仅在模型假设与边界内成立。
- 部分主张依赖明确的环境假设（如正确部署、正确配置输入）。

## 复现结果

目前的复现方式是本地克隆模型仓库并运行 TLC（见下）。未来可能提供：
- CI 运行模型并公开产物（反例轨迹、运行日志）
- 面向小型有界检查的“点击运行模型”工作流

入门：

```bash
git clone https://github.com/vignesh07/clawdbot-formal-models
cd clawdbot-formal-models

# 需要 Java 11+（TLC 运行在 JVM 上）。
# 该仓库内置固定版本的 `tla2tools.jar`（TLA+ 工具）并提供 `bin/tlc` 与 Make targets。

make <target>
```

### Gateway 暴露与开放网关配置错误

**主张：**绑定到 loopback 之外且无认证会增加远程入侵风险；token 或密码可阻止未授权攻击者（按模型假设）。

- 绿（期望）：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 红（期望）：
  - `make gateway-exposure-v2-negative`

另见：模型仓库中的 `docs/gateway-exposure-matrix.md`。

### Nodes.run 管线（最高风险能力）

**主张：**`nodes.run` 需要 (a) 节点命令允许列表与声明命令，且 (b) 按配置启用实时审批；审批在模型中通过 token 化防重放。

- 绿（期望）：
  - `make nodes-pipeline`
  - `make approvals-token`
- 红（期望）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配对存储（DM 门控）

**主张：**配对请求遵守 TTL 与待处理上限。

- 绿（期望）：
  - `make pairing`
  - `make pairing-cap`
- 红（期望）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入站门控（提及与控制命令绕过）

**主张：**在需要提及的群上下文中，未授权的“控制命令”不能绕过提及门控。

- 绿：
  - `make ingress-gating`
- 红（期望）：
  - `make ingress-gating-negative`

### 路由与会话 key 隔离

**主张：**来自不同 peer 的私聊不会合并到同一会话，除非显式链接或配置。

- 绿：
  - `make routing-isolation`
- 红（期望）：
  - `make routing-isolation-negative`


## v1++：更多有界模型（并发、重试、轨迹正确性）

这些是后续模型，用于覆盖真实故障模式（非原子更新、重试、消息扇出）的保真度。

### 配对存储并发与幂等

**主张：**配对存储即使在交错并发下也要执行 `MaxPending` 与幂等（即“检查再写入”必须原子或锁定，刷新不会产生重复）。

含义：
- 并发请求下不能超过某个渠道的 `MaxPending`。
- 同一 `(channel, sender)` 的重复请求或刷新不应创建重复的待处理条目。

- 绿（期望）：
  - `make pairing-race`（原子或锁定的上限检查）
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 红（期望）：
  - `make pairing-race-negative`（非原子 begin/commit 上限竞态）
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入站轨迹关联与幂等

**主张：**接入层应在扇出时保留轨迹关联，并在 provider 重试下保持幂等。

含义：
- 当一个外部事件变成多条内部消息时，各部分保留相同 trace 或 event 身份。
- 重试不会导致重复处理。
- 若缺失 provider event ID，去重回退到安全 key（如 trace ID），以免误删不同事件。

- 绿：
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- 红（期望）：
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### 路由 dmScope 优先级与 identityLinks

**主张：**路由默认保持 DM 会话隔离，仅在显式配置时合并（渠道优先级 + identity links）。

含义：
- 渠道特定 dmScope 覆盖必须优先于全局默认。
- identityLinks 只能在显式链接组内合并，不能跨无关 peer。

- 绿：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 红（期望）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`
