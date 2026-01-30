---
summary: "外部 CLI 的 RPC 适配器（signal-cli、imsg）与 gateway 模式"
read_when:
  - 添加或修改外部 CLI 集成
  - 排查 RPC 适配器（signal-cli、imsg）
---
# RPC 适配器

Moltbot 通过 JSON-RPC 集成外部 CLI。目前有两种模式。

## 模式 A：HTTP 守护进程（signal-cli）
- `signal-cli` 以守护进程运行，通过 HTTP 提供 JSON-RPC。
- 事件流为 SSE（`/api/v1/events`）。
- 健康探测：`/api/v1/check`。
- 当 `channels.signal.autoStart=true` 时由 Moltbot 接管生命周期。

设置与端点见 [Signal](/channels/signal)。

## 模式 B：stdio 子进程（imsg）
- Moltbot 以子进程方式启动 `imsg rpc`。
- JSON-RPC 通过 stdin/stdout 逐行传输（每行一个 JSON）。
- 无需 TCP 端口，也不需要守护进程。

核心方法：
- `watch.subscribe` -> 通知（`method: "message"`）
- `watch.unsubscribe`
- `send`
- `chats.list`（探测或诊断）

设置与寻址见 [iMessage](/channels/imessage)（优先 `chat_id`）。

## 适配器指南
- Gateway 负责进程生命周期（与 provider 生命周期绑定）。
- RPC 客户端要有韧性：超时、退出后重启。
- 优先使用稳定 ID（如 `chat_id`），避免使用显示字符串。
