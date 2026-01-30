---
summary: "Moltbot macOS 伴侣应用（菜单栏 + gateway 代理）"
read_when:
  - 实现 macOS 应用功能
  - 修改 macOS 上的 gateway 生命周期或节点桥接
---
# Moltbot macOS 伴侣应用（菜单栏 + gateway 代理）

macOS 应用是 Moltbot 的**菜单栏伴侣**。它负责权限管理、在本地管理或连接 Gateway（launchd 或手动），并将 macOS 能力作为节点暴露给 agent。

## 功能

- 在菜单栏显示原生通知与状态。
- 管理 TCC 授权（通知、辅助功能、屏幕录制、麦克风、语音识别、自动化/AppleScript）。
- 运行或连接 Gateway（本地或远程）。
- 暴露 macOS 专有工具（Canvas、Camera、Screen Recording、`system.run`）。
- 在**远程**模式启动本地节点主机服务（launchd），在**本地**模式停止它。
- 可选托管 **PeekabooBridge** 用于 UI 自动化。
- 按需安装全局 CLI（`moltbot`，通过 npm/pnpm；Gateway 运行时不推荐 bun）。

## 本地模式与远程模式

- **本地**（默认）：若存在本地 Gateway 则连接；否则通过 `moltbot gateway install` 启用 launchd 服务。
- **远程**：应用通过 SSH/Tailscale 连接远程 Gateway，且不会启动本地进程。
  应用会启动本地**节点主机服务**，让远程 Gateway 可访问此 Mac。
应用不会以子进程方式启动 Gateway。

## Launchd 控制

应用管理每用户 LaunchAgent，标签为 `bot.molt.gateway`
（使用 `--profile`/`CLAWDBOT_PROFILE` 时为 `bot.molt.<profile>`；旧版 `com.clawdbot.*` 仍可卸载）。

```bash
launchctl kickstart -k gui/$UID/bot.molt.gateway
launchctl bootout gui/$UID/bot.molt.gateway
```

使用命名 profile 时，将标签替换为 `bot.molt.<profile>`。

若 LaunchAgent 未安装，可在应用中启用或运行 `moltbot gateway install`。

## 节点能力（mac）

macOS 应用作为节点对外呈现。常见命令：

- Canvas：`canvas.present`、`canvas.navigate`、`canvas.eval`、`canvas.snapshot`、`canvas.a2ui.*`
- Camera：`camera.snap`、`camera.clip`
- Screen：`screen.record`
- System：`system.run`、`system.notify`

节点会上报 `permissions` 映射，以便 agent 判断可用能力。

节点服务与应用 IPC：
- 无头节点主机服务运行时（远程模式），作为节点连接 Gateway WS。
- `system.run` 通过本地 Unix socket 在 macOS 应用内执行（UI/TCC 上下文）；提示与输出都保留在应用内。

图示（SCI）：
```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## Exec 审批（system.run）

`system.run` 由 macOS 应用中的 **Exec approvals** 控制（Settings → Exec approvals）。
安全策略 + 询问 + allowlist 保存在本地：

```
~/.clawdbot/exec-approvals.json
```

示例：

```json
{
  "version": 1,
  "defaults": {
    "security": "deny",
    "ask": "on-miss"
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [
        { "pattern": "/opt/homebrew/bin/rg" }
      ]
    }
  }
}
```

说明：
- `allowlist` 条目是解析后二进制路径的 glob 模式。
- 在提示中选择 “Always Allow” 会将命令添加到 allowlist。
- `system.run` 的环境变量覆盖会被过滤（移除 `PATH`、`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`），再与应用环境合并。

## Deep links

应用注册了 `moltbot://` URL scheme 用于本地操作。

### `moltbot://agent`

触发 Gateway 的 `agent` 请求。

```bash
open 'moltbot://agent?message=Hello%20from%20deep%20link'
```

查询参数：
- `message`（必填）
- `sessionKey`（可选）
- `thinking`（可选）
- `deliver` / `to` / `channel`（可选）
- `timeoutSeconds`（可选）
- `key`（可选的无人值守 key）

安全：
- 没有 `key` 时应用会提示确认。
- 有效 `key` 可无人值守运行（用于个人自动化）。

## 引导流程（典型）

1) 安装并启动 **Moltbot.app**。
2) 完成权限清单（TCC 提示）。
3) 确保处于**本地模式**且 Gateway 运行中。
4) 如需终端访问，安装 CLI。

## 构建与开发流程（原生）

- `cd apps/macos && swift build`
- `swift run Moltbot`（或 Xcode）
- 打包应用：`scripts/package-mac-app.sh`

## 调试 gateway 连接（macOS CLI）

使用调试 CLI 复现 macOS 应用的 Gateway WebSocket 握手与发现逻辑，无需启动应用。

```bash
cd apps/macos
swift run moltbot-mac connect --json
swift run moltbot-mac discover --timeout 3000 --json
```

连接选项：
- `--url <ws://host:port>`：覆盖配置
- `--mode <local|remote>`：从配置解析（默认：配置或本地）
- `--probe`：强制新的健康探测
- `--timeout <ms>`：请求超时（默认：`15000`）
- `--json`：结构化输出便于比对

发现选项：
- `--include-local`：包含通常会被过滤为“本地”的 gateway
- `--timeout <ms>`：发现总时长（默认：`2000`）
- `--json`：结构化输出便于比对

提示：对比 `moltbot gateway discover --json`，可判断 macOS 应用的发现管线（NWBrowser + tailnet DNS-SD 回退）是否与 Node CLI 的 `dns-sd` 发现不同。

## 远程连接底层（SSH 隧道）

当 macOS 应用运行在**远程**模式时，会打开 SSH 隧道，让本地 UI 组件像连接 localhost 一样访问远程 Gateway。

### 控制隧道（Gateway WebSocket 端口）
- **用途：** 健康检查、状态、Web Chat、配置与其他控制面调用。
- **本地端口：** Gateway 端口（默认 `18789`），保持稳定。
- **远端端口：** 远程主机上的同一 Gateway 端口。
- **行为：** 不使用随机本地端口；应用复用已有健康隧道或在需要时重启。
- **SSH 形式：** `ssh -N -L <local>:127.0.0.1:<remote>`，带 BatchMode + ExitOnForwardFailure + keepalive 选项。
- **IP 记录：** SSH 隧道使用 loopback，因此 gateway 看到的节点 IP 为 `127.0.0.1`。如需显示真实客户端 IP，请使用 **Direct (ws/wss)** 传输（见 [macOS remote access](/platforms/mac/remote)）。

设置步骤见 [macOS remote access](/platforms/mac/remote)。协议细节见 [Gateway protocol](/gateway/protocol)。

## 相关文档

- [Gateway runbook](/gateway)
- [Gateway（macOS）](/platforms/mac/bundled-gateway)
- [macOS permissions](/platforms/mac/permissions)
- [Canvas](/platforms/mac/canvas)
