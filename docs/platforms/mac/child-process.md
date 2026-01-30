---
summary: "macOS 上的 Gateway 生命周期（launchd）"
read_when:
  - 将 mac 应用与 gateway 生命周期集成
---
# macOS 上的 Gateway 生命周期

macOS 应用默认**通过 launchd 管理 Gateway**，不会以子进程启动 Gateway。它会先尝试附加到已在配置端口运行的 Gateway；若不可达，则通过外部 `moltbot` CLI 启用 launchd 服务（无内置运行时）。这可在登录时自动启动，并在崩溃后自动重启。

子进程模式（应用直接启动 Gateway）当前**未使用**。如果你需要与 UI 更紧密耦合，请在终端手动运行 Gateway。

## 默认行为（launchd）

- 应用安装每用户 LaunchAgent，标签为 `bot.molt.gateway`
  （使用 `--profile`/`CLAWDBOT_PROFILE` 时为 `bot.molt.<profile>`；旧版 `com.clawdbot.*` 仍可用）。
- 本地模式启用时，应用确保 LaunchAgent 已加载，并在需要时启动 Gateway。
- 日志写入 launchd gateway 日志路径（可在 Debug Settings 查看）。

常用命令：

```bash
launchctl kickstart -k gui/$UID/bot.molt.gateway
launchctl bootout gui/$UID/bot.molt.gateway
```

使用命名 profile 时，将标签替换为 `bot.molt.<profile>`。

## 未签名开发构建

`scripts/restart-mac.sh --no-sign` 用于没有签名密钥时的快速本地构建。为了避免 launchd 指向未签名的 relay 二进制，它会：

- 写入 `~/.clawdbot/disable-launchagent`。

签名版 `scripts/restart-mac.sh` 若检测到该标记会清除它。手动重置：

```bash
rm ~/.clawdbot/disable-launchagent
```

## 仅附加模式

要强制 macOS 应用**永不安装或管理 launchd**，使用 `--attach-only`（或 `--no-launchd`）启动应用。它会设置 `~/.clawdbot/disable-launchagent`，因此应用只会附加到已运行的 Gateway。Debug Settings 中也可切换同样行为。

## 远程模式

远程模式不会启动本地 Gateway。应用会打开到远程主机的 SSH 隧道并通过该隧道连接。

## 为什么偏好 launchd

- 登录自动启动。
- 内建重启/KeepAlive 机制。
- 可预测的日志与监管。

如果未来需要真正的子进程模式，应作为单独且明确的仅开发模式记录。
