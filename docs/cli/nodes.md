---
summary: "`moltbot nodes` CLI 参考（list/status/approve/invoke、camera/canvas/screen）"
read_when:
  - 您正在管理已配对的节点（摄像头、屏幕、画布）
  - 您需要批准请求或调用节点命令
---

# `moltbot nodes`

管理已配对的节点（设备）并调用节点能力。

相关：
- 节点概述：[节点](/nodes)
- 摄像头：[摄像头节点](/nodes/camera)
- 图像：[图像节点](/nodes/images)

通用选项：
- `--url`、`--token`、`--timeout`、`--json`

## 常用命令

```bash
moltbot nodes list
moltbot nodes list --connected
moltbot nodes list --last-connected 24h
moltbot nodes pending
moltbot nodes approve <requestId>
moltbot nodes status
moltbot nodes status --connected
moltbot nodes status --last-connected 24h
```

`nodes list` 打印待处理/已配对的表格。已配对的行包含最近连接时间（Last Connect）。
使用 `--connected` 仅显示当前已连接的节点。使用 `--last-connected <duration>` 过滤在指定时间内连接过的节点（例如 `24h`、`7d`）。

## 调用/运行

```bash
moltbot nodes invoke --node <id|name|ip> --command <command> --params <json>
moltbot nodes run --node <id|name|ip> <command...>
moltbot nodes run --raw "git status"
moltbot nodes run --agent main --node <id|name|ip> --raw "git status"
```

调用参数：
- `--params <json>`：JSON 对象字符串（默认 `{}`）。
- `--invoke-timeout <ms>`：节点调用超时（默认 `15000`）。
- `--idempotency-key <key>`：可选的幂等键。

### 执行风格默认值

`nodes run` 镜像模型的执行行为（默认值 + 批准）：

- 读取 `tools.exec.*`（加上 `agents.list[].tools.exec.*` 覆盖）。
- 在调用 `system.run` 之前使用执行批准（`exec.approval.request`）。
- 当设置了 `tools.exec.node` 时可以省略 `--node`。
- 需要通告 `system.run` 的节点（macOS 配套应用或无头节点主机）。

参数：
- `--cwd <path>`：工作目录。
- `--env <key=val>`：环境变量覆盖（可重复）。
- `--command-timeout <ms>`：命令超时。
- `--invoke-timeout <ms>`：节点调用超时（默认 `30000`）。
- `--needs-screen-recording`：需要屏幕录制权限。
- `--raw <command>`：运行 shell 字符串（`/bin/sh -lc` 或 `cmd.exe /c`）。
- `--agent <id>`：代理范围的批准/允许列表（默认为配置的代理）。
- `--ask <off|on-miss|always>`、`--security <deny|allowlist|full>`：覆盖。
