---
summary: "日志概览：文件日志、控制台输出、CLI 尾随与 Control UI"
read_when:
  - 需要入门级日志概览
  - 想配置日志级别或格式
  - 排障时需要快速定位日志
---

# 日志

Moltbot 在两个地方记录日志：

- **文件日志**（JSON 行），由 Gateway 写入。
- **控制台输出**，显示在终端与 Control UI 中。

本页说明日志位置、如何阅读，以及如何配置级别与格式。

## 日志位置

默认情况下，Gateway 会把滚动日志写到：

`/tmp/moltbot/moltbot-YYYY-MM-DD.log`

日期使用网关主机的本地时区。

可在 `~/.clawdbot/moltbot.json` 中覆盖：

```json
{
  "logging": {
    "file": "/path/to/moltbot.log"
  }
}
```

## 如何查看日志

### CLI：实时尾随（推荐）

通过 CLI 使用 RPC 尾随网关日志：

```bash
moltbot logs --follow
```

输出模式：

- **TTY 会话**：漂亮格式、彩色、结构化日志行。
- **非 TTY 会话**：纯文本。
- `--json`：JSON 行（每行一个日志事件）。
- `--plain`：在 TTY 中强制纯文本。
- `--no-color`：禁用 ANSI 颜色。

在 JSON 模式下，CLI 输出带 `type` 标签的对象：

- `meta`：流元信息（文件、游标、大小）
- `log`：解析后的日志条目
- `notice`：截断 / 轮转提示
- `raw`：未解析日志行

如果 Gateway 不可达，CLI 会提示运行：

```bash
moltbot doctor
```

### Control UI（Web）

Control UI 的 **Logs** 标签通过 `logs.tail` 尾随同一文件。
如何打开见 [/web/control-ui](/web/control-ui)。

### 仅通道日志

筛选通道活动（WhatsApp/Telegram 等）：

```bash
moltbot channels logs --channel whatsapp
```

## 日志格式

### 文件日志（JSONL）

日志文件每行一个 JSON 对象。CLI 与 Control UI 解析这些条目并渲染结构化输出（时间、级别、子系统、消息）。

### 控制台输出

控制台日志 **感知 TTY** 并以可读性格式化：

- 子系统前缀（如 `gateway/channels/whatsapp`）
- 级别颜色（info/warn/error）
- 可选的紧凑或 JSON 模式

控制台格式由 `logging.consoleStyle` 控制。

## 日志配置

