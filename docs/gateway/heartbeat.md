---
summary: "心跳轮询消息与通知规则"
read_when:
  - 调整心跳频率或消息行为
  - 在定时任务中选择心跳或 cron
---
# 心跳（Gateway）

> **Heartbeat vs Cron?** 何时使用：见 [Cron vs Heartbeat](/automation/cron-vs-heartbeat)。

心跳会在 main 会话中 **定期执行 agent 回合**，让模型在不刷屏的前提下提示需要关注的事项。

## 快速开始（入门）

1. 保持心跳开启（默认 `30m`，或在 Anthropic OAuth/setup-token 时为 `1h`），也可设置自定义频率。
2. 在 agent 工作区创建一个小的 `HEARTBEAT.md` 清单（可选但推荐）。
3. 决定心跳消息发到哪里（默认 `target: "last"`）。
4. 可选：启用心跳推送 reasoning 以便透明。
5. 可选：仅在活跃时间段内执行（本地时间）。

示例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last",
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // 可选：额外发送 `Reasoning:` 消息
      }
    }
  }
}
```

## 默认值

- 间隔：`30m`（当检测到 Anthropic OAuth/setup-token 时为 `1h`）。设置 `agents.defaults.heartbeat.every` 或每 agent `agents.list[].heartbeat.every`；用 `0m` 关闭。
- 提示词正文（可通过 `agents.defaults.heartbeat.prompt` 配置）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 心跳提示词会 **原样** 作为用户消息发送。system prompt 包含“Heartbeat”段落，并在内部标记该运行。
- 活跃时间（`heartbeat.activeHours`）按配置时区判断；在时间窗外会跳过，直到进入窗口后再执行。

## 心跳提示词的作用

默认提示词刻意保持宽泛：
- **后台任务**：“Consider outstanding tasks” 促使 agent 回顾待办（收件箱、日历、提醒、排队工作）并提示紧急事项。
- **轻量关怀**：“Checkup sometimes on your human during day time” 促使偶尔的轻量询问“有什么需要吗？”，同时通过本地时区避免夜间刷屏（见 [/concepts/timezone](/concepts/timezone)）。

如果你希望心跳做更具体的事（例如“检查 Gmail PubSub 状态”或“验证网关健康”），请设置 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）为自定义正文（原样发送）。

## 响应约定

- 若无需关注事项，回复 **`HEARTBEAT_OK`**。
- 心跳运行时，Moltbot 在回复 **开头或结尾** 出现 `HEARTBEAT_OK` 时将其视为 ack。
  该 token 会被剥离，且若剩余内容 **≤ `ackMaxChars`**（默认 300）则不发送。
- 若 `HEARTBEAT_OK` 出现在 **中间**，不会特殊处理。
- 若为警报，**不要** 包含 `HEARTBEAT_OK`；只返回警报文本。

在非心跳运行时，消息开头/结尾出现的 `HEARTBEAT_OK` 会被剥离并记录；若消息只有 `HEARTBEAT_OK` 则丢弃。

## 配置

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",           // 默认 30m（0m 关闭）
        model: "anthropic/claude-opus-4-5",
        includeReasoning: false, // 默认 false（可发送单独的 Reasoning: 消息）
        target: "last",         // last | none | <channel id>（核心或插件，如 "bluebubbles"）
        to: "+15551234567",     // 可选的按渠道接收者覆盖
        prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        ackMaxChars: 300         // HEARTBEAT_OK 后允许的最大字符数
      }
    }
  }
}
```

### 范围与优先级

- `agents.defaults.heartbeat` 设置全局心跳行为。
- `agents.list[].heartbeat` 在其上合并；若任一 agent 配置了 `heartbeat`，**只有这些 agent** 会运行心跳。
- `channels.defaults.heartbeat` 设置所有渠道的可见性默认值。
- `channels.<channel>.heartbeat` 覆盖渠道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账户渠道）覆盖每个渠道设置。

### 按 agent 心跳

如果任何 `agents.list[]` 条目包含 `heartbeat`，**只有这些 agent** 运行心跳。
该块会与 `agents.defaults.heartbeat` 合并（可先设共享默认，再按 agent 覆盖）。

示例：两个 agent，仅第二个运行心跳。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last"
      }
    },
    list: [
      { id: "main", default: true },
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK."
        }
      }
    ]
  }
}
```

### 字段说明

- `every`：心跳间隔（时长字符串；默认单位为分钟）。
- `model`：心跳运行的可选模型覆盖（`provider/model`）。
- `includeReasoning`：启用时，若可用则额外发送 `Reasoning:` 消息（与 `/reasoning on` 同形）。
- `session`：心跳运行的可选 session key。
  - `main`（默认）：agent main 会话。
  - 明确的 session key（从 `moltbot sessions --json` 或 [sessions CLI](/cli/sessions) 复制）。
  - session key 格式：见 [Sessions](/concepts/session) 与 [Groups](/concepts/groups)。
- `target`：
  - `last`（默认）：发送到最近使用的外部渠道。
  - 明确渠道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none`：运行心跳，但 **不发送** 外部消息。
