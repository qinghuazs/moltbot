---
summary: "macOS 上的 Gateway 运行时（外部 launchd 服务）"
read_when:
  - 打包 Moltbot.app
  - 调试 macOS gateway 的 launchd 服务
  - 安装 macOS 的 gateway CLI
---

# macOS 上的 Gateway（外部 launchd）

Moltbot.app 不再内置 Node/Bun 或 Gateway 运行时。macOS 应用
依赖**外部** `moltbot` CLI 安装，不会以子进程启动 Gateway，并通过每用户的 launchd 服务保持 Gateway 运行（若本地已有 Gateway，则直接附加）。

## 安装 CLI（本地模式必需）

在 Mac 上需要 Node 22+，然后全局安装 `moltbot`：

```bash
npm install -g moltbot@<version>
```

macOS 应用的 **Install CLI** 按钮通过 npm/pnpm 走相同流程（Gateway 运行时不推荐 bun）。

## Launchd（Gateway 作为 LaunchAgent）

标签：
- `bot.molt.gateway`（或 `bot.molt.<profile>`；旧版 `com.clawdbot.*` 可能仍存在）

Plist 路径（按用户）：
- `~/Library/LaunchAgents/bot.molt.gateway.plist`
  （或 `~/Library/LaunchAgents/bot.molt.<profile>.plist`）

管理方式：
- macOS 应用在本地模式下负责 LaunchAgent 的安装与更新。
- CLI 也可安装：`moltbot gateway install`。

行为：
- “Moltbot Active” 启用或禁用 LaunchAgent。
- 关闭应用**不会**停止 gateway（由 launchd 保持）。
- 如果配置端口已有 Gateway 运行，应用会附加它，而不是启动新的。

日志：
- launchd stdout/err：`/tmp/moltbot/moltbot-gateway.log`

## 版本兼容

macOS 应用会检查 gateway 版本与自身是否兼容。如不兼容，请更新全局 CLI 以匹配应用版本。

## 烟雾检查

```bash
moltbot --version

CLAWDBOT_SKIP_CHANNELS=1 \
CLAWDBOT_SKIP_CANVAS_HOST=1 \
moltbot gateway --port 18999 --bind loopback
```

然后：

```bash
moltbot gateway call health --url ws://127.0.0.1:18999 --timeout 3000
```
