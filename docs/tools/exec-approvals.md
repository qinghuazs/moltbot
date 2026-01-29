---
summary: "Exec 审批、allowlist 与沙箱逃逸提示"
read_when:
  - 配置 exec 审批或 allowlist
  - 在 macOS app 中实现 exec 审批 UX
  - 复核沙箱逃逸提示及影响
---

# Exec 审批

Exec 审批是**伴随应用/节点主机的防护栏**，用于允许沙箱内 agent 在真实主机（`gateway` 或 `node`）上执行命令。可理解为安全联锁：只有当策略 + allowlist +（可选）用户审批全部同意时，命令才会执行。Exec 审批**叠加**在工具策略与 elevated 门控之上（除非 elevated 设为 `full`，此时跳过审批）。有效策略为 `tools.exec.*` 与审批默认值中**更严格**的一方；若审批字段缺省，则使用 `tools.exec` 的值。

若伴随应用 UI **不可用**，任何需要提示的请求会由 **ask fallback** 处理（默认：拒绝）。

## 适用范围

Exec 审批在执行主机本地强制：
- **gateway 主机** → gateway 机器上的 `moltbot` 进程
- **node 主机** → 节点运行器（macOS 伴随应用或无头节点主机）

macOS 分层：
- **节点服务** 通过本地 IPC 将 `system.run` 转发到 **macOS app**。
- **macOS app** 在 UI 上执行审批并运行命令。

## 配置与存储

审批配置保存在执行主机本地 JSON：

`~/.clawdbot/exec-approvals.json`

示例 schema：
```json
{
  "version": 1,
  "socket": {
    "path": "~/.clawdbot/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 策略开关

### 安全级别（`exec.security`）
- **deny**：阻止所有主机 exec 请求。
- **allowlist**：仅允许 allowlist 命令。
- **full**：允许所有（等同 elevated）。

### 提示（`exec.ask`）
- **off**：从不提示。
- **on-miss**：仅当 allowlist 不匹配时提示。
- **always**：每条命令都提示。

### 提示回退（`askFallback`）
当需要提示但无 UI 可达时，回退策略决定：
- **deny**：拒绝。
- **allowlist**：仅当 allowlist 匹配时允许。
- **full**：允许。

## Allowlist（按 agent）

Allowlist **按 agent** 生效。若存在多个 agent，请在 macOS app 中切换要编辑的 agent。
模式为**不区分大小写的 glob 匹配**。
模式应解析为**二进制路径**（仅 basename 的条目会被忽略）。
旧的 `agents.default` 会在加载时迁移到 `agents.main`。

示例：
- `~/Projects/**/bin/bird`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每条 allowlist 记录包含：
- **id** 稳定 UUID（可选，供 UI 标识）
- **last used** 时间戳
- **last used command**
- **last resolved path**

## Auto-allow skill CLI

启用 **Auto-allow skill CLIs** 后，已知 skills 引用的可执行文件在节点上被视为 allowlist（macOS 节点或无头节点主机）。这会通过 Gateway RPC 读取 `skills.bins` 列表。若需要严格手动 allowlist，请关闭该选项。

## Safe bins（stdin-only）

`tools.exec.safeBins` 定义一组**仅 stdin** 的安全二进制（如 `jq`），可在 allowlist 模式下**无需**显式 allowlist 条目。安全二进制会拒绝位置参数与路径 token，因此只能处理输入流。
allowlist 模式下不允许 shell chaining 和重定向。

默认 safe bins：`jq`、`grep`、`cut`、`sort`、`uniq`、`head`、`tail`、`tr`、`wc`。

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片编辑默认值、按 agent 覆盖与 allowlist。选择作用域（Defaults 或某个 agent），调整策略、添加/移除 allowlist，再点击 **Save**。
UI 会显示每条模式的**last used** 元数据，便于清理。

目标选择器可选 **Gateway**（本地审批）或 **Node**。节点必须支持 `system.execApprovals.get/set`（macOS app 或无头节点主机）。
若节点尚未支持 exec approvals，请直接编辑其本地
`~/.clawdbot/exec-approvals.json`。

CLI：`moltbot approvals` 支持 gateway 或 node 编辑（见 [Approvals CLI](/cli/approvals)）。

## 审批流程

当需要提示时，gateway 会向 operator 客户端广播 `exec.approval.requested`。
Control UI 与 macOS app 会通过 `exec.approval.resolve` 处理，然后 gateway 将已批准请求转发给 node 主机。

当需要审批时，exec 工具会立即返回审批 id。用该 id 关联后续系统事件（`Exec finished` / `Exec denied`）。
若在超时前未收到决定，请求将视为审批超时并以拒绝原因呈现。

确认对话框包含：
- command + args
- cwd
- agent id
- 解析后的可执行路径
- host + policy 元数据

操作：
- **Allow once** → 立即运行
- **Always allow** → 加入 allowlist + 运行
- **Deny** → 阻止

## 审批转发到聊天渠道

可以将 exec 审批提示转发到任意聊天渠道（包括插件渠道），并用 `/approve` 审批。通过常规出站投递管线实现。

配置：
```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // substring or regex
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" }
      ]
    }
  }
}
```

在聊天中回复：
```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

### macOS IPC 流程
```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全说明：
- Unix socket 权限 `0600`，token 存在 `exec-approvals.json`。
- 同 UID 的对端校验。