- `to`：可选接收者覆盖（渠道特定 id，例如 WhatsApp E.164 或 Telegram chat id）。
- `prompt`：覆盖默认提示词正文（不合并）。
- `ackMaxChars`：`HEARTBEAT_OK` 后仍可发送的最大字符数。

## 送达行为

- 心跳默认在 agent main 会话运行（`agent:<id>:<mainKey>`），
  或当 `session.scope = "global"` 时使用 `global`。设置 `session` 可覆盖到特定渠道会话（Discord/WhatsApp 等）。
- `session` 只影响运行上下文；投递由 `target` 与 `to` 控制。
- 要投递到指定渠道/接收者，请设置 `target` + `to`。当 `target: "last"` 时，会投递到该会话最近使用的外部渠道。
- 若主队列繁忙，会跳过心跳并稍后重试。
- 若 `target` 解析不到外部目的地，仍会运行但不发送外部消息。
- 仅心跳的回复 **不会** 延长会话存活；`updatedAt` 会恢复，空闲过期行为保持一致。

## 可见性控制

默认情况下，`HEARTBEAT_OK` 确认会被抑制，而告警内容会发送。你可按渠道或账户调整：

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false      # 隐藏 HEARTBEAT_OK（默认）
      showAlerts: true   # 发送告警内容（默认）
      useIndicator: true # 发送指示器事件（默认）
  telegram:
    heartbeat:
      showOk: true       # 在 Telegram 显示 OK 确认
  whatsapp:
    accounts:
      work:
        heartbeat:
          showAlerts: false # 该账号不发送告警
```

优先级：按账户 → 按渠道 → 渠道默认 → 内置默认。

### 各标志含义

- `showOk`：当模型返回 OK-only 回复时，发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非 OK 回复时，发送告警内容。
- `useIndicator`：为 UI 状态界面发出指示器事件。

若 **三者均为 false**，Moltbot 会完全跳过心跳运行（不调用模型）。

### 按渠道与按账户示例

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false
      showAlerts: true
      useIndicator: true
  slack:
    heartbeat:
      showOk: true # 所有 Slack 账号
    accounts:
      ops:
        heartbeat:
          showAlerts: false # 仅对 ops 账号抑制告警
  telegram:
    heartbeat:
      showOk: true
```

### 常见模式

| 目标 | 配置 |
| --- | --- |
| 默认行为（OK 静默，告警发送） | *(无需配置)* |
| 完全静默（无消息，无指示器） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }` |
| 仅在某渠道显示 OK | `channels.telegram.heartbeat: { showOk: true }` |

## HEARTBEAT.md（可选）

若工作区存在 `HEARTBEAT.md`，默认提示词会让 agent 读取它。把它当作“心跳清单”：小、稳定、适合每 30 分钟重复。

若 `HEARTBEAT.md` 存在但实际上为空（仅空行与如 `# Heading` 的标题），Moltbot 会跳过心跳运行以节省 API 调用。
若文件不存在，心跳仍会运行，模型自行决定做什么。

保持它很小（短清单或提醒），避免 prompt 膨胀。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down *what is missing* and ask Peter next time.
```

### agent 可以更新 HEARTBEAT.md 吗？

可以 —— 只要你让它这么做。

`HEARTBEAT.md` 只是 agent 工作区中的普通文件，你可以在正常聊天中告诉它：
- “更新 `HEARTBEAT.md`，加入每天检查日历。”
- “重写 `HEARTBEAT.md`，让它更短、更专注收件箱跟进。”

如果想让它主动发生，也可在心跳提示词里明确加入一行：
“如果清单过期了，更新 HEARTBEAT.md 为更好的版本。”

安全提示：不要把密钥（API key、手机号、私有 token）放进 `HEARTBEAT.md` —— 它会进入提示词上下文。

## 手动唤醒（按需）

你可以入队一个系统事件并触发立即心跳：

```bash
moltbot system event --text "Check for urgent follow-ups" --mode now
```

若多个 agent 配置了 `heartbeat`，手动唤醒会立刻运行这些 agent 的心跳。

使用 `--mode next-heartbeat` 等待下一个计划 tick。

## Reasoning 投递（可选）

默认心跳只发送最终“答案”内容。

如需透明，启用：
- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳也会发送一个以 `Reasoning:` 开头的单独消息（与 `/reasoning on` 同形）。
当 agent 管理多个会话/codex 时这很有用，但也可能泄露比你想要的更多内部细节。
群聊中建议保持关闭。

## 成本意识

心跳是完整的 agent 回合。更短间隔会消耗更多 token。保持 `HEARTBEAT.md` 精简，
如仅需内部状态更新，可考虑更便宜的 `model` 或 `target: "none"`。
