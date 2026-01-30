---
summary: "Moltbot Gateway CLI（`moltbot gateway`），用于运行、查询与发现 gateway"
read_when:
  - 通过 CLI 运行 Gateway（开发或服务器）
  - 调试 Gateway 认证、绑定模式与连通性
  - 通过 Bonjour 发现 gateway（LAN 与 tailnet）
---

# Gateway CLI

Gateway 是 Moltbot 的 WebSocket 服务端（渠道、节点、会话、hooks）。

本页子命令都在 `moltbot gateway …` 下。

相关文档：
- [/gateway/bonjour](/gateway/bonjour)
- [/gateway/discovery](/gateway/discovery)
- [/gateway/configuration](/gateway/configuration)

## 运行 Gateway

运行本地 Gateway 进程：

```bash
moltbot gateway
```

前台别名：

```bash
moltbot gateway run
```

说明：
- 默认情况下，若 `~/.clawdbot/moltbot.json` 未设置 `gateway.mode=local`，Gateway 会拒绝启动。临时开发可用 `--allow-unconfigured`。
- 未启用认证时禁止绑定到 loopback 之外（安全护栏）。
- `SIGUSR1` 在授权时触发进程内重启（启用 `commands.restart` 或使用 gateway 工具或 config apply/update）。
- `SIGINT`/`SIGTERM` 会停止 gateway 进程，但不会恢复自定义终端状态。如你用 TUI 或 raw 模式封装 CLI，请在退出前恢复终端。

### 选项

- `--port <port>`：WebSocket 端口（默认来自配置或环境；通常为 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：监听绑定模式。
- `--auth <token|password>`：认证模式覆盖。
- `--token <token>`：令牌覆盖（同时为进程设置 `CLAWDBOT_GATEWAY_TOKEN`）。
- `--password <password>`：密码覆盖（同时为进程设置 `CLAWDBOT_GATEWAY_PASSWORD`）。
- `--tailscale <off|serve|funnel>`：通过 Tailscale 暴露 Gateway。
- `--tailscale-reset-on-exit`：退出时重置 Tailscale serve/funnel 配置。
- `--allow-unconfigured`：允许在配置未设置 `gateway.mode=local` 时启动。
- `--dev`：若缺失则创建 dev 配置与工作区（跳过 BOOTSTRAP.md）。
- `--reset`：重置 dev 配置、凭据、会话与工作区（需要 `--dev`）。
- `--force`：启动前杀掉目标端口上的现有监听器。
- `--verbose`：详细日志。
- `--claude-cli-logs`：仅显示 claude-cli 日志到控制台（并启用其 stdout/stderr）。
- `--ws-log <auto|full|compact>`：websocket 日志样式（默认 `auto`）。
- `--compact`：`--ws-log compact` 的别名。
- `--raw-stream`：将原始模型流事件记录为 jsonl。
- `--raw-stream-path <path>`：原始流 jsonl 路径。

## 查询运行中的 Gateway

所有查询命令使用 WebSocket RPC。

输出模式：
- 默认：适合人类阅读（TTY 中带颜色）。
- `--json`：机器可读 JSON（无样式与 spinner）。
- `--no-color`（或 `NO_COLOR=1`）：禁用 ANSI，同时保留布局。

通用选项（支持时）：
- `--url <url>`：Gateway WebSocket URL。
- `--token <token>`：Gateway 令牌。
- `--password <password>`：Gateway 密码。
- `--timeout <ms>`：超时或预算（按命令不同）。
- `--expect-final`：等待“final”响应（代理调用）。

### `gateway health`

```bash
moltbot gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` 显示 Gateway 服务（launchd/systemd/schtasks）与可选 RPC 探测。

```bash
moltbot gateway status
moltbot gateway status --json
```

选项：
- `--url <url>`：覆盖探测 URL。
- `--token <token>`：探测用令牌认证。
- `--password <password>`：探测用密码认证。
- `--timeout <ms>`：探测超时（默认 `10000`）。
- `--no-probe`：跳过 RPC 探测（仅服务视图）。
- `--deep`：额外扫描系统级服务。

### `gateway probe`

`gateway probe` 是“调试一切”命令。它总是探测：
- 配置的远程 gateway（如有），以及
- localhost（loopback），**即使已配置远程**。

如果多个 gateway 可达，会全部打印。使用隔离 profile 或端口时可支持多网关（例如救援 bot），但多数安装仍只有一个 gateway。

```bash
moltbot gateway probe
moltbot gateway probe --json
```

#### SSH 远程（与 macOS app 对齐）

macOS 应用的“Remote over SSH”模式使用本地端口转发，让远程 gateway（可能只绑定 loopback）在 `ws://127.0.0.1:<port>` 可达。

CLI 等价：

```bash
moltbot gateway probe --ssh user@gateway-host
```

选项：
- `--ssh <target>`：`user@host` 或 `user@host:port`（端口默认 `22`）。
- `--ssh-identity <path>`：身份文件。
- `--ssh-auto`：选择发现到的第一个 gateway 主机作为 SSH 目标（仅 LAN/WAB）。

配置（可选，作为默认值）：
- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

底层 RPC 辅助。

```bash
moltbot gateway call status
moltbot gateway call logs.tail --params '{"sinceMs": 60000}'
```

## 管理 Gateway 服务

```bash
moltbot gateway install
moltbot gateway start
moltbot gateway stop
moltbot gateway restart
moltbot gateway uninstall
```

说明：
- `gateway install` 支持 `--port`、`--runtime`、`--token`、`--force`、`--json`。
- 生命周期命令支持 `--json` 便于脚本化。

## 发现 gateway（Bonjour）

`gateway discover` 扫描 Gateway 信标（`_moltbot-gw._tcp`）。

- 组播 DNS-SD：`local.`
- 单播 DNS-SD（广域 Bonjour）：`moltbot.internal.`（需要 split DNS + DNS 服务器；见 [/gateway/bonjour](/gateway/bonjour)）

只有启用 Bonjour 发现的 gateway（默认启用）会广播信标。

广域发现记录包含（TXT）：
- `role`（gateway 角色提示）
- `transport`（传输提示，例如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常 `18789`）
- `sshPort`（SSH 端口；未设置时默认为 `22`）
- `tailnetDns`（MagicDNS 主机名，若可用）
- `gatewayTls` / `gatewayTlsSha256`（TLS 启用与证书指纹）
- `cliPath`（可选，远程安装提示）

### `gateway discover`

```bash
moltbot gateway discover
```

选项：
- `--timeout <ms>`：每个命令的超时（browse/resolve）；默认 `2000`。
- `--json`：机器可读输出（同时关闭样式与 spinner）。

示例：

```bash
moltbot gateway discover --timeout 4000
moltbot gateway discover --json | jq '.beacons[].wsUrl'
```
