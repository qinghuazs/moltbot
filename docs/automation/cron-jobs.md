---
summary: "Gateway 调度器的 Cron 任务与唤醒"
read_when:
  - 安排后台任务或唤醒
  - 将自动化与心跳一起运行或并行运行
  - 决定定时任务使用 heartbeat 还是 cron
---
# Cron 任务（Gateway 调度器）

> **Cron 还是 Heartbeat？** 参考 [Cron vs Heartbeat](/automation/cron-vs-heartbeat)。

Cron 是 Gateway 内置调度器。它持久化任务，在正确时间唤醒 agent，并可选择将输出投递到聊天。

如果你需要“每天早上运行”或“20 分钟后提醒我”，就用 cron。

## TL;DR
- Cron **运行在 Gateway 内部**（不在模型内）。
- 任务持久化在 `~/.clawdbot/cron/`，重启不会丢失。
- 两种执行方式：
  - **主会话**：入队系统事件，下次心跳执行。
  - **隔离**：在 `cron:<jobId>` 里运行独立 agent 回合，可选投递输出。
- 唤醒是一级能力：任务可请求“立即唤醒”或“下次心跳”。

## 新手友好概览
把 cron 任务看作：**何时运行** + **做什么**。

1) **选择调度**
   - 一次性提醒 → `schedule.kind = "at"`（CLI：`--at`）
   - 重复任务 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - ISO 时间戳若不含时区，视为 **UTC**。

2) **选择运行位置**
   - `sessionTarget: "main"` → 下次心跳在主上下文中运行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中运行独立回合。

3) **选择 payload**
   - 主会话 → `payload.kind = "systemEvent"`
   - 隔离会话 → `payload.kind = "agentTurn"`

可选：`deleteAfterRun: true` 会在一次性任务成功后删除。

## 概念

### 任务（Jobs）
一个 cron 任务包含：
- **调度**（什么时候运行），
- **payload**（要做什么），
- 可选 **投递**（输出发到哪里）。
- 可选 **agent 绑定**（`agentId`）：在指定 agent 下执行；若缺失或未知，则回退默认 agent。

任务用稳定的 `jobId` 标识（CLI/Gateway API 使用）。
在 agent 工具调用中，`jobId` 为 canonical；为了兼容也接受旧字段 `id`。
一次性任务可用 `deleteAfterRun: true` 在成功后自动删除。

### 调度（Schedules）
Cron 支持三种调度：
- `at`：一次性时间戳（毫秒）。Gateway 接受 ISO 8601 并转换为 UTC。
- `every`：固定间隔（毫秒）。
- `cron`：5 段 cron 表达式，可选 IANA 时区。

Cron 表达式使用 `croner`。若未指定时区，使用 Gateway 主机本地时区。

### 主会话 vs 隔离执行

#### 主会话任务（system events）
主会话任务会入队系统事件，并可选择唤醒心跳。
必须使用 `payload.kind = "systemEvent"`。

- `wakeMode: "next-heartbeat"`（默认）：等待下一次心跳。
- `wakeMode: "now"`：立即触发一次心跳。

当你需要标准心跳提示 + 主会话上下文时，这是最佳选择。
见 [Heartbeat](/gateway/heartbeat)。

#### 隔离任务（独立 cron 会话）
隔离任务在 `cron:<jobId>` 中运行独立 agent 回合。

关键行为：
- Prompt 以 `[cron:<jobId> <job name>]` 作为前缀，便于追踪。
- 每次运行都是**全新会话 id**（无历史上下文）。
- 摘要会发回主会话（前缀 `Cron`，可配置）。
- `wakeMode: "now"` 会在摘要发布后立即触发心跳。
- `payload.deliver: true` 时，输出投递到渠道；否则仅内部记录。

适合噪声较大或“后台例行”的任务，避免污染主聊天历史。

### Payload 形状（执行内容）
支持两种 payload：
- `systemEvent`：仅主会话，通过心跳提示处理。
- `agentTurn`：仅隔离会话，运行独立 agent 回合。

常见 `agentTurn` 字段：
- `message`：必填提示文本。
- `model` / `thinking`：可选覆盖（见下）。
- `timeoutSeconds`：可选超时覆盖。
- `deliver`：`true` 时投递输出到渠道。
- `channel`：`last` 或指定渠道。
- `to`：渠道目标（电话/聊天/频道 id）。
- `bestEffortDeliver`：投递失败时不让任务失败。

隔离选项（仅 `session=isolated`）：
- `postToMainPrefix`（CLI：`--post-prefix`）：发回主会话的前缀。
- `postToMainMode`：`summary`（默认）或 `full`。
- `postToMainMaxChars`：`postToMainMode=full` 时最大字符数（默认 8000）。

