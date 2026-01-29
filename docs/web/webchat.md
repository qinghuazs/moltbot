---
summary: "Loopback WebChat 静态入口与 Gateway WS 聊天 UI"
read_when:
  - 调试或配置 WebChat 访问
---
# WebChat（Gateway WebSocket UI）

状态：macOS/iOS 的 SwiftUI 聊天 UI 直接连接 Gateway WebSocket。

## 它是什么
- Gateway 的原生聊天 UI（无内嵌浏览器，也不需要本地静态服务器）。
- 使用与其他渠道相同的会话与路由规则。
- 路由确定性：回复总是回到 WebChat。

## 快速开始
1) 启动 gateway。
2) 打开 WebChat UI（macOS/iOS 应用）或 Control UI 的聊天标签。
3) 确保配置了 gateway 认证（默认需要，即便 loopback）。

## 工作方式（行为）
- UI 连接到 Gateway WebSocket 并使用 `chat.history`、`chat.send`、`chat.inject`。
- `chat.inject` 直接向转录追加助手注记，并广播到 UI（不运行 agent）。
- 历史始终从 gateway 获取（不监视本地文件）。
- 如果 gateway 不可达，WebChat 为只读。

## 远程使用
- 远程模式通过 SSH/Tailscale 隧道转发 gateway WebSocket。
- 不需要单独运行 WebChat 服务器。

## 配置参考（WebChat）
完整配置：[Configuration](/gateway/configuration)

渠道选项：
- 没有单独的 `webchat.*` 配置块。WebChat 使用 gateway 端点与下列认证设置。

相关全局选项：
- `gateway.port`、`gateway.bind`：WebSocket 主机和端口。
- `gateway.auth.mode`、`gateway.auth.token`、`gateway.auth.password`：WebSocket 认证。
- `gateway.remote.url`、`gateway.remote.token`、`gateway.remote.password`：远程 gateway 目标。
- `session.*`：会话存储与 main key 默认值。
