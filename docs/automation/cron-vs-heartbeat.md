---
summary: "选择心跳还是定时任务（cron）的指导"
read_when:
  - 决定如何安排周期任务
  - 设置后台监控或通知
  - 优化周期检查的 token 使用
---
# Cron 与 Heartbeat：何时使用

心跳与 cron 都能按计划运行任务。本指南帮助你选择合适的机制。

## 快速决策指南

| 使用场景 | 推荐 | 原因 |
|----------|-------------|-----|
| 每 30 分钟查收收件箱 | 心跳 | 可与其他检查合并，且具上下文意识 |
| 每天 9 点准时发送日报 | Cron（隔离） | 需要精确时间 |
| 监控日历即将到来的事件 | 心跳 | 更适合周期感知 |
| 每周深度分析 | Cron（隔离） | 独立任务，可用不同模型 |
| 20 分钟后提醒我 | Cron（main，`--at`） | 一次性、时间精确 |
| 后台项目健康检查 | 心跳 | 搭载在已有周期上 |

## Heartbeat：周期性状态感知

心跳在**主会话**按固定间隔运行（默认 30 分钟）。用于让 agent 定期检查并提示重要事项。

### 什么时候用心跳

- **多项周期检查**：与其用 5 个 cron 分别检查收件箱/日历/天气/通知/项目状态，不如用一个心跳一次完成。
- **上下文感知**：agent 有主会话上下文，能判断轻重缓急。
- **对话连续性**：心跳共享同一会话，能记住最近对话并自然跟进。
- **低开销监控**：一个心跳替代多个小任务。

### 心跳优势

- **批量检查**：一次心跳即可检查收件箱、日历与通知。
- **降低 API 调用**：一个心跳比 5 个独立 cron 更省。
- **上下文感知**：agent 知道你最近在做什么，能更好地排序优先级。
- **智能抑制**：若无事项需要关注，agent 会回复 `HEARTBEAT_OK`，不发送消息。
- **自然时间漂移**：会因队列负载略有漂移，多数监控场景可接受。

### 心跳示例：HEARTBEAT.md 清单

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

agent 会在每次心跳读取此清单并在一个回合中完成。

### 配置心跳

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",        // 间隔
        target: "last",      // 投递目标
        activeHours: { start: "08:00", end: "22:00" }  // 可选
      }
    }
  }
}
```

完整配置见 [Heartbeat](/gateway/heartbeat)。

## Cron：精确调度

Cron 任务在**精确时间**运行，并可在隔离会话中执行，不影响主上下文。

### 什么时候用 cron

- **需要精确时间**：如“每周一 9:00 准时发送”。
- **独立任务**：不需要对话上下文。
- **不同模型/思考**：重分析任务可用更强模型。
- **一次性提醒**：用 `--at` 设置精确时间。
- **噪声较大的任务**：避免污染主会话历史。
- **外部触发**：无需依赖 agent 活跃。

### Cron 优势

- **精确时间**：支持 5 段 cron 表达式与时区。
- **会话隔离**：运行于 `cron:<jobId>`，不污染主历史。
- **模型可覆盖**：每个任务可指定不同模型。
- **投递控制**：可直接投递到指定渠道；默认仍向主会话发摘要（可配置）。
- **无需上下文**：主会话闲置或压缩也能运行。
- **一次性支持**：`--at` 支持精确时间戳。

### Cron 示例：每日早报

```bash
moltbot cron add \
  --name "Morning briefing" \
  --cron "0 7 * * *" \
  --tz "America/New_York" \
  --session isolated \
  --message "Generate today's briefing: weather, calendar, top emails, news summary." \
  --model opus \
  --deliver \
  --channel whatsapp \
  --to "+15551234567"
```

该任务在纽约时间 7:00 准时运行，使用 Opus 并投递到 WhatsApp。

### Cron 示例：一次性提醒

```bash
moltbot cron add \
  --name "Meeting reminder" \
  --at "20m" \
  --session main \
  --system-event "Reminder: standup meeting starts in 10 minutes." \
  --wake now \
  --delete-after-run
```

完整 CLI 参考见 [Cron jobs](/automation/cron-jobs)。

## 决策流程图

```
任务是否必须在“精确时间”运行？
  是 -> 使用 cron
  否 -> 继续...

任务是否需要隔离于主会话？
  是 -> 使用 cron（isolated）
  否 -> 继续...

