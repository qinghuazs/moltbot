---
summary: "CLI 引导向导：Gateway 工作区 渠道 与技能的引导式配置"
read_when:
  - 运行或配置引导向导
  - 设置新机器
---

# 引导向导（CLI）

引导向导是**推荐**的 Moltbot 设置方式，适用于 macOS、Linux 或 Windows（通过 WSL2，强烈推荐）。
它会在一个引导流程里配置本地 Gateway 或远程 Gateway 连接，以及渠道、技能与工作区默认值。

主要入口：

```bash
moltbot onboard
```

最快的第一条聊天：打开 Control UI（无需配置渠道）。运行
`moltbot dashboard` 并在浏览器聊天。文档：[Dashboard](/web/dashboard)。

后续重新配置：

```bash
moltbot configure
```

推荐：设置 Brave Search API key 以便 agent 使用 `web_search`
（`web_fetch` 不需要 key）。最快方式：`moltbot configure --section web`
会写入 `tools.web.search.apiKey`。文档：[Web tools](/tools/web)。

## QuickStart 与 Advanced

向导从 **QuickStart**（默认值）与 **Advanced**（完整控制）开始。

**QuickStart** 保持默认：
- 本地 gateway（loopback）
- 默认工作区（或已有工作区）
- Gateway 端口 **18789**
- Gateway 认证 **Token**（即便 loopback 也会自动生成）
- Tailscale 暴露 **关闭**
- Telegram + WhatsApp 私信默认 **allowlist**（会提示填写手机号）

**Advanced** 暴露所有步骤（模式、工作区、gateway、渠道、daemon、技能）。

## 向导做什么

**本地模式（默认）**会引导：
  - 模型和认证（OpenAI Code（Codex）订阅 OAuth、Anthropic API key（推荐）或 setup-token（粘贴），以及 MiniMax/GLM/Moonshot/AI Gateway 选项）
- 工作区位置与引导文件
- Gateway 设置（端口 绑定 认证 Tailscale）
- 提供方（Telegram、WhatsApp、Discord、Google Chat、Mattermost 插件、Signal）
- Daemon 安装（LaunchAgent / systemd user unit）
- 健康检查
- 技能（推荐）

**远程模式**只配置本地客户端连接到其他地方的 Gateway。
它**不会**在远程主机安装或修改任何内容。

要添加更多隔离的 agent（独立工作区 会话 认证），使用：

```bash
moltbot agents add <name>
```

提示：`--json` **不**等同于非交互模式。脚本中请使用 `--non-interactive`（以及 `--workspace`）。

## 流程细节（本地）

1) **现有配置检测**
   - 如果 `~/.clawdbot/moltbot.json` 存在，选择 **Keep / Modify / Reset**。
   - 重新运行向导**不会**清空任何内容，除非你明确选择 **Reset**
     （或传入 `--reset`）。
   - 如果配置无效或包含旧版键，向导会停止并要求
     先运行 `moltbot doctor`。
   - Reset 使用 `trash`（绝不使用 `rm`），并提供作用域：
     - 仅配置
     - 配置 + 凭据 + 会话
     - 完全重置（也删除工作区）

