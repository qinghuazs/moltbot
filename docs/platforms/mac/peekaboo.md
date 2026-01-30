---
summary: "用于 macOS UI 自动化的 PeekabooBridge 集成"
read_when:
  - 在 Moltbot.app 中托管 PeekabooBridge
  - 通过 Swift Package Manager 集成 Peekaboo
  - 修改 PeekabooBridge 协议/路径
---
# Peekaboo Bridge（macOS UI 自动化）

Moltbot 可作为本地、具备权限感知的 UI 自动化 broker 托管 **PeekabooBridge**。
这样 `peekaboo` CLI 就能复用 macOS 应用的 TCC 权限进行自动化。

## 这是什么（以及不是什么）

- **Host**：Moltbot.app 可作为 PeekabooBridge host。
- **Client**：使用 `peekaboo` CLI（没有单独的 `moltbot ui ...` 入口）。
- **UI**：可视化叠层仍在 Peekaboo.app 中，Moltbot 是薄 broker host。

## 启用 Bridge

在 macOS 应用中：
- Settings → **Enable Peekaboo Bridge**

启用后，Moltbot 会启动本地 UNIX socket 服务器。关闭后会停止 host，`peekaboo` 将回退到其他可用 host。

## 客户端发现顺序

Peekaboo 客户端通常按以下顺序尝试 host：

1. Peekaboo.app（完整 UX）
2. Claude.app（若已安装）
3. Moltbot.app（薄 broker）

使用 `peekaboo bridge status --verbose` 查看当前激活的 host 及其 socket 路径。也可通过：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## 安全与权限

- Bridge 会校验**调用方代码签名**；仅允许 TeamID allowlist（Peekaboo host TeamID + Moltbot app TeamID）。
- 请求约 10 秒超时。
- 缺少权限时，Bridge 返回清晰错误信息，而不是打开系统设置。

## 截图行为（自动化）

截图保存在内存中，并在短时间窗口后自动过期。如需更久，需由客户端重新捕获。

## 故障排查

- 若 `peekaboo` 提示 “bridge client is not authorized”，请确保客户端已正确签名，或仅在**调试**模式下使用 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 运行 host。
- 若找不到 host，打开一个 host 应用（Peekaboo.app 或 Moltbot.app）并确认权限已授权。
