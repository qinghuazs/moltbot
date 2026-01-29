---
summary: "Moltbot 的顶层概览、功能与定位"
read_when:
  - 向新用户介绍 Moltbot
---
# Moltbot 🦞

> *"EXFOLIATE! EXFOLIATE!"* — 一只太空龙虾，大概

<p align="center">
  <img src="whatsapp-clawd.jpg" alt="Moltbot" width="420" />
</p>

<p align="center">
  <strong>Any OS + WhatsApp/Telegram/Discord/iMessage 的 AI agent 网关（Pi）。</strong><br />
  插件可加入 Mattermost 等更多渠道。
  发一条消息，得到 agent 回复 — 随身可用。
</p>

<p align="center">
  <a href="https://github.com/moltbot/moltbot">GitHub</a> ·
  <a href="https://github.com/moltbot/moltbot/releases">Releases</a> ·
  <a href="/">Docs</a> ·
  <a href="/start/clawd">Moltbot assistant setup</a>
</p>

Moltbot 将 WhatsApp（通过 WhatsApp Web / Baileys）、Telegram（Bot API / grammY）、Discord（Bot API / channels.discord.js）与 iMessage（imsg CLI）桥接到如 [Pi](https://github.com/badlogic/pi-mono) 这样的编码 agent。插件可添加 Mattermost（Bot API + WebSocket）等更多渠道。
Moltbot 也驱动了太空龙虾助手 [Clawd](https://clawd.me)。

## 从这里开始

- **从零安装：** [Getting Started](/start/getting-started)
- **引导式设置（推荐）：** [Wizard](/start/wizard)（`moltbot onboard`）
- **打开仪表盘（本地 Gateway）：** http://127.0.0.1:18789/（或 http://localhost:18789/）

如果 Gateway 运行在同一台电脑上，以上链接会直接打开浏览器 Control UI。
如果失败，先启动 Gateway：`moltbot gateway`。

## 仪表盘（浏览器 Control UI）

仪表盘是浏览器版 Control UI，用于聊天、配置、节点、会话等。
本地默认：http://127.0.0.1:18789/
远程访问见：[Web surfaces](/web) 与 [Tailscale](/gateway/tailscale)

## 工作原理

```
WhatsApp / Telegram / Discord / iMessage（+ 插件）
        │
        ▼
  ┌───────────────────────────┐
  │          Gateway          │  ws://127.0.0.1:18789（仅 loopback）
  │       （单一源头）        │
  │                           │  http://<gateway-host>:18793
  │                           │    /__moltbot__/canvas/（Canvas host）
  └───────────┬───────────────┘
              │
              ├─ Pi agent（RPC）
              ├─ CLI（moltbot …）
              ├─ Chat UI（SwiftUI）
              ├─ macOS app（Moltbot.app）
              ├─ iOS 节点（通过 Gateway WS + 配对）
              └─ Android 节点（通过 Gateway WS + 配对）
```

大多数操作都通过 **Gateway**（`moltbot gateway`）流转，它是单一常驻进程，负责通道连接与 WebSocket 控制面。

## 网络模型

- **每主机一个 Gateway（推荐）**：它是唯一允许持有 WhatsApp Web 会话的进程。若需救援机器人或严格隔离，可使用隔离 profile 与端口运行多个 Gateway；见 [Multiple gateways](/gateway/multiple-gateways)。
- **优先 loopback**：Gateway WS 默认 `ws://127.0.0.1:18789`。
  - 向导现在默认生成 gateway token（即使在 loopback）。
  - 需要 Tailnet 访问时，运行 `moltbot gateway --bind tailnet --token ...`（非 loopback 绑定必须有 token）。
- **Nodes**：连接到 Gateway WebSocket（按需 LAN/tailnet/SSH）；遗留 TCP bridge 已弃用/移除。
- **Canvas host**：`canvasHost.port` 上的 HTTP 文件服务（默认 `18793`），提供 `/__moltbot__/canvas/` 用于节点 WebView；见 [Gateway configuration](/gateway/configuration)（`canvasHost`）。
- **远程使用**：SSH 隧道或 tailnet/VPN；见 [Remote access](/gateway/remote) 与 [Discovery](/gateway/discovery)。

## 功能（高层）

- 📱 **WhatsApp 集成** — 使用 Baileys 实现 WhatsApp Web 协议
- ✈️ **Telegram 机器人** — grammY 支持私聊 + 群聊
- 🎮 **Discord 机器人** — channels.discord.js 支持私聊 + 服务器频道
- 🧩 **Mattermost 机器人（插件）** — Bot token + WebSocket 事件
- 💬 **iMessage** — 本地 imsg CLI 集成（macOS）
- 🤖 **Agent bridge** — Pi（RPC 模式）支持工具流式输出
- ⏱️ **Streaming + chunking** — Block streaming + Telegram 草稿流式细节（[/concepts/streaming](/concepts/streaming)）
- 🧠 **多 agent 路由** — 按 provider 账号/同伴路由到隔离 agent（工作区 + per-agent 会话）
- 🔐 **订阅认证** — Anthropic（Claude Pro/Max）+ OpenAI（ChatGPT/Codex）通过 OAuth
- 💬 **会话** — 私聊默认汇聚到 `main`；群聊隔离
- 👥 **群聊支持** — 默认需提及；owner 可切换 `/activation always|mention`
- 📎 **媒体支持** — 发送/接收图片、音频、文档
- 🎤 **语音备注** — 可选转写 hook
- 🖥️ **WebChat + macOS 应用** — 本地 UI + 菜单栏助手（运维与语音唤醒）
- 📱 **iOS 节点** — 配对为节点并提供 Canvas 表面
- 📱 **Android 节点** — 配对为节点并提供 Canvas + Chat + Camera

注意：遗留 Claude/Codex/Gemini/Opencode 路径已移除；Pi 是唯一编码 agent 路径。

## 快速开始

运行要求：**Node ≥ 22**。

```bash
# 推荐：全局安装（npm/pnpm）
npm install -g moltbot@latest
# 或：pnpm add -g moltbot@latest

# Onboard + 安装服务（launchd/systemd 用户服务）
moltbot onboard --install-daemon

# 配对 WhatsApp Web（显示二维码）
moltbot channels login

# Onboarding 后 Gateway 通过服务运行；也可手动启动：
moltbot gateway --port 18789
```

之后在 npm 与 git 安装之间切换很容易：安装另一种方式并运行 `moltbot doctor` 更新 gateway 服务入口。

从源码（开发）：

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build
moltbot onboard --install-daemon
```

如果尚未全局安装，可在仓库内用 `pnpm moltbot ...` 运行 onboarding。

多实例快速开始（可选）：

```bash
CLAWDBOT_CONFIG_PATH=~/.clawdbot/a.json \
CLAWDBOT_STATE_DIR=~/.clawdbot-a \
moltbot gateway --port 19001
```

发送测试消息（需要网关运行中）：

```bash
moltbot message send --target +15555550123 --message "Hello from Moltbot"
```

## 配置（可选）

配置位于 `~/.clawdbot/moltbot.json`。

- 若 **不配置**，Moltbot 会使用内置 Pi 二进制（RPC 模式）与按发送者会话。
- 若要收紧权限，从 `channels.whatsapp.allowFrom` 和（群聊）提及规则开始。

示例：

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  },
  messages: { groupChat: { mentionPatterns: ["@clawd"] } }
}
```

## 文档

- 从这里开始：
  - [Docs hubs（所有页面链接）](/start/hubs)
  - [Help](/help) ← *常见修复 + 排障*
  - [Configuration](/gateway/configuration)
  - [Configuration examples](/gateway/configuration-examples)
  - [Slash commands](/tools/slash-commands)
  - [Multi-agent routing](/concepts/multi-agent)
  - [Updating / rollback](/install/updating)
  - [Pairing（DM + 节点）](/start/pairing)
  - [Nix mode](/install/nix)
  - [Moltbot assistant setup（Clawd）](/start/clawd)
  - [Skills](/tools/skills)
  - [Skills config](/tools/skills-config)
  - [Workspace templates](/reference/templates/AGENTS)
  - [RPC adapters](/reference/rpc)
  - [Gateway runbook](/gateway)
  - [Nodes（iOS/Android）](/nodes)
  - [Web surfaces（Control UI）](/web)
  - [Discovery + transports](/gateway/discovery)
  - [Remote access](/gateway/remote)
- Providers 与体验：
  - [WebChat](/web/webchat)
  - [Control UI（浏览器）](/web/control-ui)
  - [Telegram](/channels/telegram)
  - [Discord](/channels/discord)
  - [Mattermost（插件）](/channels/mattermost)
  - [iMessage](/channels/imessage)
  - [Groups](/concepts/groups)
  - [WhatsApp group messages](/concepts/group-messages)
  - [Media: images](/nodes/images)
  - [Media: audio](/nodes/audio)
- 伴生应用：
  - [macOS app](/platforms/macos)
  - [iOS app](/platforms/ios)
  - [Android app](/platforms/android)
  - [Windows（WSL2）](/platforms/windows)
  - [Linux app](/platforms/linux)
- 运维与安全：
  - [Sessions](/concepts/session)
  - [Cron jobs](/automation/cron-jobs)
  - [Webhooks](/automation/webhook)
  - [Gmail hooks（Pub/Sub）](/automation/gmail-pubsub)
  - [Security](/gateway/security)
  - [Troubleshooting](/gateway/troubleshooting)

## 名称由来

**Moltbot = CLAW + TARDIS**，因为每只太空龙虾都需要一台时空机器。

---

*"We\'re all just playing with our own prompts."* — 某个 AI，可能 token 上头了

## 致谢

- **Peter Steinberger**（[@steipete](https://twitter.com/steipete)）— 创作者，龙虾呢喃者
- **Mario Zechner**（[@badlogicc](https://twitter.com/badlogicgames)）— Pi 创作者，安全渗透测试者
- **Clawd** — 要求更好名字的太空龙虾

## 核心贡献者

- **Maxim Vovshin**（@Hyaxia，36747317+Hyaxia@users.noreply.github.com）— Blogwatcher 技能
- **Nacho Iacovino**（@nachoiacovino，nacho.iacovino@gmail.com）— 位置解析（Telegram + WhatsApp）

## 许可证

MIT — 像海里的龙虾一样自由 🦞

---

*"We\'re all just playing with our own prompts."* — 某个 AI，可能 token 上头了
