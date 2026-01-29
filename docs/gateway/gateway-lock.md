---
summary: "通过 WebSocket 监听绑定实现 Gateway 单例保护"
read_when:
  - 运行或排查网关进程
  - 调查单实例约束
---
# Gateway 锁

最后更新：2025-12-11

## 原因
- 确保同一主机的同一基础端口只运行一个 Gateway；额外实例需使用隔离 profile 与独立端口。
- 在崩溃/SIGKILL 后不遗留陈旧锁文件。
- 当控制端口被占用时快速失败并给出明确错误。

## 机制
- Gateway 启动即绑定 WebSocket 监听（默认 `ws://127.0.0.1:18789`），使用独占 TCP 监听。
- 若绑定失败且为 `EADDRINUSE`，启动会抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- OS 会在进程退出时自动释放监听（包括崩溃与 SIGKILL），无需单独锁文件或清理步骤。
- 退出时会关闭 WebSocket 服务器与底层 HTTP 服务器，及时释放端口。

## 错误表现
- 若端口被占用，启动抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他绑定失败会表现为 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 运维说明
- 若端口被 *其他* 进程占用，错误相同；释放端口或用 `moltbot gateway --port <port>` 选择新端口。
- macOS 应用在启动 gateway 前仍有轻量 PID 保护；运行时锁由 WebSocket 绑定强制保证。
