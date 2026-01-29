---
title: Lobster
summary: "用于 Moltbot 的强类型工作流运行时（可恢复审批）。"
description: 用于 Moltbot 的强类型工作流运行时——带审批门的可组合流水线。
read_when:
  - 你需要带显式审批的确定性多步工作流
  - 需要在不重跑早期步骤的情况下恢复工作流
---

# Lobster

Lobster 是一个工作流 shell，让 Moltbot 以单次调用的方式运行多步工具序列，并提供显式审批检查点。

## Hook

你的助手可以构建管理自身的工具。请求一个工作流，30 分钟后你就有了 CLI + 一次调用的流水线。Lobster 是缺失的一环：确定性流水线、显式审批、可恢复状态。

## 为什么

当前复杂工作流需要多次往返调用工具，每次都消耗 token，且 LLM 需要编排每一步。Lobster 将编排移入强类型运行时：

- **一次调用替代多次**：Moltbot 只需调用一次 Lobster 工具，返回结构化结果。
- **内置审批**：有副作用的步骤（发邮件、发评论）会暂停，直到明确批准。
- **可恢复**：暂停后返回 token；批准后继续，无需重跑。

## 为什么要 DSL 而不是普通程序？

Lobster 有意保持小而专。目标不是“新语言”，而是可预测、AI 友好的流水线规范，具备一等审批与恢复 token。

- **内置审批/恢复**：普通程序可以提示人，但无法在无自定义运行时的前提下暂停并凭 token 恢复。
- **确定性与可审计**：流水线是数据，易记录、对比、回放与审查。
- **受限的 AI 表面**：小语法 + JSON piping 减少“创意”路径，校验更可控。
- **安全策略内置**：超时、输出上限、沙箱检查、allowlist 由运行时强制，而非脚本各自处理。
- **仍可编程**：每步可调用任意 CLI/脚本。若需要 JS/TS，可从代码生成 `.lobster` 文件。

## 工作方式

Moltbot 以**工具模式**启动本地 `lobster` CLI，并从 stdout 解析 JSON envelope。
若流水线在审批处暂停，工具会返回 `resumeToken` 以便之后继续。

## 模式：小 CLI + JSON pipes + 审批

构建能输出 JSON 的小命令，再串成一个 Lobster 调用。（示例命令名仅示意，可替换为你的命令。）

```bash
inbox list --json
inbox categorize --json
inbox apply --json
```

```json
{
  "action": "run",
  "pipeline": "exec --json --shell 'inbox list --json' | exec --stdin json --shell 'inbox categorize --json' | exec --stdin json --shell 'inbox apply --json' | approve --preview-from-stdin --limit 5 --prompt 'Apply changes?'",
  "timeoutMs": 30000
}
```

若流水线请求审批，使用 token 恢复：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 触发工作流；Lobster 执行步骤。审批门保证副作用可控且可审计。

示例：将输入项映射为工具调用：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | clawd.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## JSON-only LLM 步骤（llm-task）

需要**结构化 LLM 步骤**时，启用可选 `llm-task` 插件并在 Lobster 中调用。这样既保持确定性，又能做分类/摘要/草拟。

启用工具：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

在流水线中使用：

```lobster
clawd.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "input": { "subject": "Hello", "body": "Can you help?" },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

详情与配置见 [LLM Task](/tools/llm-task)。

## 工作流文件（.lobster）

Lobster 支持 YAML/JSON 工作流文件，包含 `name`、`args`、`steps`、`env`、`condition`、`approval` 等字段。工具调用中将 `pipeline` 设为文件路径。

```yaml
name: inbox-triage
args:
  tag:
    default: "family"
steps:
  - id: collect
    command: inbox list --json
  - id: categorize
    command: inbox categorize --json
    stdin: $collect.stdout
  - id: approve
    command: inbox apply --approve
    stdin: $categorize.stdout
    approval: required
  - id: execute
    command: inbox apply --execute
    stdin: $categorize.stdout
    condition: $approve.approved
```

说明：

- `stdin: $step.stdout` 与 `stdin: $step.json` 可传递上一步输出。
- `condition`（或 `when`）可基于 `$step.approved` 门控。

## 安装 Lobster

在运行 Moltbot Gateway 的**同一台主机**上安装 Lobster CLI（见 [Lobster repo](https://github.com/moltbot/lobster)），确保 `lobster` 在 `PATH` 中。
若使用自定义二进制路径，在工具调用中传入**绝对路径** `lobsterPath`。

## 启用工具

Lobster 是**可选**插件工具（默认未启用）。

推荐（增量、安全）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或按 agent：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "alsoAllow": ["lobster"]
        }
      }
    ]
  }
}
```

