---
summary: "后台执行与进程管理"
read_when:
  - 添加或修改后台执行行为
  - 排查长时间运行的 exec 任务
---

# 后台 Exec 与 Process 工具

Moltbot 通过 `exec` 工具运行 shell 命令，并将长时间任务保存在内存中。`process` 工具用于管理这些后台会话。

## exec 工具

关键参数：
- `command`（必填）
- `yieldMs`（默认 10000）：超过此延迟后自动转后台
- `background`（布尔）：立即后台运行
- `timeout`（秒，默认 1800）：超过此超时时间杀掉进程
- `elevated`（布尔）：在启用/允许提升模式时在宿主机运行
- 需要真实 TTY？设置 `pty: true`。
- `workdir`、`env`

行为：
- 前台运行会直接返回输出。
- 转为后台（显式或超时）后，工具返回 `status: "running"` + `sessionId` 和一段短尾输出。
- 输出保存在内存中，直到会话被轮询或清理。
- 如果 `process` 工具不可用，`exec` 会同步运行并忽略 `yieldMs`/`background`。

## 子进程桥接

当你在 exec/process 工具之外启动长时间运行的子进程（例如 CLI 重启或网关辅助进程），请挂接子进程桥接辅助器，确保终止信号被转发，并在退出/错误时移除监听器。这能避免 systemd 下出现孤儿进程，并让各平台的关闭行为保持一致。

环境变量覆盖：
- `PI_BASH_YIELD_MS`：默认 yield（毫秒）
- `PI_BASH_MAX_OUTPUT_CHARS`：内存输出上限（字符数）
- `CLAWDBOT_BASH_PENDING_MAX_OUTPUT_CHARS`：每个流的待处理 stdout/stderr 上限（字符数）
- `PI_BASH_JOB_TTL_MS`：完成会话的 TTL（毫秒，限制在 1 分钟到 3 小时）

配置（推荐）：
- `tools.exec.backgroundMs`（默认 10000）
- `tools.exec.timeoutSec`（默认 1800）
- `tools.exec.cleanupMs`（默认 1800000）
- `tools.exec.notifyOnExit`（默认 true）：后台 exec 退出时，入队系统事件并请求心跳。

## process 工具

操作：
- `list`：运行中 + 已完成会话
- `poll`：拉取某会话的新输出（也会报告退出状态）
- `log`：读取聚合输出（支持 `offset` + `limit`）
- `write`：写入 stdin（`data`，可选 `eof`）
- `kill`：终止后台会话
- `clear`：从内存移除已完成会话
- `remove`：运行中则 kill，已完成则 clear

注意：
- 只有后台会话会被列出并保存在内存中。
- 进程重启会丢失会话（不落盘）。
- 只有执行 `process poll/log` 并记录了工具结果时，会话日志才会保存到聊天历史。
- `process` 按代理隔离；只能看到该代理启动的会话。
- `process list` 包含派生的 `name`（命令动词 + 目标）便于快速查看。
- `process log` 使用按行的 `offset`/`limit`（省略 `offset` 则抓取最后 N 行）。

## 示例

运行长任务，稍后轮询：
```json
{"tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000}
```
```json
{"tool": "process", "action": "poll", "sessionId": "<id>"}
```

立即后台开始：
```json
{"tool": "exec", "command": "npm run build", "background": true}
```

发送 stdin：
```json
{"tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n"}
```
