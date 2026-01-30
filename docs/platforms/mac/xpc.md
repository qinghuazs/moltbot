---
summary: "Moltbot macOS IPC 架构：应用、gateway 节点传输与 PeekabooBridge"
read_when:
  - 编辑 IPC 协议或菜单栏应用 IPC
---
# Moltbot macOS IPC 架构

**当前模型：**本地 Unix socket 将**节点主机服务**与**macOS 应用**连接，用于 exec 审批与 `system.run`。存在 `moltbot-mac` 调试 CLI 用于发现与连接检查；代理动作仍通过 Gateway WebSocket 与 `node.invoke` 流转。UI 自动化使用 PeekabooBridge。

## 目标
- 单实例 GUI 应用负责所有与 TCC 相关的工作（通知、屏幕录制、麦克风、语音、AppleScript）。
- 小而稳定的自动化面：Gateway + 节点命令，再加 PeekabooBridge 进行 UI 自动化。
- 可预测的权限：始终同一签名 bundle ID，由 launchd 启动，确保 TCC 授权稳定。

## 工作方式
### Gateway 与节点传输
- 应用运行 Gateway（本地模式）并作为节点连接。
- 代理动作通过 `node.invoke` 执行（如 `system.run`、`system.notify`、`canvas.*`）。

### 节点服务与应用 IPC
- 无界面节点主机服务连接到 Gateway WebSocket。
- `system.run` 请求通过本地 Unix socket 转发到 macOS 应用。
- 应用在 UI 上下文执行命令，需要时提示授权并返回输出。

示意图（SCI）：
```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge（UI 自动化）
- UI 自动化使用名为 `bridge.sock` 的独立 UNIX socket 与 PeekabooBridge JSON 协议。
- 主机优先顺序（客户端侧）：Peekaboo.app → Claude.app → Moltbot.app → 本地执行。
- 安全：bridge 主机要求允许的 TeamID；仅 DEBUG 的同 UID 逃生口由 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 守护（Peekaboo 约定）。
- 详情见：[PeekabooBridge usage](/platforms/mac/peekaboo)。

## 运维流程
- 重启或重建：`SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - 结束现有实例
  - Swift 构建与打包
  - 写入、bootstrap 与 kickstart LaunchAgent
- 单实例：若已有相同 bundle ID 实例在运行，应用会提前退出。

## 加固说明
- 所有特权面优先要求 TeamID 匹配。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（仅 DEBUG）可能允许同 UID 的本地调用。
- 所有通信均为本地，未暴露网络 socket。
- TCC 弹窗只应来自 GUI 应用 bundle；保持签名 bundle ID 稳定。
- IPC 加固：socket 权限 `0600`、token、对端 UID 检查、HMAC challenge/response、短 TTL。