2) **模型 认证**
   - **Anthropic API key（推荐）**：若已存在 `ANTHROPIC_API_KEY` 则复用，否则提示输入并保存供 daemon 使用。
   - **Anthropic OAuth（Claude Code CLI）**：macOS 上向导会检查钥匙串项 "Claude Code-credentials"（请选择 "Always Allow"，避免 launchd 启动被阻塞）；Linux/Windows 会复用 `~/.claude/.credentials.json`（若存在）。
   - **Anthropic token（粘贴 setup-token）**：在任意机器上运行 `claude setup-token`，然后粘贴 token（可命名；留空=默认）。
   - **OpenAI Code（Codex）订阅（Codex CLI）**：若 `~/.codex/auth.json` 存在，向导可复用。
   - **OpenAI Code（Codex）订阅（OAuth）**：浏览器流程；粘贴 `code#state`。
     - 当模型未设置或为 `openai/*` 时，将 `agents.defaults.model` 设为 `openai-codex/gpt-5.2`。
   - **OpenAI API key**：若存在 `OPENAI_API_KEY` 则复用，否则提示输入并保存到 `~/.clawdbot/.env` 以便 launchd 读取。
   - **OpenCode Zen（多模型代理）**：提示 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，获取地址：https://opencode.ai/auth）。
   - **API key**：保存 key。
   - **Vercel AI Gateway（多模型代理）**：提示 `AI_GATEWAY_API_KEY`。
   - 详情：[Vercel AI Gateway](/providers/vercel-ai-gateway)
   - **MiniMax M2.1**：自动写入配置。
   - 详情：[MiniMax](/providers/minimax)
   - **Synthetic（Anthropic 兼容）**：提示 `SYNTHETIC_API_KEY`。
   - 详情：[Synthetic](/providers/synthetic)
   - **Moonshot（Kimi K2）**：自动写入配置。
   - **Kimi Code**：自动写入配置。
   - 详情：[Moonshot AI (Kimi + Kimi Code)](/providers/moonshot)
   - **跳过**：暂不配置认证。
   - 从检测到的选项中选择默认模型（或手动输入 provider/model）。
   - 向导会做一次模型检查，若模型未知或缺少认证会提示警告。
  - OAuth 凭据位于 `~/.clawdbot/credentials/oauth.json`；认证配置位于 `~/.clawdbot/agents/<agentId>/agent/auth-profiles.json`（API keys + OAuth）。
   - 详情：[/concepts/oauth](/concepts/oauth)

3) **工作区**
   - 默认 `~/clawd`（可配置）。
   - 写入 agent 引导所需的工作区文件。
   - 完整布局和备份指南：[Agent workspace](/concepts/agent-workspace)

4) **Gateway**
   - 端口 绑定 认证方式 Tailscale 暴露。
   - 认证建议：即便是 loopback 也保持 **Token**，确保本地 WS 客户端必须认证。
   - 只有在完全信任本机所有进程时才关闭认证。
   - 非 loopback 绑定仍需要认证。

5) **渠道**
  - WhatsApp：可选二维码登录。
  - Telegram：bot token。
  - Discord：bot token。
  - Google Chat：服务账号 JSON + webhook audience。
  - Mattermost（插件）：bot token + base URL。
   - Signal：可选安装 `signal-cli` + 账号配置。
   - iMessage：本地 `imsg` CLI 路径 + DB 访问。
  - 私信安全：默认是配对。第一条私信会发送代码；通过 `moltbot pairing approve <channel> <code>` 审批，或使用 allowlist。

6) **Daemon 安装**
   - macOS：LaunchAgent
     - 需要登录的用户会话；无头场景请使用自定义 LaunchDaemon（未内置）。
   - Linux（以及 Windows 的 WSL2）：systemd 用户单元
     - 向导会尝试 `loginctl enable-linger <user>`，确保注销后 Gateway 仍运行。
     - 可能提示 sudo（写入 `/var/lib/systemd/linger`）；会先尝试不使用 sudo。
   - **运行时选择：** Node（推荐；WhatsApp/Telegram 必需）。**不推荐** Bun。

7) **健康检查**
   - 启动 Gateway（如需要）并运行 `moltbot health`。
   - 提示：`moltbot status --deep` 会在状态输出中增加 gateway 健康探测（需要可达的 gateway）。

8) **技能（推荐）**
   - 读取可用技能并检查依赖。
   - 让你选择 node 管理器：**npm / pnpm**（不推荐 bun）。
   - 安装可选依赖（部分在 macOS 上使用 Homebrew）。

9) **完成**
   - 总结 + 下一步，包括 iOS/Android/macOS 应用等额外功能。
  - 如果检测不到 GUI，向导会打印 Control UI 的 SSH 端口转发指令，而不是打开浏览器。
  - 如果 Control UI 资源缺失，向导会尝试构建；回退方案是 `pnpm ui:build`（首次运行会自动安装 UI 依赖）。

