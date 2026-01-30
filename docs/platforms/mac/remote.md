---
summary: "通过 SSH 控制远程 Moltbot gateway 的 macOS 应用流程"
read_when:
  - 设置或调试 mac 的远程控制
---
# 远程 Moltbot（macOS ⇄ 远程主机）

该流程让 macOS 应用作为远程控制器，控制运行在另一台主机（桌面/服务器）上的 Moltbot gateway。它是应用的 **Remote over SSH** 功能。所有功能（健康检查、Voice Wake 转发、Web Chat）都复用 *Settings → General* 中的远程 SSH 配置。

## 模式
- **Local（本机）**：一切在本机运行，无 SSH。
- **Remote over SSH（默认）**：在远程主机执行 Moltbot 命令。mac 应用使用 `-o BatchMode` + 你的 key，并建立本地端口转发的 SSH 连接。
- **Remote direct（ws/wss）**：不使用 SSH 隧道。mac 应用直接连接 gateway URL（例如 Tailscale Serve 或公网 HTTPS 反向代理）。

## 远程传输方式
远程模式支持两种传输：
- **SSH 隧道**（默认）：使用 `ssh -N -L ...` 将 gateway 端口转发到 localhost。由于隧道是 loopback，gateway 看到的节点 IP 为 `127.0.0.1`。
- **Direct（ws/wss）**：直接连接 gateway URL，gateway 会看到真实客户端 IP。

## 远程主机先决条件
1) 安装 Node + pnpm 并构建/安装 Moltbot CLI（`pnpm install && pnpm build && pnpm link --global`）。
2) 确保 `moltbot` 对非交互 shell 可见（必要时软链到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3) 打开 SSH 并使用 key 认证。推荐使用 **Tailscale** IP，跨局域网更稳定。

## macOS 应用设置
1) 打开 *Settings → General*。
2) 在 **Moltbot runs** 中选择 **Remote over SSH** 并设置：
   - **Transport**：**SSH tunnel** 或 **Direct (ws/wss)**。
   - **SSH target**：`user@host`（可选 `:port`）。
     - 若 gateway 在同一局域网且广播 Bonjour，可从发现列表中选择自动填充。
   - **Gateway URL**（Direct 时）：`wss://gateway.example.ts.net`（本地/LAN 可用 `ws://...`）。
   - **Identity file**（高级）：你的 key 路径。
   - **Project root**（高级）：用于运行命令的远程仓库路径。
   - **CLI path**（高级）：可执行的 `moltbot` 入口/二进制路径（若广播可自动填充）。
3) 点击 **Test remote**。成功表示远程 `moltbot status --json` 可运行。失败通常是 PATH/CLI 问题；exit 127 表示远程找不到 CLI。
4) 健康检查与 Web Chat 将自动通过该 SSH 隧道运行。

## Web Chat
- **SSH 隧道**：Web Chat 连接到转发后的 WebSocket 控制端口（默认 18789）。
- **Direct（ws/wss）**：Web Chat 直接连接配置的 gateway URL。
- 不再有单独的 WebChat HTTP 服务器。

## 权限
- 远程主机需要与本机相同的 TCC 权限（Automation、Accessibility、Screen Recording、Microphone、Speech Recognition、Notifications）。在那台机器上完成引导一次即可授权。
- 节点通过 `node.list` / `node.describe` 上报权限状态，便于 agent 判断可用能力。

## 安全说明
- 优先让远程主机 Gateway 绑定 loopback，并通过 SSH 或 Tailscale 连接。
- 若 Gateway 绑定到非 loopback，必须启用 token/password 认证。
- 见 [Security](/gateway/security) 与 [Tailscale](/gateway/tailscale)。

## WhatsApp 远程登录流程
- 在**远程主机**运行 `moltbot channels login --verbose`。用手机扫码。
- 若认证过期，请在远程主机重新登录。健康检查会提示连接问题。

## 故障排查
- **exit 127 / not found**：`moltbot` 不在非登录 shell 的 PATH 中。把它加入 `/etc/paths`、shell rc，或软链到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**：检查 SSH 可达性、PATH，以及 Baileys 是否已登录（`moltbot status --json`）。
- **Web Chat 卡住**：确认远程主机上的 gateway 运行中，并且转发端口与 gateway WS 端口一致；UI 需要健康的 WS 连接。
- **Node IP 显示 127.0.0.1**：SSH 隧道的预期行为。如需真实客户端 IP，将 **Transport** 切换为 **Direct (ws/wss)**。
- **Voice Wake**：远程模式会自动转发触发词，无需单独 forwarder。

## 通知音效

可通过脚本使用 `moltbot` 与 `node.invoke` 为每条通知选择音效，例如：

```bash
moltbot nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

应用中已没有全局“默认音效”开关；调用方需为每次请求选择音效（或不指定）。