能否与其他周期检查合并？
  是 -> 用 heartbeat（写入 HEARTBEAT.md）
  否 -> 用 cron

是否为一次性提醒？
  是 -> cron + --at
  否 -> 继续...

是否需要不同模型或思考级别？
  是 -> cron（isolated）+ --model/--thinking
  否 -> heartbeat
```

## 组合使用

最高效的方案是**同时使用**：

1. **Heartbeat** 负责例行监控（收件箱、日历、通知），每 30 分钟合并一次。
2. **Cron** 负责精确调度（日报、周报）与一次性提醒。

### 示例：高效自动化配置

**HEARTBEAT.md**（每 30 分钟检查）：
```md
# Heartbeat checklist
- Scan inbox for urgent emails
- Check calendar for events in next 2h
- Review any pending tasks
- Light check-in if quiet for 8+ hours
```

**Cron 任务**（精确时间）：
```bash
# Daily morning briefing at 7am
moltbot cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --deliver

# Weekly project review on Mondays at 9am
moltbot cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# One-shot reminder
moltbot cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
```


## Lobster：带审批的确定性流程

Lobster 是用于**多步工具流水线**的工作流运行时，强调确定性执行与显式审批。
当任务不止一个 agent 回合且需要可恢复流程与人工检查点时使用。

### 适用场景

- **多步自动化**：需要固定的工具调用流水线，而非一次性 prompt。
- **审批关口**：有副作用的操作需暂停等待审批。
- **可恢复运行**：暂停后可继续，无需重复前序步骤。

### 与 heartbeat/cron 的配合

- **Heartbeat/cron** 决定*何时*触发。
- **Lobster** 定义启动后的*具体步骤*。

定时流程可用 cron 或 heartbeat 触发一次 agent 回合后调用 Lobster。
临时流程则直接调用 Lobster。

### 运维说明（来自代码）

- Lobster 以**本地子进程**（`lobster` CLI）在工具模式运行，返回 **JSON 包装**。
- 当工具返回 `needs_approval` 时，使用 `resumeToken` 与 `approve` 标志恢复。
- 工具为**可选插件**；推荐通过 `tools.alsoAllow: ["lobster"]` 增量启用。
- 若传 `lobsterPath`，必须是**绝对路径**。

完整用法与示例见 [Lobster](/tools/lobster)。

## 主会话 vs 隔离会话

心跳与 cron 都可与主会话交互，但方式不同：

| | Heartbeat | Cron（main） | Cron（isolated） |
|---|---|---|---|
| 会话 | 主 | 主（系统事件） | `cron:<jobId>` |
| 历史 | 共享 | 共享 | 每次全新 |
| 上下文 | 完整 | 完整 | 无（干净开始） |
| 模型 | 主会话模型 | 主会话模型 | 可覆盖 |
| 输出 | 非 `HEARTBEAT_OK` 才投递 | 心跳提示 + 事件 | 摘要默认发到主会话 |

### 何时使用主会话 cron

使用 `--session main` + `--system-event`，当你希望：
- 提醒/事件进入主会话上下文
- agent 在下一次心跳时用完整上下文处理
- 不运行独立隔离任务

```bash
moltbot cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### 何时使用隔离 cron

使用 `--session isolated`，当你希望：
- 干净上下文
- 使用不同模型或思考设置
- 直接投递到渠道（默认仍向主会话发摘要）
- 不让历史污染主会话

```bash
moltbot cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 0" \
  --session isolated \
  --message "Weekly codebase analysis..." \
  --model opus \
  --thinking high \
  --deliver
```

## 成本考量

| 机制 | 成本画像 |
|-----------|-------------------------------|
| Heartbeat | 每 N 分钟 1 回合；随 HEARTBEAT.md 大小增长 |
| Cron（main） | 仅向下一次心跳添加事件（无隔离回合） |
| Cron（isolated） | 每个任务完整独立回合；可用更便宜模型 |

**提示**：
- 让 `HEARTBEAT.md` 尽量短以减少 token 开销。
- 将相似检查合并到心跳，而不是多个 cron 任务。
- 若仅需内部处理，心跳可设 `target: "none"`。
- 常规任务可用隔离 cron + 更便宜模型。

## 相关内容

- [Heartbeat](/gateway/heartbeat) - 心跳完整配置
- [Cron jobs](/automation/cron-jobs) - cron CLI 与 API 参考
- [System](/cli/system) - 系统事件 + 心跳控制