## 远程模式

远程模式配置本地客户端连接到其他地方的 Gateway。

你将设置：
- 远程 Gateway URL（`ws://...`）
- 若远程 Gateway 需要认证，则设置 token（推荐）

说明：
- 不会执行任何远程安装或 daemon 变更。
- 如果 Gateway 只绑定 loopback，请使用 SSH 隧道或 tailnet。
- 发现提示：
  - macOS：Bonjour（`dns-sd`）
  - Linux：Avahi（`avahi-browse`）

## 添加另一个 agent

使用 `moltbot agents add <name>` 创建一个独立的 agent，拥有自己的工作区、会话与认证配置。无 `--workspace` 时会启动向导。

它会写入：
- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

说明：
- 默认工作区为 `~/clawd-<agentId>`。
- 添加 `bindings` 来路由入站消息（向导可配置）。
- 非交互参数：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 非交互模式

使用 `--non-interactive` 自动化或脚本化引导：

```bash
moltbot onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-skills
```

加上 `--json` 可输出机器可读摘要。

Gemini 示例：

```bash
moltbot onboard --non-interactive \
  --mode local \
  --auth-choice gemini-api-key \
  --gemini-api-key "$GEMINI_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Z.AI 示例：

```bash
moltbot onboard --non-interactive \
  --mode local \
  --auth-choice zai-api-key \
  --zai-api-key "$ZAI_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Vercel AI Gateway 示例：

```bash
moltbot onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Moonshot 示例：

```bash
moltbot onboard --non-interactive \
  --mode local \
  --auth-choice moonshot-api-key \
  --moonshot-api-key "$MOONSHOT_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Synthetic 示例：

```bash
moltbot onboard --non-interactive \
  --mode local \
  --auth-choice synthetic-api-key \
  --synthetic-api-key "$SYNTHETIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

OpenCode Zen 示例：

```bash
moltbot onboard --non-interactive \
  --mode local \
  --auth-choice opencode-zen \
  --opencode-zen-api-key "$OPENCODE_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

添加 agent（非交互）示例：

```bash
moltbot agents add work \
  --workspace ~/clawd-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway 向导 RPC

Gateway 通过 RPC 暴露向导流程（`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`）。
客户端（macOS 应用、Control UI）可以渲染步骤而无需重新实现引导逻辑。

## Signal 设置（signal-cli）

向导可以从 GitHub Releases 安装 `signal-cli`：
- 下载对应的 release 资产。
- 保存到 `~/.clawdbot/tools/signal-cli/<version>/`。
- 写入 `channels.signal.cliPath` 到配置。

说明：
- JVM 构建需要 **Java 21**。
- 可用时优先使用原生构建。
- Windows 使用 WSL2；signal-cli 安装在 WSL 内按 Linux 流程执行。

## 向导写入内容

`~/.clawdbot/moltbot.json` 中的典型字段：
- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（选择 Minimax 时）
- `gateway.*`（模式 绑定 认证 Tailscale）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`
- 当你在提示中选择时，会写入渠道 allowlist（Slack/Discord/Matrix/Microsoft Teams），并在可能时把名称解析为 ID。
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`moltbot agents add` 会写入 `agents.list[]` 与可选 `bindings`。

WhatsApp 凭据位于 `~/.clawdbot/credentials/whatsapp/<accountId>/`。
会话存储在 `~/.clawdbot/agents/<agentId>/sessions/`。

部分渠道以插件形式提供。当你在引导中选择时，向导会提示安装它（npm 或本地路径），然后才能配置。

## 相关文档

- macOS 应用引导：[Onboarding](/start/onboarding)
- 配置参考：[Gateway configuration](/gateway/configuration)
- 提供方：[WhatsApp](/channels/whatsapp)、[Telegram](/channels/telegram)、[Discord](/channels/discord)、[Google Chat](/channels/googlechat)、[Signal](/channels/signal)、[iMessage](/channels/imessage)
- 技能：[Skills](/tools/skills)、[Skills config](/tools/skills-config)
