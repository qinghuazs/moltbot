---
summary: "按 agent 的沙箱与工具限制、优先级与示例"
title: 多 agent 沙箱与工具
read_when: "需要多 agent 下的按 agent 沙箱或工具 allow/deny 策略。"
status: active
---

# 多 Agent 沙箱与工具配置

## 概览

多 agent 场景下，每个 agent 可有自己的：
- **沙箱配置**（`agents.list[].sandbox` 覆盖 `agents.defaults.sandbox`）
- **工具限制**（`tools.allow` / `tools.deny`，以及 `agents.list[].tools`）

这让你可以运行不同安全档位的 agent：
- 个人助手（完全访问）
- 家庭/工作 agent（限制工具）
- 面向公众的 agent（沙箱）

`setupCommand` 属于 `sandbox.docker`（全局或按 agent），容器创建时只运行一次。

认证按 agent 隔离：每个 agent 从自己的 `agentDir` 读取 auth store：

```
~/.clawdbot/agents/<agentId>/agent/auth-profiles.json
```

凭据 **不共享**。不要在多个 agent 之间复用 `agentDir`。
若需要共享凭据，请将 `auth-profiles.json` 复制到另一个 agent 的 `agentDir`。

运行时沙箱行为见 [Sandboxing](/gateway/sandboxing)。
排查“为什么被拦截”见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) 和 `moltbot sandbox explain`。

---

## 配置示例

### 示例 1：个人 + 受限家庭 agent

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "name": "Personal Assistant",
        "workspace": "~/clawd",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "family",
        "name": "Family Bot",
        "workspace": "~/clawd-family",
        "sandbox": {
          "mode": "all",
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"]
        }
      }
    ]
  },
  "bindings": [
    {
      "agentId": "family",
      "match": {
        "provider": "whatsapp",
        "accountId": "*",
        "peer": {
          "kind": "group",
          "id": "120363424282127706@g.us"
        }
      }
    }
  ]
}
```

**结果：**
- `main` agent：宿主机运行，完整工具权限
- `family` agent：Docker 内运行（每 agent 一个容器），仅 `read`

---

### 示例 2：共享沙箱的工作 agent

```json
{
  "agents": {
    "list": [
      {
        "id": "personal",
        "workspace": "~/clawd-personal",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "work",
        "workspace": "~/clawd-work",
        "sandbox": {
          "mode": "all",
          "scope": "shared",
          "workspaceRoot": "/tmp/work-sandboxes"
        },
        "tools": {
          "allow": ["read", "write", "apply_patch", "exec"],
          "deny": ["browser", "gateway", "discord"]
        }
      }
    ]
  }
}
```

---

### 示例 2b：全局 coding profile + 仅消息 agent

```json
{
  "tools": { "profile": "coding" },
  "agents": {
    "list": [
      {
        "id": "support",
        "tools": { "profile": "messaging", "allow": ["slack"] }
      }
    ]
  }
}
```

**结果：**
- 默认 agents 使用 coding 工具
- `support` agent 仅消息工具（+ Slack）

---

### 示例 3：不同 agent 的沙箱模式

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",  // 全局默认
        "scope": "session"
      }
    },
    "list": [
      {
        "id": "main",
        "workspace": "~/clawd",
        "sandbox": {
          "mode": "off"  // 覆盖：main 不进沙箱
        }
      },
      {
        "id": "public",
        "workspace": "~/clawd-public",
        "sandbox": {
          "mode": "all",  // 覆盖：public 总是沙箱
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch"]
        }
      }
    ]
  }
}
```

---

## 配置优先级

当同时存在全局（`agents.defaults.*`）与按 agent（`agents.list[].*`）配置时：

### 沙箱配置