除非你明确想进入严格 allowlist 模式，否则避免使用 `tools.allow: ["lobster"]`。

注意：可选插件工具需要显式 allowlist。若 allowlist 只包含插件工具（如 `lobster`），Moltbot 仍会保持核心工具启用。若要限制核心工具，请同时把需要的核心工具/组加入 allowlist。

## 示例：邮件分拣

没有 Lobster：
```
User: "Check my email and draft replies"
→ clawd calls gmail.list
→ LLM summarizes
→ User: "draft replies to #2 and #5"
→ LLM drafts
→ User: "send #2"
→ clawd calls gmail.send
(repeat daily, no memory of what was triaged)
```

使用 Lobster：
```json
{
  "action": "run",
  "pipeline": "email.triage --limit 20",
  "timeoutMs": 30000
}
```

返回 JSON envelope（截断）：
```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 need replies, 2 need action" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "Send 2 draft replies?",
    "items": [],
    "resumeToken": "..."
  }
}
```

用户批准 → 恢复：
```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

一个工作流。确定性。安全。

## 工具参数

### `run`

在工具模式中运行流水线。

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "/path/to/workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

运行带参数的工作流文件：

```json
{
  "action": "run",
  "pipeline": "/path/to/inbox-triage.lobster",
  "argsJson": "{\"tag\":\"family\"}"
}
```

### `resume`

在审批后继续暂停的工作流。

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### 可选输入

- `lobsterPath`：Lobster 二进制的绝对路径（省略则使用 `PATH`）。
- `cwd`：流水线工作目录（默认当前进程工作目录）。
- `timeoutMs`：超时后终止子进程（默认 20000）。
- `maxStdoutBytes`：stdout 超限则终止子进程（默认 512000）。
- `argsJson`：传给 `lobster run --args-json` 的 JSON 字符串（仅工作流文件）。

## 输出 envelope

Lobster 返回包含三种状态之一的 JSON envelope：

- `ok` → 成功完成
- `needs_approval` → 已暂停；需 `requiresApproval.resumeToken` 才能恢复
- `cancelled` → 显式拒绝或取消

工具会在 `content`（美化 JSON）与 `details`（原始对象）中同时提供 envelope。

## 审批

若存在 `requiresApproval`，请查看 prompt 并决定：

- `approve: true` → 恢复并继续副作用
- `approve: false` → 取消并结束

使用 `approve --preview-from-stdin --limit N` 可将 JSON 预览附加到审批请求，无需自写 jq/heredoc。resume token 现在更紧凑：Lobster 会把恢复状态存到状态目录并返回小 token key。

## OpenProse

OpenProse 与 Lobster 组合良好：先用 `/prose` 进行多 agent 准备，再用 Lobster 流水线做确定性审批。若 Prose 程序需要 Lobster，请在 `tools.subagents.tools` 中允许 `lobster`。见 [OpenProse](/prose)。

## 安全

- **仅本地子进程** — 插件自身不发起网络请求。
- **不管理密钥** — Lobster 不管理 OAuth；由 clawd 工具处理。
- **沙箱感知** — 在工具上下文为沙箱时禁用。
- **加固** — 若设置 `lobsterPath` 必须为绝对路径；强制超时与输出上限。

## 故障排查

- **`lobster subprocess timed out`** → 增大 `timeoutMs`，或拆分长流水线。
- **`lobster output exceeded maxStdoutBytes`** → 增大 `maxStdoutBytes` 或减少输出。
- **`lobster returned invalid JSON`** → 确保流水线以工具模式运行并仅输出 JSON。
- **`lobster failed (code …)`** → 在终端运行相同流水线查看 stderr。

## 了解更多

- [Plugins](/plugin)
- [Plugin tool authoring](/plugins/agent-tools)

## 案例：社区工作流

一个公开示例：“第二大脑” CLI + Lobster 流水线管理三套 Markdown vault（个人、伙伴、共享）。CLI 输出统计、收件箱列表、陈旧扫描等 JSON；Lobster 将这些命令串成 `weekly-review`、`inbox-triage`、`memory-consolidation`、`shared-task-sync` 等工作流，每一步带审批门。AI 在可用时负责判断（分类），不可用时退回确定性规则。

- Thread: https://x.com/plattenschieber/status/2014508656335770033
- Repo: https://github.com/bloomedai/brain-cli
