---
summary: "重构计划：exec 主机路由、节点审批与无界面执行器"
read_when:
  - 设计 exec 主机路由或 exec 审批
  - 实现节点执行器与 UI IPC
  - 添加 exec 主机安全模式与斜杠命令
---

# Exec 主机重构计划

## 目标
- 添加 `exec.host` + `exec.security`，在 **sandbox**、**gateway** 与 **node** 之间路由执行。
- 默认 **安全**：未显式启用时不跨主机执行。
- 将执行拆分为**无界面执行服务**，并通过本地 IPC（macOS app）可选 UI。
- 提供**按代理**的策略、允许列表、询问模式与节点绑定。
- 支持**询问模式**，可与或不与允许列表配合。
- 跨平台：Unix socket + token 认证（macOS/Linux/Windows 对齐）。

## 非目标
- 不做旧允许列表迁移或旧 schema 兼容。
- 节点 exec 不提供 PTY 或流式输出（仅聚合输出）。
- 不新增网络层，继续使用现有 Bridge + Gateway。

## 决策（已锁定）
- **配置键：**`exec.host` + `exec.security`（允许按代理覆盖）。
- **提升模式：**保留 `/elevated` 作为 gateway 全权限别名。
- **询问默认：**`on-miss`。
- **审批存储：**`~/.clawdbot/exec-approvals.json`（JSON，无旧格式迁移）。
- **执行器：**无界面系统服务；UI app 通过 Unix socket 处理审批。
- **节点身份：**使用现有 `nodeId`。
- **socket 认证：**Unix socket + token（跨平台）；必要时再拆分。
- **节点主机状态：**`~/.clawdbot/node.json`（node id + 配对 token）。
- **macOS exec 主机：**在 macOS app 内执行 `system.run`；节点主机服务通过本地 IPC 转发请求。
- **不使用 XPC helper：**坚持 Unix socket + token + peer 检查。

## 关键概念
### Host
- `sandbox`：Docker exec（当前行为）。
- `gateway`：在 gateway 主机上执行。
- `node`：通过 Bridge（`system.run`）在节点执行器上执行。

### Security 模式
- `deny`：始终阻止。
- `allowlist`：仅允许命中列表。
- `full`：允许所有（等同 elevated）。

### Ask 模式
- `off`：从不询问。
- `on-miss`：仅在允许列表未命中时询问。
- `always`：每次都询问。

Ask 与 allowlist **独立**；allowlist 可与 `always` 或 `on-miss` 一起使用。

### 策略解析（每次 exec）
1) 解析 `exec.host`（工具参数 → 代理覆盖 → 全局默认）。
2) 解析 `exec.security` 与 `exec.ask`（同样优先级）。
3) 若 host 为 `sandbox`，走本地沙箱 exec。
4) 若 host 为 `gateway` 或 `node`，在该主机上应用安全与询问策略。

## 默认安全
- 默认 `exec.host = sandbox`。
- 默认 `exec.security = deny`（对 `gateway` 与 `node`）。
- 默认 `exec.ask = on-miss`（仅在安全允许时相关）。
- 若未设置节点绑定，**代理可指向任意节点**，但仍受策略限制。

## 配置面
### 工具参数
- `exec.host`（可选）：`sandbox | gateway | node`。
- `exec.security`（可选）：`deny | allowlist | full`。
- `exec.ask`（可选）：`off | on-miss | always`。
- `exec.node`（可选）：`host=node` 时使用的节点 id 或名称。

### 全局配置键
- `tools.exec.host`
- `tools.exec.security`
- `tools.exec.ask`
- `tools.exec.node`（默认节点绑定）

### 按代理配置键
- `agents.list[].tools.exec.host`
- `agents.list[].tools.exec.security`
- `agents.list[].tools.exec.ask`
- `agents.list[].tools.exec.node`

### 别名
- `/elevated on` = 为当前代理会话设置 `tools.exec.host=gateway`、`tools.exec.security=full`。
- `/elevated off` = 恢复该会话之前的 exec 设置。

## 审批存储（JSON）
路径：`~/.clawdbot/exec-approvals.json`

用途：
- **执行主机**（gateway 或 node runner）的本地策略与允许列表。
- 无 UI 时的询问兜底。
- UI 客户端的 IPC 凭据。

建议 schema（v1）：
```json
{
  "version": 1,
  "socket": {
    "path": "~/.clawdbot/exec-approvals.sock",
    "token": "base64-opaque-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny"
  },
  "agents": {
    "agent-id-1": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [
        {
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 0,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```
说明：
- 不支持旧允许列表格式。
- `askFallback` 仅在需要询问但 UI 不可达时生效。
- 文件权限：`0600`。

## 执行服务（无界面）
### 角色
- 在本地主机执行 `exec.security` 与 `exec.ask`。
- 执行系统命令并返回输出。
- 发出 exec 生命周期 Bridge 事件（可选但推荐）。

