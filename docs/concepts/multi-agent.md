---
summary: "多代理路由：隔离代理、渠道账户和绑定"
title: 多代理路由
read_when: "您想在一个网关进程中使用多个隔离代理（工作区 + 认证）。"
status: active
---

# 多代理路由

目标：在一个运行的网关中使用多个*隔离*代理（独立的工作区 + `agentDir` + 会话），以及多个渠道账户（例如两个 WhatsApp）。入站消息通过绑定路由到代理。

## 什么是"一个代理"？

**代理**是一个完全独立的大脑，拥有自己的：

- **工作区**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、人格规则）。
- **状态目录**（`agentDir`）用于认证配置文件、模型注册表和每代理配置。
- **会话存储**（聊天历史 + 路由状态）位于 `~/.clawdbot/agents/<agentId>/sessions`。

认证配置文件是**每代理**的。每个代理从自己的位置读取：

```
~/.clawdbot/agents/<agentId>/agent/auth-profiles.json
```

主代理凭据**不会**自动共享。永远不要在代理之间重用 `agentDir`（这会导致认证/会话冲突）。如果您想共享凭据，请将 `auth-profiles.json` 复制到另一个代理的 `agentDir`。

技能通过每个工作区的 `skills/` 文件夹按代理设置，共享技能可从 `~/.clawdbot/skills` 获取。参见 [技能：每代理与共享](/tools/skills#per-agent-vs-shared-skills)。

网关可以托管**一个代理**（默认）或**多个代理**并行。

**工作区说明：** 每个代理的工作区是**默认 cwd**，而不是硬沙箱。相对路径在工作区内解析，但绝对路径可以访问其他主机位置，除非启用了沙箱。参见 [沙箱](/gateway/sandboxing)。

## 路径（快速映射）

- 配置：`~/.clawdbot/moltbot.json`（或 `CLAWDBOT_CONFIG_PATH`）
- 状态目录：`~/.clawdbot`（或 `CLAWDBOT_STATE_DIR`）
- 工作区：`~/clawd`（或 `~/clawd-<agentId>`）
- 代理目录：`~/.clawdbot/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 会话：`~/.clawdbot/agents/<agentId>/sessions`

### 单代理模式（默认）

如果您什么都不做，Moltbot 运行单个代理：

- `agentId` 默认为 **`main`**。
- 会话键为 `agent:main:<mainKey>`。
- 工作区默认为 `~/clawd`（或设置 `CLAWDBOT_PROFILE` 时为 `~/clawd-<profile>`）。
- 状态默认为 `~/.clawdbot/agents/main/agent`。

## 代理助手

使用代理向导添加新的隔离代理：

```bash
moltbot agents add work
```

然后添加 `bindings`（或让向导完成）以路由入站消息。

验证：

```bash
moltbot agents list --bindings
```

## 多代理 = 多人、多人格

使用**多代理**时，每个 `agentId` 成为一个**完全隔离的人格**：

- **不同的电话号码/账户**（每渠道 `accountId`）。
- **不同的人格**（每代理工作区文件如 `AGENTS.md` 和 `SOUL.md`）。
- **独立的认证 + 会话**（除非明确启用，否则无交叉通信）。

这让**多人**共享一个网关服务器，同时保持他们的 AI "大脑"和数据隔离。

## 一个 WhatsApp 号码，多人（私聊分离）

您可以将**不同的 WhatsApp 私聊**路由到不同的代理，同时保持**一个 WhatsApp 账户**。使用发送者 E.164（如 `+15551234567`）和 `peer.kind: "dm"` 进行匹配。回复仍然来自同一个 WhatsApp 号码（没有每代理发送者身份）。

重要细节：直接聊天会折叠到代理的**主会话键**，因此真正的隔离需要**每人一个代理**。

示例：

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/clawd-alex" },
      { id: "mia", workspace: "~/clawd-mia" }
    ]
  },
  bindings: [
    { agentId: "alex", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551230001" } } },
    { agentId: "mia",  match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551230002" } } }
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"]
    }
  }
}
```

注意：
- 私聊访问控制是**每 WhatsApp 账户全局**的（配对/允许列表），而不是每代理。
- 对于共享群组，将群组绑定到一个代理或使用 [广播群组](/broadcast-groups)。

## 路由规则（消息如何选择代理）

绑定是**确定性的**且**最具体的优先**：

1. `peer` 匹配（精确的私聊/群组/频道 id）
2. `guildId`（Discord）
3. `teamId`（Slack）
4. `accountId` 匹配渠道
5. 渠道级匹配（`accountId: "*"`）
6. 回退到默认代理（`agents.list[].default`，否则为列表第一项，默认：`main`）

## 多账户/电话号码

支持**多账户**的渠道（例如 WhatsApp）使用 `accountId` 来标识每次登录。每个 `accountId` 可以路由到不同的代理，因此一台服务器可以托管多个电话号码而不混淆会话。

## 概念

- `agentId`：一个"大脑"（工作区、每代理认证、每代理会话存储）。
- `accountId`：一个渠道账户实例（例如 WhatsApp 账户 `"personal"` vs `"biz"`）。
- `binding`：通过 `(channel, accountId, peer)` 以及可选的 guild/team id 将入站消息路由到 `agentId`。
- 直接聊天折叠到 `agent:<agentId>:<mainKey>`（每代理"main"；`session.mainKey`）。

## 示例：两个 WhatsApp → 两个代理

`~/.clawdbot/moltbot.json`（JSON5）：

```js
{
  agents: {
    list: [
      {
        id: "home",
        default: true,
        name: "Home",
        workspace: "~/clawd-home",
        agentDir: "~/.clawdbot/agents/home/agent",
      },
      {
        id: "work",
        name: "Work",
        workspace: "~/clawd-work",
        agentDir: "~/.clawdbot/agents/work/agent",
      },
    ],
  },

  // 确定性路由：第一个匹配获胜（最具体的优先）。
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },

    // 可选的每对等体覆盖（示例：将特定群组发送到工作代理）。
    {
      agentId: "work",
      match: {
        channel: "whatsapp",
        accountId: "personal",
        peer: { kind: "group", id: "1203630...@g.us" },
      },
    },
  ],

  // 默认关闭：代理间消息必须明确启用 + 加入允许列表。
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },

  channels: {
    whatsapp: {
      accounts: {
        personal: {
          // 可选覆盖。默认：~/.clawdbot/credentials/whatsapp/personal
          // authDir: "~/.clawdbot/credentials/whatsapp/personal",
        },
        biz: {
          // 可选覆盖。默认：~/.clawdbot/credentials/whatsapp/biz
          // authDir: "~/.clawdbot/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

## 示例：WhatsApp 日常聊天 + Telegram 深度工作

按渠道分离：将 WhatsApp 路由到快速日常代理，将 Telegram 路由到 Opus 代理。

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/clawd-chat",
        model: "anthropic/claude-sonnet-4-5"
      },
      {
        id: "opus",
        name: "Deep Work",
        workspace: "~/clawd-opus",
        model: "anthropic/claude-opus-4-5"
      }
    ]
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } }
  ]
}
```

注意：
- 如果您有一个渠道的多个账户，请在绑定中添加 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 要将单个私聊/群组路由到 Opus 而其余保持在 chat，请为该对等体添加 `match.peer` 绑定；对等体匹配始终优先于渠道范围规则。

## 示例：同一渠道，一个对等体到 Opus

保持 WhatsApp 在快速代理上，但将一个私聊路由到 Opus：

```json5
{
  agents: {
    list: [
      { id: "chat", name: "Everyday", workspace: "~/clawd-chat", model: "anthropic/claude-sonnet-4-5" },
      { id: "opus", name: "Deep Work", workspace: "~/clawd-opus", model: "anthropic/claude-opus-4-5" }
    ]
  },
  bindings: [
    { agentId: "opus", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551234567" } } },
    { agentId: "chat", match: { channel: "whatsapp" } }
  ]
}
```

对等体绑定始终获胜，因此将它们放在渠道范围规则之上。

## 绑定到 WhatsApp 群组的家庭代理

将专用家庭代理绑定到单个 WhatsApp 群组，带有提及门控和更严格的工具策略：

```json5
{
  agents: {
    list: [
      {
        id: "family",
        name: "Family",
        workspace: "~/clawd-family",
        identity: { name: "Family Bot" },
        groupChat: {
          mentionPatterns: ["@family", "@familybot", "@Family Bot"]
        },
        sandbox: {
          mode: "all",
          scope: "agent"
        },
        tools: {
          allow: ["exec", "read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "browser", "canvas", "nodes", "cron"]
        }
      }
    ]
  },
  bindings: [
    {
      agentId: "family",
      match: {
        channel: "whatsapp",
        peer: { kind: "group", id: "120363999999999999@g.us" }
      }
    }
  ]
}
```

注意：
- 工具允许/拒绝列表是**工具**，不是技能。如果技能需要运行二进制文件，请确保允许 `exec` 且二进制文件存在于沙箱中。
- 对于更严格的门控，设置 `agents.list[].groupChat.mentionPatterns` 并为渠道保持群组允许列表启用。

## 每代理沙箱和工具配置

从 v2026.1.6 开始，每个代理可以有自己的沙箱和工具限制：

```js
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/clawd-personal",
        sandbox: {
          mode: "off",  // 个人代理无沙箱
        },
        // 无工具限制 - 所有工具可用
      },
      {
        id: "family",
        workspace: "~/clawd-family",
        sandbox: {
          mode: "all",     // 始终沙箱化
          scope: "agent",  // 每代理一个容器
          docker: {
            // 容器创建后的可选一次性设置
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],                    // 仅读取工具
          deny: ["exec", "write", "edit", "apply_patch"],    // 拒绝其他
        },
      },
    ],
  },
}
```

注意：`setupCommand` 位于 `sandbox.docker` 下，在容器创建时运行一次。
当解析的范围为 `"shared"` 时，每代理 `sandbox.docker.*` 覆盖会被忽略。

**优势：**
- **安全隔离**：限制不受信任代理的工具
- **资源控制**：沙箱化特定代理同时保持其他代理在主机上
- **灵活策略**：每代理不同的权限

注意：`tools.elevated` 是**全局**的且基于发送者；它不能按代理配置。
如果您需要每代理边界，请使用 `agents.list[].tools` 拒绝 `exec`。
对于群组定位，使用 `agents.list[].groupChat.mentionPatterns` 以便 @提及干净地映射到预期代理。

参见 [多代理沙箱与工具](/multi-agent-sandbox-tools) 获取详细示例。
