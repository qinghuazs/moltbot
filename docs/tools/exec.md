---
summary: "Exec 工具用法、stdin 模式与 TTY 支持"
read_when:
  - 使用或修改 exec 工具
  - 排查 stdin 或 TTY 行为
---

# Exec 工具

在工作区运行 shell 命令。支持通过 `process` 前台/后台执行。
若 `process` 被禁用，`exec` 将同步运行并忽略 `yieldMs`/`background`。
后台会话按 agent 作用域隔离；`process` 只能看到同一 agent 的会话。

## 参数

- `command`（必填）
- `workdir`（默认 cwd）
- `env`（键/值覆盖）
- `yieldMs`（默认 10000）：延迟后自动后台化
- `background`（bool）：立即后台
- `timeout`（秒，默认 1800）：超时杀进程
- `pty`（bool）：在可用时使用伪终端（TTY-only CLI、coding agents、终端 UI）
- `host`（`sandbox | gateway | node`）：执行位置
- `security`（`deny | allowlist | full`）：`gateway`/`node` 的执行策略
- `ask`（`off | on-miss | always`）：`gateway`/`node` 的审批提示策略
- `node`（string）：`host=node` 时指定节点 id/名称
- `elevated`（bool）：请求提升模式（gateway 主机）；仅当提升解析为 `full` 时强制 `security=full`

说明：
- `host` 默认为 `sandbox`。
- 当沙箱关闭时，`elevated` 会被忽略（exec 已直接在宿主运行）。
- `gateway`/`node` 审批由 `~/.clawdbot/exec-approvals.json` 控制。
- `node` 需要已配对节点（伴随应用或无头节点）。
- 若存在多个节点，可设置 `exec.node` 或 `tools.exec.node` 选择。
- 在非 Windows 主机上，exec 使用 `SHELL`（若设置）。若 `SHELL` 为 `fish`，会优先使用 `PATH` 中的 `bash`（或 `sh`）以避免 fish 不兼容脚本，若不存在则回退 `SHELL`。
- 重要：沙箱默认**关闭**。若沙箱关闭，`host=sandbox` 会直接在 gateway 宿主运行，且**不需要审批**。若需要审批，请使用 `host=gateway` 并配置 exec 审批（或启用沙箱）。

## 配置

- `tools.exec.notifyOnExit`（默认 true）：后台 exec 结束时入队系统事件并请求心跳。
- `tools.exec.approvalRunningNoticeMs`（默认 10000）：当审批后的 exec 运行超过该值时发送一次“running”提示（0 禁用）。
- `tools.exec.host`（默认 `sandbox`）
- `tools.exec.security`（默认：sandbox 为 `deny`，gateway + node 未设置时为 `allowlist`）
- `tools.exec.ask`（默认 `on-miss`）
- `tools.exec.node`（默认未设置）
- `tools.exec.pathPrepend`：在 exec 运行时追加到 `PATH` 前的目录列表。
- `tools.exec.safeBins`：stdin-only 安全二进制，可无 allowlist 条目运行。

示例：
```json5
{
  tools: {
    exec: {
      pathPrepend: ["~/bin", "/opt/oss/bin"]
    }
  }
}
```

### PATH 处理

- `host=gateway`：合并登录 shell 的 `PATH`（除非 exec 调用已设置 `env.PATH`）。守护进程本身仍使用最小 `PATH`：
  - macOS：`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux：`/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），`/etc/profile` 可能重置 `PATH`。
  Moltbot 会在 profile 之后通过内部 env 变量追加 `env.PATH`（无 shell 插值）；`tools.exec.pathPrepend` 在此也生效。
- `host=node`：仅传递你显式设置的 env 覆盖。`tools.exec.pathPrepend` 仅在 exec 已设置 `env.PATH` 时生效。
  无头节点主机仅接受“追加到节点 PATH 前”的形式（不允许替换）。macOS 节点会完全丢弃 `PATH` 覆盖。

按 agent 绑定节点（使用 agent 列表索引）：

```bash
moltbot config get agents.list
moltbot config set agents.list[0].tools.exec.node "node-id-or-name"
```

Control UI：Nodes 标签页包含“Exec node binding”面板。

## 会话覆盖（`/exec`）

使用 `/exec` 设置**会话级**的 `host`、`security`、`ask` 与 `node` 默认值。
不带参数发送 `/exec` 可显示当前值。

示例：
```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## 授权模型

`/exec` 仅对**授权发送者**生效（渠道 allowlist/配对 + `commands.useAccessGroups`）。
它只更新**会话状态**，不写配置。若要硬禁用 exec，请通过工具策略拒绝
（`tools.deny: ["exec"]` 或按 agent）。除非显式设置 `security=full` 且 `ask=off`，否则仍需宿主审批。

## Exec 审批（伴随应用 / 节点主机）

沙箱 agent 可在 gateway 或 node 主机上执行 `exec` 前要求逐次审批。
策略、allowlist 与 UI 流程见 [Exec approvals](/tools/exec-approvals)。

当需要审批时，exec 工具会立即返回
`status: "approval-pending"` 与审批 id。批准（或拒绝/超时）后，Gateway 会发送系统事件（`Exec finished` / `Exec denied`）。若命令在 `tools.exec.approvalRunningNoticeMs` 后仍在运行，会发送一次 `Exec running` 提示。

## Allowlist + safe bins

Allowlist 仅匹配**解析后的二进制路径**（不匹配 basename）。
当 `security=allowlist` 时，仅当 pipeline 的每个片段都在 allowlist 或为 safe bin 时才允许。
allowlist 模式下会拒绝 chaining（`;`、`&&`、`||`）与重定向。

## 示例

前台：
```json
{"tool":"exec","command":"ls -la"}
```

后台 + 轮询：
```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

发送按键（tmux 风格）：
```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

提交（仅发送 CR）：
```json
{"tool":"process","action":"submit","sessionId":"<id>"}
```

粘贴（默认带 bracketed）：
```json
{"tool":"process","action":"paste","sessionId":"<id>","text":"line1\nline2\n"}
```

## apply_patch（实验性）

`apply_patch` 是 `exec` 的子工具，用于结构化多文件编辑。
需显式启用：

```json5
{
  tools: {
    exec: {
      applyPatch: { enabled: true, allowModels: ["gpt-5.2"] }
    }
  }
}
```

说明：
- 仅适用于 OpenAI/OpenAI Codex 模型。
- 工具策略仍生效；`allow: ["exec"]` 会隐式允许 `apply_patch`。
- 配置位于 `tools.exec.applyPatch`。