### 模型与思考覆盖
隔离任务（`agentTurn`）可覆盖模型与思考级别：
- `model`：Provider/model 字符串（如 `anthropic/claude-sonnet-4-20250514`）或别名（如 `opus`）
- `thinking`：思考级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；仅 GPT-5.2 + Codex）

注意：主会话任务也可设置 `model`，但会改变共享主会话模型。
建议仅在隔离任务中使用覆盖，以避免上下文意外变化。

优先级：
1. 任务 payload 覆盖（最高）
2. Hook 默认值（如 `hooks.gmail.model`）
3. Agent 默认配置

### 投递（渠道 + 目标）
隔离任务可投递到渠道。payload 中可指定：
- `channel`：`whatsapp` / `telegram` / `discord` / `slack` / `mattermost`（插件）/ `signal` / `imessage` / `last`
- `to`：渠道目标

若 `channel` 或 `to` 未设置，cron 会回退到主会话的“最后路由”（agent 上次回复的位置）。

投递说明：
- 若设置了 `to`，即使省略 `deliver`，也会自动投递最终输出。
- 若想使用“最后路由”投递，请设置 `deliver: true`。
- 若设置 `deliver: false`，即使有 `to` 也只内部记录。

目标格式提示：
- Slack/Discord/Mattermost（插件）目标请使用显式前缀（如 `channel:<id>`、`user:<id>`）避免歧义。
- Telegram 主题请使用 `:topic:` 形式（见下）。

#### Telegram 投递目标（主题 / 论坛线程）
Telegram 通过 `message_thread_id` 支持论坛主题。cron 投递时可在 `to` 中编码主题：

- `-1001234567890`（仅 chat id）
- `-1001234567890:topic:123`（推荐：显式主题）
- `-1001234567890:123`（简写：数字后缀）

也接受带前缀的目标：
- `telegram:group:-1001234567890:topic:123`

## 存储与历史
- 任务存储：`~/.clawdbot/cron/jobs.json`（由 Gateway 管理）。
- 运行历史：`~/.clawdbot/cron/runs/<jobId>.jsonl`（JSONL，自动裁剪）。
- 覆盖存储路径：在配置中设置 `cron.store`。

## 配置

```json5
{
  cron: {
    enabled: true, // 默认 true
    store: "~/.clawdbot/cron/jobs.json",
    maxConcurrentRuns: 1 // 默认 1
  }
}
```

完全禁用 cron：
- `cron.enabled: false`（配置）
- `CLAWDBOT_SKIP_CRON=1`（环境变量）

## CLI 快速上手

一次性提醒（UTC ISO，成功后自动删除）：
```bash
moltbot cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run
```

一次性提醒（主会话，立即唤醒）：
```bash
moltbot cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

重复隔离任务（投递到 WhatsApp）：
```bash
moltbot cron add \
  --name "Morning status" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize inbox + calendar for today." \
  --deliver \
  --channel whatsapp \
  --to "+15551234567"
```

重复隔离任务（投递到 Telegram 主题）：
```bash
moltbot cron add \
  --name "Nightly summary (topic)" \
  --cron "0 22 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize today; send to the nightly topic." \
  --deliver \
  --channel telegram \
  --to "-1001234567890:topic:123"
```

带模型与思考覆盖的隔离任务：
```bash
moltbot cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --deliver \
  --channel whatsapp \
  --to "+15551234567"
```

多代理场景下的 agent 选择：
```bash
# 将任务绑定到 agent "ops"（若不存在则回退默认）
moltbot cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# 修改或清除现有任务的 agent
moltbot cron edit <jobId> --agent ops
moltbot cron edit <jobId> --clear-agent
```

手动运行（调试）：
```bash
moltbot cron run <jobId> --force
```

编辑已有任务（按字段 patch）：
```bash
moltbot cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

运行历史：
```bash
moltbot cron runs --id <jobId> --limit 50
```

无需创建任务的即时系统事件：
```bash
moltbot system event --mode now --text "Next heartbeat: check battery."
```

## Gateway API 面
- `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`
- `cron.run`（强制或到期）、`cron.runs`
如需无任务的即时系统事件，请使用 [`moltbot system event`](/cli/system)。

## 故障排查

### “没有任务运行”
- 检查 cron 是否启用：`cron.enabled` 与 `CLAWDBOT_SKIP_CRON`。
- 确保 Gateway 持续运行（cron 在 Gateway 进程内执行）。
- 对 `cron` 调度：确认 `--tz` 时区与主机时区。

### Telegram 投递到错误位置
- 对论坛主题使用 `-100…:topic:<id>`，明确且无歧义。
- 若日志或“最后路由”目标里看到 `telegram:...` 前缀属正常；cron 可解析并正确识别主题 ID。