### 服务生命周期
- macOS 使用 launchd 守护；Linux/Windows 使用系统服务。
- 审批 JSON 存储在执行主机本地。
- UI 在本地 Unix socket 上提供服务；执行器按需连接。

## UI 集成（macOS app）
### IPC
- Unix socket：`~/.clawdbot/exec-approvals.sock`（0600）。
- Token 存储在 `exec-approvals.json`（0600）。
- 对端检查：仅同 UID。
- Challenge/response：nonce + HMAC(token, request-hash) 防重放。
- 短 TTL（例如 10s）+ 最大载荷 + 限速。

### 询问流程（macOS app exec 主机）
1) 节点服务从 gateway 接收 `system.run`。
2) 节点服务连接本地 socket 并发送提示或执行请求。
3) app 校验对端 + token + HMAC + TTL，然后视情况弹窗。
4) app 在 UI 上下文执行命令并返回输出。
5) 节点服务返回输出给 gateway。

如果 UI 缺失：
- 使用 `askFallback`（`deny|allowlist|full`）。

### 示意图（SCI）
```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## 节点身份与绑定
- 使用 Bridge 配对的 `nodeId`。
- 绑定模型：
  - `tools.exec.node` 将代理限制到特定节点。
  - 若未设置，代理可选择任意节点（策略仍会限制）。
- 节点选择解析：
  - `nodeId` 精确匹配
  - `displayName`（规范化）
  - `remoteIp`
  - `nodeId` 前缀（>= 6 字符）

## 事件
### 谁能看到事件
- 系统事件是**按会话**的，并在下一次提示时展示给代理。
- 存储在 gateway 内存队列（`enqueueSystemEvent`）。

### 事件文本
- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + 可选输出尾部
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### 传输
方案 A（推荐）：
- 执行器通过 Bridge 发送 `exec.started` / `exec.finished` 事件帧。
- Gateway `handleBridgeEvent` 将其映射为 `enqueueSystemEvent`。

方案 B：
- Gateway `exec` 工具直接处理生命周期（仅同步）。

## Exec 流程
### Sandbox 主机
- 维持现有 `exec` 行为（Docker 或非沙箱模式下主机执行）。
- PTY 仅在非沙箱模式支持。

### Gateway 主机
- Gateway 进程在自身机器执行。
- 本地 `exec-approvals.json` 执行安全与询问策略。

### Node 主机
- Gateway 调用 `node.invoke` 并执行 `system.run`。
- 执行器应用本地审批策略。
- 执行器返回聚合的 stdout/stderr。
- 可选 Bridge 事件（start/finish/deny）。

## 输出上限
- 合并 stdout+stderr 上限 **200k**；事件保留尾部 **20k**。
- 超出时截断并附清晰后缀（如 `"… (truncated)"`）。

## 斜杠命令
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- 按代理、按会话覆盖；非持久，除非通过配置保存。
- `/elevated on|off|ask|full` 仍是 `host=gateway security=full` 的快捷方式（`full` 跳过审批）。

## 跨平台方案
- 执行服务是可移植的执行目标。
- UI 可选；缺失时使用 `askFallback`。
- Windows/Linux 与 macOS 使用相同的审批 JSON + socket 协议。

## 实现阶段
### 阶段 1：配置与 exec 路由
- 添加 `exec.host`、`exec.security`、`exec.ask`、`exec.node` 的 schema。
- 更新工具管线以遵循 `exec.host`。
- 添加 `/exec` 斜杠命令并保留 `/elevated` 别名。

### 阶段 2：审批存储与 gateway 执行
- 实现 `exec-approvals.json` 读写。
- 在 `gateway` 主机执行 allowlist + ask。
- 添加输出上限。

### 阶段 3：节点执行器策略
- 更新节点执行器以执行 allowlist + ask。
- 添加 Unix socket 提示桥接到 macOS app UI。
- 接线 `askFallback`。

### 阶段 4：事件
- 添加 node -> gateway Bridge 事件用于 exec 生命周期。
- 映射为 `enqueueSystemEvent` 以供代理提示。

### 阶段 5：UI 打磨
- macOS app：允许列表编辑器、按代理切换器、询问策略 UI。
- 节点绑定控制（可选）。

## 测试计划
- 单测：允许列表匹配（glob + 不区分大小写）。
- 单测：策略解析优先级（工具参数 → 代理覆盖 → 全局）。
- 集成测试：节点执行 deny/allow/ask 流程。
- Bridge 事件测试：node 事件 -> system 事件路由。

## 风险
- UI 不可用：确保 `askFallback` 生效。
- 长时间命令：依赖超时与输出上限。
- 多节点歧义：除非节点绑定或显式节点参数，否则报错。

## 相关文档
- [Exec tool](/tools/exec)
- [Exec approvals](/tools/exec-approvals)
- [Nodes](/nodes)
- [Elevated mode](/tools/elevated)
