---
title: Sandbox 与工具策略与 Elevated
summary: "为什么工具被拦截：沙箱运行时、工具允许/拒绝策略与 elevated 执行门槛"
read_when: "遇到 sandbox jail 或看到工具/elevated 被拒时，想知道要改的具体配置键"
status: active
---

# Sandbox 与工具策略与 Elevated

Moltbot 有三类相关但不同的控制：

1. **Sandbox**（`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`）决定 **工具运行在哪里**（Docker 或宿主机）。
2. **工具策略**（`tools.*`、`tools.sandbox.tools.*`、`agents.list[].tools.*`）决定 **哪些工具可用/允许**。
3. **Elevated**（`tools.elevated.*`、`agents.list[].tools.elevated.*`）是 **仅针对 exec 的逃生门**，用于在沙箱中时改为宿主机执行。

## 快速排查

使用 inspector 查看 Moltbot *实际* 在做什么：

```bash
moltbot sandbox explain
moltbot sandbox explain --session agent:main:main
moltbot sandbox explain --agent work
moltbot sandbox explain --json
```

它会打印：
- 实际的沙箱模式/范围/工作区访问
- 当前会话是否处于沙箱（main vs non-main）
- 实际的沙箱工具 allow/deny（以及来源是 agent/global/default）
- elevated 的门控与修复用的 key 路径

## Sandbox：工具运行在哪里

沙箱由 `agents.defaults.sandbox.mode` 控制：
- `"off"`：全部在宿主机运行。
- `"non-main"`：仅非 main 会话走沙箱（群/通道常见“意外”来源）。
- `"all"`：全部走沙箱。

完整矩阵（范围、工作区挂载、镜像）见 [Sandboxing](/gateway/sandboxing)。

### 绑定挂载（安全快速检查）

- `docker.binds` 会 *穿透* 沙箱文件系统：你挂载的内容会以指定模式（`:ro`/`:rw`）出现在容器内。
- 未注明模式时默认读写；对源码/敏感文件优先用 `:ro`。
- `scope: "shared"` 会忽略每个 agent 的 binds（仅全局 binds 生效）。
- 绑定 `/var/run/docker.sock` 等同于把宿主机控制权交给沙箱；仅在明确需要时使用。
- 工作区访问（`workspaceAccess: "ro"`/`"rw"`）与 bind 模式独立。

## 工具策略：哪些工具存在/可调用

两层关键：
- **工具 profile**：`tools.profile` 与 `agents.list[].tools.profile`（基础 allowlist）
- **Provider 工具 profile**：`tools.byProvider[provider].profile` 与 `agents.list[].tools.byProvider[provider].profile`
- **全局/按 agent 工具策略**：`tools.allow`/`tools.deny` 与 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Provider 工具策略**：`tools.byProvider[provider].allow/deny` 与 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱工具策略**（仅在沙箱时生效）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 与 `agents.list[].tools.sandbox.tools.*`

经验规则：
- `deny` 永远优先。
- `allow` 非空时，其他全部视为阻止。
- 工具策略是硬性拦截：`/exec` 不能覆盖被拒的 `exec` 工具。
- `/exec` 只会为授权的发送者改变会话默认值，不授予工具访问。
Provider 工具键既可用 `provider`（如 `google-antigravity`），也可用 `provider/model`（如 `openai/gpt-5.2`）。

### 工具分组（缩写）

工具策略（全局、agent、沙箱）支持 `group:*` 条目展开为多个工具：

```json5
{
  tools: {
    sandbox: {
      tools: {
        allow: ["group:runtime", "group:fs", "group:sessions", "group:memory"]
      }
    }
  }
}
```

可用分组：
- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:moltbot`：所有内置 Moltbot 工具（不含 provider 插件）

## Elevated：仅 exec 的宿主机运行

Elevated **不** 赋予更多工具；它只影响 `exec`。
- 若处于沙箱，`/elevated on`（或 `exec` 传 `elevated: true`）会在宿主机运行（仍可能需要审批）。
- 用 `/elevated full` 可跳过该会话的 exec 审批。
- 若已在宿主机运行，elevated 基本是无操作（仍受门控）。
- Elevated **不** 作用于 skill，也 **不** 覆盖工具 allow/deny。
- `/exec` 与 elevated 分离，只调整授权发送者的会话级 exec 默认值。

门控：
- 启用：`tools.elevated.enabled`（以及可选 `agents.list[].tools.elevated.enabled`）
- 发送者 allowlist：`tools.elevated.allowFrom.<provider>`（以及可选 `agents.list[].tools.elevated.allowFrom.<provider>`）

见 [Elevated Mode](/tools/elevated)。

## 常见 “sandbox jail” 修复

### “Tool X 被 sandbox 工具策略拦截”

修复键（任选）：
- 禁用 sandbox：`agents.defaults.sandbox.mode=off`（或按 agent 的 `agents.list[].sandbox.mode=off`）
- 允许沙箱内工具：
  - 从 `tools.sandbox.tools.deny` 移除（或按 agent 的 `agents.list[].tools.sandbox.tools.deny`）
  - 或加入 `tools.sandbox.tools.allow`（或按 agent allow）

### “我以为是 main，为什么被 sandbox 了？”

在 `"non-main"` 模式下，群/通道键 **不是** main。使用 main 会话键（`sandbox explain` 会显示），或切换到 `"off"`。
