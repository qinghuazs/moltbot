---
summary: "将 Moltbot 作为个人助理运行的端到端指南（含安全注意事项）"
read_when:
  - 初始化新的助理实例
  - 审核安全与权限影响
---
# 使用 Moltbot 构建个人助理（Clawd 风格）

Moltbot 是面向 **Pi** agent 的 WhatsApp + Telegram + Discord + iMessage gateway。插件可增加 Mattermost。本指南是“个人助理”方案：使用一个专用 WhatsApp 号码作为常驻 agent。

## ⚠️ 安全优先

你正在让 agent 可以：
- 在你的机器上运行命令（取决于你的 Pi 工具设置）
- 读写工作区文件
- 通过 WhatsApp/Telegram/Discord/Mattermost（插件）向外发送消息

从保守开始：
- 始终设置 `channels.whatsapp.allowFrom`（不要让个人 Mac 对公网开放）。
- 使用一个专用 WhatsApp 号码作为助理。
- Heartbeat 现在默认每 30 分钟一次。在你信任之前，把 `agents.defaults.heartbeat.every: "0m"` 设为 0 以禁用。

## 先决条件

- Node **22+**
- Moltbot 在 PATH 上可用（推荐全局安装）
- 一个第二号码（SIM/eSIM/预付费）用于助理

```bash
npm install -g moltbot@latest
# or: pnpm add -g moltbot@latest
```

从源码（开发）：

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build
pnpm link --global
```

## 双手机方案（推荐）

你需要这样的结构：

```
你的手机（个人）               第二部手机（助理）
┌─────────────────┐           ┌─────────────────┐
│  你的 WhatsApp  │  ──────▶  │  助理的 WA      │
│  +1-555-YOU     │  message  │  +1-555-CLAWD   │
└─────────────────┘           └────────┬────────┘
                                       │ 通过二维码绑定
                                       ▼
                              ┌─────────────────┐
                              │  你的 Mac       │
                              │  (moltbot)      │
                              │    Pi agent     │
                              └─────────────────┘
```

如果把个人 WhatsApp 绑定到 Moltbot，你收到的每条消息都会成为“agent 输入”，这通常不是你想要的。

## 5 分钟快速开始

1) 配对 WhatsApp Web（显示二维码；用助理手机扫描）：

```bash
moltbot channels login
```

2) 启动 Gateway（保持运行）：

```bash
moltbot gateway --port 18789
```

3) 在 `~/.clawdbot/moltbot.json` 写入最小配置：

```json5
{
  channels: { whatsapp: { allowFrom: ["+15555550123"] } }
}
```

现在用 allowlist 手机给助理号码发消息。

引导完成后，我们会用你的 gateway token 自动打开仪表盘并打印带 token 的链接。稍后重新打开：`moltbot dashboard`。

## 给 agent 一个工作区（AGENTS）

Clawd 从工作区读取运行指令与“记忆”。

默认情况下 Moltbot 使用 `~/clawd` 作为 agent 工作区，并会在首次 setup 或首次运行时创建（包含 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`）。只有在工作区全新时才会创建 `BOOTSTRAP.md`（删除后不应再出现）。

提示：把这个目录当作 Clawd 的“记忆”，并把它做成 git 仓库（建议私有）以便备份 `AGENTS.md` 与记忆文件。如果系统安装了 git，新建工作区会自动初始化。

```bash
moltbot setup
```

完整工作区布局与备份指南：[Agent workspace](/concepts/agent-workspace)
记忆流程：[Memory](/concepts/memory)

可选：用 `agents.defaults.workspace` 选择不同工作区（支持 `~`）。

```json5
{
  agent: {
    workspace: "~/clawd"
  }
}
```

如果你已经从仓库提供了自己的工作区文件，可完全禁用引导文件创建：

```json5
{
  agent: {
    skipBootstrap: true
  }
}
```

## 让它成为“助理”的配置

Moltbot 默认已接近助理配置，但你通常会调整：
- `SOUL.md` 中的人设和指令
- thinking 默认值（如需要）
- heartbeat（信任后再开）

示例：

```json5
{
  logging: { level: "info" },
  agent: {
    model: "anthropic/claude-opus-4-5",
    workspace: "~/clawd",
    thinkingDefault: "high",
    timeoutSeconds: 1800,
    // Start with 0; enable later.
    heartbeat: { every: "0m" }
  },
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }
      }
    }
  },
  routing: {
    groupChat: {
      mentionPatterns: ["@clawd", "clawd"]
    }
  },
  session: {
    scope: "per-sender",
    resetTriggers: ["/new", "/reset"],
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 10080
    }
  }
}
```

## 会话与记忆

- 会话文件：`~/.clawdbot/agents/<agentId>/sessions/{{SessionId}}.jsonl`
- 会话元数据（token 使用、最后路由等）：`~/.clawdbot/agents/<agentId>/sessions/sessions.json`（旧版：`~/.clawdbot/sessions/sessions.json`）
- `/new` 或 `/reset` 会为该聊天创建新会话（通过 `resetTriggers` 配置）。若单独发送，agent 会回复简短问候以确认重置。
- `/compact [instructions]` 会压缩会话上下文并报告剩余上下文预算。

## Heartbeat（主动模式）

默认情况下，Moltbot 每 30 分钟运行一次 heartbeat，提示词为：
`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
设置 `agents.defaults.heartbeat.every: "0m"` 可禁用。

- 若 `HEARTBEAT.md` 存在但实质为空（只有空行或 `# Heading` 等标题），Moltbot 会跳过以节省调用。
- 若文件缺失，heartbeat 仍会运行，由模型决定行为。
- 若 agent 回复 `HEARTBEAT_OK`（可带少量填充，见 `agents.defaults.heartbeat.ackMaxChars`），Moltbot 会抑制该次 heartbeat 的出站投递。
- Heartbeat 是完整的 agent 轮次，间隔越短消耗越多 token。

```json5
{
  agent: {
    heartbeat: { every: "30m" }
  }
}
```

## 媒体收发

入站附件（图片 音频 文档）可通过模板注入到命令：
- `{{MediaPath}}`（本地临时文件路径）
- `{{MediaUrl}}`（伪 URL）
- `{{Transcript}}`（启用音频转写时）

agent 的出站附件：在独立一行写 `MEDIA:<path-or-url>`（不带空格）。示例：

```
Here’s the screenshot.
MEDIA:/tmp/screenshot.png
```

Moltbot 会提取这些行并随文本一起发送媒体。

## 运维检查清单

```bash
moltbot status          # 本地状态（凭据 会话 队列事件）
moltbot status --all    # 完整诊断（只读 可粘贴）
moltbot status --deep   # 添加 gateway 健康探测（Telegram + Discord）
moltbot health --json   # gateway 健康快照（WS）
```

日志默认位于 `/tmp/moltbot/`（默认：`moltbot-YYYY-MM-DD.log`）。

## 下一步

- WebChat：[WebChat](/web/webchat)
- Gateway 运维：[Gateway runbook](/gateway)
- Cron + 唤醒：[Cron jobs](/automation/cron-jobs)
- macOS 菜单栏伴侣：[Moltbot macOS app](/platforms/macos)
- iOS 节点应用：[iOS app](/platforms/ios)
- Android 节点应用：[Android app](/platforms/android)
- Windows 状态：[Windows (WSL2)](/platforms/windows)
- Linux 状态：[Linux app](/platforms/linux)
- 安全：[Security](/gateway/security)