所有日志配置都在 `~/.clawdbot/moltbot.json` 的 `logging` 下。

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/moltbot/moltbot-YYYY-MM-DD.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools",
    "redactPatterns": [
      "sk-.*"
    ]
  }
}
```

### 日志级别

- `logging.level`：**文件日志**（JSONL）级别。
- `logging.consoleLevel`：**控制台**详细度。

`--verbose` 只影响控制台输出；不会改变文件日志级别。

### 控制台样式

`logging.consoleStyle`：

- `pretty`：友好格式、带颜色、含时间戳。
- `compact`：更紧凑（适合长会话）。
- `json`：每行 JSON（便于处理）。

### 脱敏

工具摘要可在输出到控制台前屏蔽敏感 token：

- `logging.redactSensitive`：`off` | `tools`（默认：`tools`）
- `logging.redactPatterns`：覆盖默认集合的正则字符串列表

脱敏仅影响 **控制台输出**，不会修改文件日志。

## Diagnostics 与 OpenTelemetry

Diagnostics 是结构化、可机读的事件，用于模型运行 **以及** 消息流遥测（webhooks、队列、会话状态）。它们 **不** 取代日志；用于喂给指标、链路与其他导出器。

Diagnostics 事件在进程内发出，但只有在启用 diagnostics 与导出插件时才会附加导出器。

### OpenTelemetry 与 OTLP

- **OpenTelemetry（OTel）**：用于 trace、metrics、logs 的数据模型 + SDK。
- **OTLP**：将 OTel 数据导出到采集器/后端的协议。
- Moltbot 目前通过 **OTLP/HTTP（protobuf）** 导出。

### 导出的信号

- **Metrics**：计数器 + 直方图（token 使用、消息流、排队）。
- **Traces**：模型使用与 webhook/消息处理的 spans。
- **Logs**：当启用 `diagnostics.otel.logs` 时通过 OTLP 导出日志。
  日志量可能很大，请结合 `logging.level` 与导出器过滤。

### 诊断事件目录

模型使用：
- `model.usage`：tokens、成本、耗时、上下文、provider/model/channel、session ids。

消息流：
- `webhook.received`：按通道的 webhook 入站。
- `webhook.processed`：webhook 处理 + 时长。
- `webhook.error`：webhook 处理错误。
- `message.queued`：消息入队。
- `message.processed`：结果 + 时长 + 可选错误。

队列 + 会话：
- `queue.lane.enqueue`：命令队列 lane 入队 + 深度。
- `queue.lane.dequeue`：命令队列 lane 出队 + 等待时间。
- `session.state`：会话状态变化 + 原因。
- `session.stuck`：会话卡住告警 + 时长。
- `run.attempt`：运行重试/尝试元数据。
- `diagnostic.heartbeat`：聚合计数器（webhooks/queue/session）。

### 启用 diagnostics（无导出）

当你希望插件或自定义 sink 读取 diagnostics 事件时使用：

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### Diagnostics flags（定向日志）

用 flags 打开额外的定向 debug 日志，而无需提升 `logging.level`。
flags 不区分大小写并支持通配符（如 `telegram.*` 或 `*`）。

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

环境变量覆盖（一次性）：

```
CLAWDBOT_DIAGNOSTICS=telegram.http,telegram.payload
```

说明：
- flag 日志写入标准日志文件（与 `logging.file` 相同）。
- 输出仍会按 `logging.redactSensitive` 脱敏。
- 完整指南：[/diagnostics/flags](/diagnostics/flags)。

### 导出到 OpenTelemetry

通过 `diagnostics-otel` 插件（OTLP/HTTP）导出 diagnostics。
兼容任何支持 OTLP/HTTP 的 OpenTelemetry 采集器/后端。

```json
{
  "plugins": {
    "allow": ["diagnostics-otel"],
    "entries": {
      "diagnostics-otel": {
        "enabled": true
      }
    }
  },
  "diagnostics": {
    "enabled": true,
    "otel": {
      "enabled": true,
      "endpoint": "http://otel-collector:4318",
      "protocol": "http/protobuf",
      "serviceName": "moltbot-gateway",
      "traces": true,
      "metrics": true,
      "logs": true,
      "sampleRate": 0.2,
      "flushIntervalMs": 60000
    }
  }
}
```

说明：
- 也可用 `moltbot plugins enable diagnostics-otel` 启用插件。
- `protocol` 目前仅支持 `http/protobuf`，`grpc` 会被忽略。
- Metrics 包含 token 使用、成本、上下文大小、运行耗时以及消息流计数/直方图（webhooks、队列、会话状态、队列深度/等待）。
- Traces/Metrics 可用 `traces` / `metrics` 开关（默认开启）。Traces 包含模型使用 spans 与 webhook/消息处理 spans（启用时）。
- 采集器需要认证时可设置 `headers`。
- 支持环境变量：`OTEL_EXPORTER_OTLP_ENDPOINT`、`OTEL_SERVICE_NAME`、`OTEL_EXPORTER_OTLP_PROTOCOL`。

### 导出指标（名称 + 类型）

模型使用：
- `moltbot.tokens`（counter，attrs：`moltbot.token`、`moltbot.channel`、
  `moltbot.provider`、`moltbot.model`）
- `moltbot.cost.usd`（counter，attrs：`moltbot.channel`、`moltbot.provider`、
  `moltbot.model`）
- `moltbot.run.duration_ms`（histogram，attrs：`moltbot.channel`、
  `moltbot.provider`、`moltbot.model`）
- `moltbot.context.tokens`（histogram，attrs：`moltbot.context`、
  `moltbot.channel`、`moltbot.provider`、`moltbot.model`）

消息流：
- `moltbot.webhook.received`（counter，attrs：`moltbot.channel`、
  `moltbot.webhook`）
- `moltbot.webhook.error`（counter，attrs：`moltbot.channel`、
  `moltbot.webhook`）
- `moltbot.webhook.duration_ms`（histogram，attrs：`moltbot.channel`、
  `moltbot.webhook`）
- `moltbot.message.queued`（counter，attrs：`moltbot.channel`、
  `moltbot.source`）
- `moltbot.message.processed`（counter，attrs：`moltbot.channel`、
  `moltbot.outcome`）
- `moltbot.message.duration_ms`（histogram，attrs：`moltbot.channel`、
  `moltbot.outcome`）

队列 + 会话：
- `moltbot.queue.lane.enqueue`（counter，attrs：`moltbot.lane`）
- `moltbot.queue.lane.dequeue`（counter，attrs：`moltbot.lane`）
- `moltbot.queue.depth`（histogram，attrs：`moltbot.lane` 或
  `moltbot.channel=heartbeat`）
- `moltbot.queue.wait_ms`（histogram，attrs：`moltbot.lane`）
- `moltbot.session.state`（counter，attrs：`moltbot.state`、`moltbot.reason`）
- `moltbot.session.stuck`（counter，attrs：`moltbot.state`）
- `moltbot.session.stuck_age_ms`（histogram，attrs：`moltbot.state`）
- `moltbot.run.attempt`（counter，attrs：`moltbot.attempt`）

### 导出 spans（名称 + 关键属性）

- `moltbot.model.usage`
  - `moltbot.channel`、`moltbot.provider`、`moltbot.model`
  - `moltbot.sessionKey`、`moltbot.sessionId`
  - `moltbot.tokens.*`（input/output/cache_read/cache_write/total）
- `moltbot.webhook.processed`
  - `moltbot.channel`、`moltbot.webhook`、`moltbot.chatId`
- `moltbot.webhook.error`
  - `moltbot.channel`、`moltbot.webhook`、`moltbot.chatId`、
    `moltbot.error`
- `moltbot.message.processed`
  - `moltbot.channel`、`moltbot.outcome`、`moltbot.chatId`、
    `moltbot.messageId`、`moltbot.sessionKey`、`moltbot.sessionId`、
    `moltbot.reason`
- `moltbot.session.stuck`
  - `moltbot.state`、`moltbot.ageMs`、`moltbot.queueDepth`、
    `moltbot.sessionKey`、`moltbot.sessionId`

### 采样与刷新

- Trace 采样：`diagnostics.otel.sampleRate`（0.0–1.0，仅 root spans）。
- Metrics 导出间隔：`diagnostics.otel.flushIntervalMs`（最小 1000ms）。

### 协议说明

- OTLP/HTTP 端点可通过 `diagnostics.otel.endpoint` 或
  `OTEL_EXPORTER_OTLP_ENDPOINT` 设置。
- 若端点已包含 `/v1/traces` 或 `/v1/metrics`，会按原样使用。
- 若端点已包含 `/v1/logs`，日志也按原样使用。
- `diagnostics.otel.logs` 启用主日志器的 OTLP 日志导出。

### 日志导出行为

- OTLP 日志使用与 `logging.file` 相同的结构化记录。
- 遵循 `logging.level`（文件日志级别）。控制台脱敏 **不** 适用于 OTLP 日志。
- 高流量部署应使用 OTLP 采集器的采样/过滤。

## 排障提示

- **Gateway 不可达？** 先运行 `moltbot doctor`。
- **日志为空？** 检查 Gateway 是否运行且写入 `logging.file` 指定路径。
- **需要更多细节？** 将 `logging.level` 设为 `debug` 或 `trace` 后重试。
