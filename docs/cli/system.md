---
summary: "`moltbot system` CLI 参考（系统事件、心跳、存在状态）"
read_when:
  - 您想在不创建 cron 任务的情况下排队系统事件
  - 您需要启用或禁用心跳
  - 您想检查系统存在状态条目
---

# `moltbot system`

网关的系统级助手：排队系统事件、控制心跳和查看存在状态。

## 常用命令

```bash
moltbot system event --text "Check for urgent follow-ups" --mode now
moltbot system heartbeat enable
moltbot system heartbeat last
moltbot system presence
```

## `system event`

在**主**会话上排队系统事件。下一次心跳会将其作为 `System:` 行注入到提示中。使用 `--mode now` 立即触发心跳；`next-heartbeat` 等待下一个计划的时刻。

参数：
- `--text <text>`：必需的系统事件文本。
- `--mode <mode>`：`now` 或 `next-heartbeat`（默认）。
- `--json`：机器可读输出。

## `system heartbeat last|enable|disable`

心跳控制：
- `last`：显示上次心跳事件。
- `enable`：重新开启心跳（如果已禁用则使用此命令）。
- `disable`：暂停心跳。

参数：
- `--json`：机器可读输出。

## `system presence`

列出网关知道的当前系统存在状态条目（节点、实例和类似状态行）。

参数：
- `--json`：机器可读输出。

## 说明

- 需要当前配置可访问的运行中网关（本地或远程）。
- 系统事件是临时的，不会在重启后持久化。
