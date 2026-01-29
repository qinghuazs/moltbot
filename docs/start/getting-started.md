---
summary: "新手指南：从零到第一条消息（向导、认证、渠道、配对）"
read_when:
  - 从零开始第一次设置
  - 想要最快路径：安装 → 引导 → 第一条消息
---

# 入门

目标：尽可能快地从**零**到**第一条可用聊天**（默认配置合理）。

最快聊天方式：打开 Control UI（无需配置渠道）。运行 `moltbot dashboard`
并在浏览器中聊天，或在 gateway 主机上打开 `http://127.0.0.1:18789/`。
文档：[Dashboard](/web/dashboard) 与 [Control UI](/web/control-ui)。

推荐路径：使用 **CLI 引导向导**（`moltbot onboard`）。它会设置：
- 模型和认证（推荐 OAuth）
- gateway 设置
- 渠道（WhatsApp/Telegram/Discord/Mattermost 插件等）
- 配对默认值（安全 DM）
- 工作区初始化和技能
- 可选的后台服务

如果你想看更深入的参考页面：
[Wizard](/start/wizard)、[Setup](/start/setup)、[Pairing](/start/pairing)、[Security](/gateway/security)。

沙箱说明：`agents.defaults.sandbox.mode: "non-main"` 使用 `session.mainKey`（默认 `"main"`），
因此群组和频道会话会被沙箱化。如果你希望主 agent 始终在宿主机运行，请设置显式按 agent 覆盖：

```json
{
  "routing": {
    "agents": {
      "main": {
        "workspace": "~/clawd",
        "sandbox": { "mode": "off" }
      }
    }
  }
}
```

## 0) 先决条件

- Node `>=22`
- `pnpm`（可选；源码构建推荐）
- **推荐：** Brave Search API key 用于网页搜索。最快方式：
  `moltbot configure --section web`（写入 `tools.web.search.apiKey`）。
  见 [Web tools](/tools/web)。

macOS：如果要构建应用，请安装 Xcode / CLT。仅 CLI + gateway 时只需 Node。
Windows：使用 **WSL2**（推荐 Ubuntu）。强烈建议使用 WSL2；原生 Windows 未充分测试，问题更多且工具兼容性更差。先安装 WSL2，再在 WSL 中执行 Linux 步骤。见 [Windows (WSL2)](/platforms/windows)。

## 1) 安装 CLI（推荐）

```bash
curl -fsSL https://molt.bot/install.sh | bash
```

安装器选项（安装方式、非交互、从 GitHub）：[Install](/install)。

Windows（PowerShell）：

```powershell
iwr -useb https://molt.bot/install.ps1 | iex
```

替代方式（全局安装）：

```bash
npm install -g moltbot@latest
```

```bash
pnpm add -g moltbot@latest
```

## 2) 运行引导向导（并安装服务）

```bash
moltbot onboard --install-daemon
```

你将选择的内容：
- **本地或远程** gateway
- **认证**：OpenAI Code（Codex）订阅（OAuth）或 API key。Anthropic 推荐 API key；也支持 `claude setup-token`。
- **提供方**：WhatsApp 二维码登录、Telegram/Discord bot token、Mattermost 插件 token 等。
- **后台服务**：安装后台服务（launchd/systemd；WSL2 使用 systemd）
  - **运行时**：Node（推荐；WhatsApp/Telegram 必需）。**不推荐** Bun。
- **Gateway token**：向导会默认生成（即便在 loopback），并保存到 `gateway.auth.token`。

向导文档：[Wizard](/start/wizard)

### 认证位置（重要）

- **推荐的 Anthropic 路径：** 设置 API key（向导可为服务保存）。如果你想复用 Claude Code 凭据，也支持 `claude setup-token`。

- OAuth 凭据（旧版导入）：`~/.clawdbot/credentials/oauth.json`
- 认证配置（OAuth + API keys）：`~/.clawdbot/agents/<agentId>/agent/auth-profiles.json`

无头或服务器提示：先在常用机器上完成 OAuth，再把 `oauth.json` 复制到 gateway 主机。

## 3) 启动 Gateway

如果你在引导中安装了服务，Gateway 应该已经在运行：

```bash
moltbot gateway status
```

手动运行（前台）：

```bash
moltbot gateway --port 18789 --verbose
```

仪表盘（本地 loopback）：`http://127.0.0.1:18789/`
如果配置了 token，请在 Control UI 设置中粘贴（存储为 `connect.params.auth.token`）。

⚠️ **Bun 警告（WhatsApp + Telegram）：** Bun 在这些渠道上存在已知问题。若使用 WhatsApp 或 Telegram，请用 **Node** 运行 Gateway。

## 3.5) 快速验证（2 分钟）

```bash
moltbot status
moltbot health
moltbot security audit --deep
```

## 4) 配对并连接第一个聊天入口

### WhatsApp（二维码登录）

```bash
moltbot channels login
```

在 WhatsApp 中打开：设置 → 已连接的设备。

WhatsApp 文档：[WhatsApp](/channels/whatsapp)

### Telegram Discord 等

向导可以为你写入 token 和配置。如果你更喜欢手动配置，从这里开始：
- Telegram：[Telegram](/channels/telegram)
- Discord：[Discord](/channels/discord)
- Mattermost（插件）：[Mattermost](/channels/mattermost)

**Telegram 私信提示：** 第一条私信会返回配对码。你需要批准它（见下一步），否则机器人不会回复。

## 5) 私信安全（配对审批）

默认策略：未知私信会获得一个短码，直到审批前消息不会被处理。
如果你的第一条私信没有回复，请批准配对：

```bash
moltbot pairing list whatsapp
moltbot pairing approve whatsapp <code>
```

配对文档：[Pairing](/start/pairing)

## 从源码运行（开发）

如果你正在开发 Moltbot 本身，可从源码运行：

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build
moltbot onboard --install-daemon
```

如果你还没有全局安装，可在仓库中用 `pnpm moltbot ...` 运行引导。
`pnpm build` 也会打包 A2UI 资源；如果只需要这一步，使用 `pnpm canvas:a2ui:bundle`。

Gateway（从仓库运行）：

```bash
node moltbot.mjs gateway --port 18789 --verbose
```

## 7) 端到端验证

在新的终端里发送测试消息：

```bash
moltbot message send --target +15555550123 --message "Hello from Moltbot"
```

如果 `moltbot health` 显示 “no auth configured”，请回到向导设置 OAuth 或 key 认证，否则 agent 无法回复。

提示：`moltbot status --all` 是最适合粘贴的只读调试报告。
健康探测：`moltbot health`（或 `moltbot status --deep`）会向运行中的 gateway 请求健康快照。

## 下一步（可选但推荐）

- macOS 菜单栏应用 + 语音唤醒：[macOS app](/platforms/macos)
- iOS/Android 节点（Canvas/相机/语音）：[Nodes](/nodes)
- 远程访问（SSH 隧道 / Tailscale Serve）：[Remote access](/gateway/remote) 与 [Tailscale](/gateway/tailscale)
- 常驻与 VPN 方案：[Remote access](/gateway/remote)、[exe.dev](/platforms/exe-dev)、[Hetzner](/platforms/hetzner)、[macOS remote](/platforms/mac/remote)