按 agent 配置覆盖全局：
```
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

**说明：**
- `agents.list[].sandbox.{docker,browser,prune}.*` 覆盖 `agents.defaults.sandbox.{docker,browser,prune}.*`（当 sandbox scope 解析为 `"shared"` 时忽略）。

### 工具限制

过滤顺序：
1. **工具 profile**（`tools.profile` 或 `agents.list[].tools.profile`）
2. **Provider 工具 profile**（`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`）
3. **全局工具策略**（`tools.allow` / `tools.deny`）
4. **Provider 工具策略**（`tools.byProvider[provider].allow/deny`）
5. **按 agent 工具策略**（`agents.list[].tools.allow/deny`）
6. **按 agent 的 provider 策略**（`agents.list[].tools.byProvider[provider].allow/deny`）
7. **沙箱工具策略**（`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`）
8. **子 agent 工具策略**（适用时：`tools.subagents.tools`）

每一层只能进一步限制，不能放回之前已拒的工具。
若设置 `agents.list[].tools.sandbox.tools`，它会替换该 agent 的 `tools.sandbox.tools`。
若设置 `agents.list[].tools.profile`，它会覆盖该 agent 的 `tools.profile`。
Provider 工具键可使用 `provider`（如 `google-antigravity`）或 `provider/model`（如 `openai/gpt-5.2`）。

### 工具分组（缩写）

工具策略（全局/agent/沙箱）支持 `group:*` 条目展开为多个工具：

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:moltbot`：所有内置 Moltbot 工具（不含 provider 插件）

### Elevated 模式

`tools.elevated` 是全局基线（基于发送者 allowlist）。`agents.list[].tools.elevated` 可进一步限制特定 agent（两者都需允许）。

缓解模式：
- 对不可信 agent 拒绝 `exec`（`agents.list[].tools.deny: ["exec"]`）
- 避免 allowlist 的发送者路由到受限 agent
- 若只想沙箱执行，禁用全局 elevated（`tools.elevated.enabled: false`）
- 对敏感 profile 按 agent 禁用 elevated（`agents.list[].tools.elevated.enabled: false`）

---

## 从单 agent 迁移

**之前（单 agent）：**
```json
{
  "agents": {
    "defaults": {
      "workspace": "~/clawd",
      "sandbox": {
        "mode": "non-main"
      }
    }
  },
  "tools": {
    "sandbox": {
      "tools": {
        "allow": ["read", "write", "apply_patch", "exec"],
        "deny": []
      }
    }
  }
}
```

**之后（多 agent + 不同档位）：**
```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/clawd",
        "sandbox": { "mode": "off" }
      }
    ]
  }
}
```

遗留 `agent.*` 配置会被 `moltbot doctor` 迁移；后续请使用 `agents.defaults` + `agents.list`。

---

## 工具限制示例

### 只读 agent
```json
{
  "tools": {
    "allow": ["read"],
    "deny": ["exec", "write", "edit", "apply_patch", "process"]
  }
}
```

### 安全执行 agent（不修改文件）
```json
{
  "tools": {
    "allow": ["read", "exec", "process"],
    "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
  }
}
```

### 仅通信 agent
```json
{
  "tools": {
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

---

## 常见坑："non-main"

`agents.defaults.sandbox.mode: "non-main"` 基于 `session.mainKey`（默认 `"main"`），
而非 agent id。群/通道会话总是使用自己的 key，因此被视为 non-main，会进入沙箱。若希望某 agent 永不进沙箱，设 `agents.list[].sandbox.mode: "off"`。

---

## 测试

配置多 agent 沙箱与工具后：

1. **检查 agent 解析：**
   ```exec
   moltbot agents list --bindings
   ```

2. **验证沙箱容器：**
   ```exec
   docker ps --filter "label=moltbot.sandbox=1"
   ```

3. **测试工具限制：**
   - 发送需要受限工具的消息
   - 确认 agent 无法使用被拒工具

4. **监控日志：**
   ```exec
   tail -f "${CLAWDBOT_STATE_DIR:-$HOME/.clawdbot}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## 故障排查

### agent 未按 `mode: "all"` 进入沙箱
- 检查是否存在覆盖它的全局 `agents.defaults.sandbox.mode`
- 按 agent 配置优先级更高，设置 `agents.list[].sandbox.mode: "all"`

### deny 列表仍能使用工具
- 检查过滤顺序：全局 → agent → 沙箱 → 子 agent
- 各层只能进一步限制，不能放回
- 用日志确认：`[tools] filtering tools for agent:${agentId}`

### 容器不是按 agent 隔离
- 在按 agent 的沙箱配置中设置 `scope: "agent"`
- 默认是 `"session"`，每会话一个容器

---

## 另见

- [Multi-Agent Routing](/concepts/multi-agent)
- [Sandbox Configuration](/gateway/configuration#agentsdefaults-sandbox)
- [Session Management](/concepts/session)
