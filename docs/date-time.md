---
summary: "在封装、提示词、工具与连接器中的日期与时间处理"
read_when:
  - 修改时间戳如何展示给模型或用户
  - 排查消息或系统提示中的时间格式
---

# 日期与时间

Moltbot 默认 **传输时间戳使用主机本地时间**，而 **用户时区仅用于系统提示**。
Provider 时间戳会被保留，以保证工具保持原生语义（可通过 `session_status` 获取当前时间）。

## 消息封装（默认本地）

入站消息会被加上时间戳封装（精确到分钟）：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

该封装时间戳 **默认使用主机本地时区**，与 provider 时区无关。

可覆盖：

```json5
{
  agents: {
    defaults: {
      envelopeTimezone: "local", // "utc" | "local" | "user" | IANA timezone
      envelopeTimestamp: "on", // "on" | "off"
      envelopeElapsed: "on" // "on" | "off"
    }
  }
}
```

- `envelopeTimezone: "utc"` 使用 UTC。
- `envelopeTimezone: "local"` 使用主机时区。
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（回退到主机时区）。
- 使用明确的 IANA 时区（如 `"America/Chicago"`）可固定时区。
- `envelopeTimestamp: "off"` 移除封装头中的绝对时间戳。
- `envelopeElapsed: "off"` 移除耗时后缀（如 `+2m`）。

### 示例

**本地（默认）：**

```
[WhatsApp +1555 2026-01-18 00:19 PST] hello
```

**用户时区：**

```
[WhatsApp +1555 2026-01-18 00:19 CST] hello
```

**启用耗时：**

```
[WhatsApp +1555 +30s 2026-01-18T05:19Z] follow-up
```

## 系统提示：当前日期与时间

如果已知用户时区，系统提示会包含专门的
**Current Date & Time** 段落，仅包含 **时区**（无具体时间格式），以保持 prompt 缓存稳定：

```
Time zone: America/Chicago
```

需要当前时间时，请用 `session_status` 工具；status 卡片包含时间戳行。

## 系统事件行（默认本地）

插入到 agent 上下文的队列系统事件，会用与消息封装相同的时区规则加时间戳前缀（默认主机本地）：

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### 配置用户时区与格式

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
      timeFormat: "auto" // auto | 12 | 24
    }
  }
}
```

- `userTimezone` 设置 **用户本地时区** 供 prompt 使用。
- `timeFormat` 控制 prompt 中 **12h/24h 显示**。`auto` 跟随 OS 偏好。

## 时间格式检测（auto）

当 `timeFormat: "auto"` 时，Moltbot 会读取 OS 偏好（macOS/Windows），并回退到 locale 格式。检测值会 **按进程缓存** 以避免重复系统调用。

## 工具负载与连接器（保留原始时间 + 规范字段）

通道工具返回 **provider 原生时间戳** 并补充规范字段：

- `timestampMs`：epoch 毫秒（UTC）
- `timestampUtc`：ISO 8601 UTC 字符串

原始字段会保留以避免信息丢失。

- Slack：API 的类 epoch 字符串
- Discord：UTC ISO 时间戳
- Telegram/WhatsApp：provider 特定的数字/ISO 时间戳

若需要本地时间，请在下游使用已知时区进行转换。

## 相关文档

- [System Prompt](/concepts/system-prompt)
- [Timezones](/concepts/timezone)
- [Messages](/concepts/messages)
