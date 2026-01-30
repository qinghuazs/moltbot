---
summary: "~/.clawdbot/moltbot.json 的全部配置项与示例"
read_when:
  - 添加或修改配置字段
---
# 配置 🔧

Moltbot 会从 `~/.clawdbot/moltbot.json` 读取可选的 **JSON5** 配置（支持注释与尾随逗号）。

如果文件不存在，Moltbot 会使用相对安全的默认值（内置 Pi agent + 按发送者分会话 + 工作区 `~/clawd`）。你通常只需要配置来：
- 限制谁可以触发机器人（`channels.whatsapp.allowFrom`、`channels.telegram.allowFrom` 等）
- 控制群 allowlist 与提及行为（`channels.whatsapp.groups`、`channels.telegram.groups`、`channels.discord.guilds`、`agents.list[].groupChat`）
- 自定义消息前缀（`messages`）
- 设置 agent 的工作区（`agents.defaults.workspace` 或 `agents.list[].workspace`）
- 调整内置 agent 默认值（`agents.defaults`）与会话行为（`session`）
- 为每个 agent 设置身份（`agents.list[].identity`）

> **刚接触配置？** 查看 [Configuration Examples](/gateway/configuration-examples) 获取完整示例与详细解释。

## 严格配置校验

Moltbot 只接受完全符合 schema 的配置。
未知键、类型错误或无效值会让 Gateway **拒绝启动**，以保证安全。

校验失败时：
- Gateway 不会启动。
- 只允许诊断命令（例如：`moltbot doctor`、`moltbot logs`、`moltbot health`、`moltbot status`、`moltbot service`、`moltbot help`）。
- 运行 `moltbot doctor` 查看具体问题。
- 运行 `moltbot doctor --fix`（或 `--yes`）应用迁移/修复。

Doctor 不会写入变更，除非你显式选择 `--fix`/`--yes`。

## Schema 与 UI 提示

Gateway 通过 `config.schema` 暴露配置的 JSON Schema，以供 UI 编辑器使用。
Control UI 会根据该 schema 渲染表单，并提供 **Raw JSON** 编辑器作为逃生口。

频道插件与扩展可以为自身配置注册 schema 与 UI 提示，使频道设置在各应用中保持 schema 驱动，而非硬编码表单。

提示（标签、分组、敏感字段）会与 schema 一起发布，让客户端在无需硬编码的情况下渲染更好的表单。

## Apply 与重启（RPC）

使用 `config.apply` 校验 + 写入完整配置，并在一步内重启 Gateway。
它会写入重启哨兵，并在 Gateway 回来后 ping 最近活跃的会话。

警告：`config.apply` 会替换**整个配置**。若只想修改少量键，请用 `config.patch` 或 `moltbot config set`。请备份 `~/.clawdbot/moltbot.json`。

参数：
- `raw`（string）— 完整配置的 JSON5 payload
- `baseHash`（可选）— 来自 `config.get` 的配置 hash（当已有配置时必填）
- `sessionKey`（可选）— 用于唤醒 ping 的最后活跃会话 key
- `note`（可选）— 写入重启哨兵的备注
- `restartDelayMs`（可选）— 重启前延迟（默认 2000）

示例（通过 `gateway call`）：

```bash
moltbot gateway call config.get --params '{}' # capture payload.hash
moltbot gateway call config.apply --params '{
  "raw": "{\\n  agents: { defaults: { workspace: \\\"~/clawd\\\" } }\\n}\\n",
  "baseHash": "<hash-from-config.get>",
  "sessionKey": "agent:main:whatsapp:dm:+15555550123",
  "restartDelayMs": 1000
}'
```

## 局部更新（RPC）

使用 `config.patch` 将部分更新合并到现有配置，避免覆盖无关键。它使用 JSON merge patch 语义：
- 对象递归合并
- `null` 删除键
- 数组整体替换
与 `config.apply` 一样，它会校验、写入配置、记录重启哨兵并安排 Gateway 重启（当提供 `sessionKey` 时可唤醒）。

参数：
- `raw`（string）— 仅包含要变更键的 JSON5 payload
- `baseHash`（必填）— 来自 `config.get` 的配置 hash
- `sessionKey`（可选）— 用于唤醒 ping 的最后活跃会话 key
- `note`（可选）— 写入重启哨兵的备注
- `restartDelayMs`（可选）— 重启前延迟（默认 2000）

示例：

```bash
moltbot gateway call config.get --params '{}' # capture payload.hash
moltbot gateway call config.patch --params '{
  "raw": "{\\n  channels: { telegram: { groups: { \\\"*\\\": { requireMention: false } } } }\\n}\\n",
  "baseHash": "<hash-from-config.get>",
  "sessionKey": "agent:main:whatsapp:dm:+15555550123",
  "restartDelayMs": 1000
}'
```

## 最小配置（推荐起点）

```json5
{
  agents: { defaults: { workspace: "~/clawd" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } }
}
```

默认镜像只需构建一次：
```bash
scripts/sandbox-setup.sh
```

## 自聊模式（推荐用于群控制）

为防止机器人在群里响应 WhatsApp @ 提及（只响应特定文本触发）：

```json5
{
  agents: {
    defaults: { workspace: "~/clawd" },
    list: [
      {
        id: "main",
        groupChat: { mentionPatterns: ["@clawd", "reisponde"] }
      }
    ]
  },
  channels: {
    whatsapp: {
      // allowlist 只用于私聊；包含自己的号码可启用自聊模式。
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  }
}
```

## 配置包含（`$include`）

使用 `$include` 指令将配置拆成多个文件。这适用于：
- 组织大型配置（例如按客户划分的 agent 定义）
- 在不同环境之间共享通用设置
- 将敏感配置分离

### 基本用法

```json5
// ~/.clawdbot/moltbot.json
{
  gateway: { port: 18789 },
  
  // 包含单个文件（替换该键的值）
  agents: { "$include": "./agents.json5" },
  
  // 包含多个文件（按顺序深度合并）
  broadcast: { 
    "$include": [
      "./clients/mueller.json5",
      "./clients/schmidt.json5"
    ]
  }
}
```

```json5
// ~/.clawdbot/agents.json5
{
  defaults: { sandbox: { mode: "all", scope: "session" } },
  list: [
    { id: "main", workspace: "~/clawd" }
  ]
}
```

### 合并行为

- **单文件**：替换包含 `$include` 的对象
- **文件数组**：按顺序深度合并（后者覆盖前者）
- **带同级键**：同级键会在 include 之后合并（覆盖 include 值）
- **同级键 + 数组/原始值**：不支持（包含内容必须是对象）

```json5
// 同级键覆盖 include 值
{
  "$include": "./base.json5",   // { a: 1, b: 2 }
  b: 99                          // 结果：{ a: 1, b: 99 }
}
```

### 嵌套包含

被包含的文件也可以包含 `$include`（最多 10 层）：

```json5
// clients/mueller.json5
{
  agents: { "$include": "./mueller/agents.json5" },
  broadcast: { "$include": "./mueller/broadcast.json5" }
}
```

### 路径解析

- **相对路径**：相对包含文件解析
- **绝对路径**：原样使用
- **父目录**：支持 `../`

```json5
{ "$include": "./sub/config.json5" }      // 相对
{ "$include": "/etc/moltbot/base.json5" } // 绝对
{ "$include": "../shared/common.json5" }   // 父目录
```

### 错误处理

- **文件不存在**：给出解析后的路径并报错
- **解析错误**：指出是哪个包含文件失败
- **循环包含**：检测并报告包含链

### 示例：多客户法务配置

```json5
// ~/.clawdbot/moltbot.json
{
  gateway: { port: 18789, auth: { token: "secret" } },
  
  // 通用 agent 默认值
  agents: {
    defaults: {
      sandbox: { mode: "all", scope: "session" }
    },
    // 合并所有客户的 agent 列表
    list: { "$include": [
      "./clients/mueller/agents.json5",
      "./clients/schmidt/agents.json5"
    ]}
  },
  
  // 合并广播配置
  // 合并广播配置
  broadcast: { "$include": [
    "./clients/mueller/broadcast.json5",
    "./clients/schmidt/broadcast.json5"
  ]},
  
  channels: { whatsapp: { groupPolicy: "allowlist" } }
}
```

```json5
// ~/.clawdbot/clients/mueller/agents.json5
[
  { id: "mueller-transcribe", workspace: "~/clients/mueller/transcribe" },
  { id: "mueller-docs", workspace: "~/clients/mueller/docs" }
]
```

```json5
// ~/.clawdbot/clients/mueller/broadcast.json5
{
  "120363403215116621@g.us": ["mueller-transcribe", "mueller-docs"]
}
```

## 常见选项

### 环境变量与 `.env`

Moltbot 从父进程读取环境变量（shell、launchd/systemd、CI 等）。

此外，它还会加载：
- 当前工作目录下的 `.env`（如果存在）
- 全局兜底的 `~/.clawdbot/.env`（也就是 `$CLAWDBOT_STATE_DIR/.env`）

两个 `.env` 都不会覆盖已存在的环境变量。

你也可以在配置中提供内联环境变量。这些只会在进程 env 缺失该键时应用（同样不会覆盖）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-..."
    }
  }
}
```

完整优先级与来源见 [/environment](/environment)。

### `env.shellEnv`（可选）

可选便利功能：当启用且尚未设置预期 key 时，Moltbot 会运行登录 shell 并仅导入缺失的预期 key（不会覆盖）。这相当于 source 你的 shell profile。

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000
    }
  }
}
```

等效环境变量：
- `CLAWDBOT_LOAD_SHELL_ENV=1`
- `CLAWDBOT_SHELL_ENV_TIMEOUT_MS=15000`

### 配置中的环境变量替换

你可以在任意配置字符串值中使用 `${VAR_NAME}` 直接引用环境变量。变量会在配置加载时、校验前被替换。

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}"
      }
    }
  },
  gateway: {
    auth: {
      token: "${CLAWDBOT_GATEWAY_TOKEN}"
    }
  }
}
```

**规则：**
- 只匹配大写环境变量名：`[A-Z_][A-Z0-9_]*`
- 缺失或为空的环境变量会在加载时抛错
- 用 `$${VAR}` 转义以输出字面量 `${VAR}`
- 与 `$include` 一起使用时，包含文件也会替换

**内联替换：**

```json5
{
  models: {
    providers: {
      custom: {
        baseUrl: "${CUSTOM_API_BASE}/v1"  // → "https://api.example.com/v1"
      }
    }
  }
}
```

### 认证存储（OAuth + API keys）

Moltbot 将**按 agent**的认证 profiles（OAuth + API keys）存放于：
- `<agentDir>/auth-profiles.json`（默认：`~/.clawdbot/agents/<agentId>/agent/auth-profiles.json`）

另见：[/concepts/oauth](/concepts/oauth)
另见：[/concepts/oauth](/concepts/oauth)

旧版 OAuth 导入：
- `~/.clawdbot/credentials/oauth.json`（或 `$CLAWDBOT_STATE_DIR/credentials/oauth.json`）

内置 Pi agent 会维护运行时缓存：
- `<agentDir>/auth.json`（自动管理；不要手动编辑）

旧版 agent 目录（多 agent 之前）：
- `~/.clawdbot/agent/*`（由 `moltbot doctor` 迁移到 `~/.clawdbot/agents/<defaultAgentId>/agent/*`）

覆盖：
- OAuth 目录（仅旧版导入）：`CLAWDBOT_OAUTH_DIR`
- Agent 目录（默认 agent 根目录覆盖）：`CLAWDBOT_AGENT_DIR`（推荐），`PI_CODING_AGENT_DIR`（旧版）

首次使用时，Moltbot 会把 `oauth.json` 条目导入 `auth-profiles.json`。

### `auth`

认证 profile 的可选元数据。**不**存储密钥，只把 profile ID 映射到 provider + 模式（可选 email），并定义 provider 的轮换顺序用于 failover。

```json5
{
  auth: {
    profiles: {
      "anthropic:me@example.com": { provider: "anthropic", mode: "oauth", email: "me@example.com" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" }
    },
    order: {
      anthropic: ["anthropic:me@example.com", "anthropic:work"]
    }
  }
}
```

### `agents.list[].identity`

可选的每个 agent 身份，用于默认值与体验。由 macOS onboarding 助手写入。

如果设置，Moltbot 会派生默认值（仅当你未显式设置时）：
- `messages.ackReaction` 来自**当前 agent** 的 `identity.emoji`（默认 👀）
- `agents.list[].groupChat.mentionPatterns` 来自 agent 的 `identity.name`/`identity.emoji`（因此 “@Samantha” 可在 Telegram/Slack/Discord/Google Chat/iMessage/WhatsApp 群里生效）
- `identity.avatar` 接受工作区相对路径或远程 URL/data URL。本地文件必须在 agent 工作区内。

`identity.avatar` 支持：
- 工作区相对路径（必须在 agent 工作区内）
- `http(s)` URL
- `data:` URI

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png"
        }
      }
    ]
  }
}
```

### `wizard`

CLI 向导（`onboard`、`configure`、`doctor`）写入的元数据。

```json5
{
  wizard: {
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local"
  }
}
```

### `logging`

- 默认日志文件：`/tmp/moltbot/moltbot-YYYY-MM-DD.log`
- 若要稳定路径，将 `logging.file` 设为 `/tmp/moltbot/moltbot.log`。
- 控制台输出可单独调整：
  - `logging.consoleLevel`（默认 `info`，`--verbose` 时提升到 `debug`）
  - `logging.consoleStyle`（`pretty` | `compact` | `json`）
- 可对工具摘要做脱敏，避免泄露密钥：
  - `logging.redactSensitive`（`off` | `tools`，默认 `tools`）
  - `logging.redactPatterns`（正则字符串数组；覆盖默认规则）

```json5
{
  logging: {
    level: "info",
    file: "/tmp/moltbot/moltbot.log",
    consoleLevel: "info",
    consoleStyle: "pretty",
    redactSensitive: "tools",
    redactPatterns: [
      // 示例：用自己的规则覆盖默认规则。
      "\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1",
      "/\\bsk-[A-Za-z0-9_-]{8,}\\b/gi"
    ]
  }
}
```

### `channels.whatsapp.dmPolicy`

控制 WhatsApp 私聊（DM）的处理方式：
- `"pairing"`（默认）：未知发送者获得配对码，需所有者批准
- `"allowlist"`：仅允许 `channels.whatsapp.allowFrom`（或配对 allow 存储）中的发送者
- `"open"`：允许所有入站私聊（**需要** `channels.whatsapp.allowFrom` 包含 `"*"`）
- `"disabled"`：忽略所有入站私聊

配对码 1 小时后过期；机器人仅在新请求创建时发送配对码。待处理私聊配对请求默认每个频道上限 **3** 个。

配对审批：
- `moltbot pairing list whatsapp`
- `moltbot pairing approve whatsapp <code>`

### `channels.whatsapp.allowFrom`

允许触发 WhatsApp 自动回复的 E.164 号码 allowlist（**仅私聊**）。
若为空且 `channels.whatsapp.dmPolicy="pairing"`，未知发送者会收到配对码。
群聊请使用 `channels.whatsapp.groupPolicy` + `channels.whatsapp.groupAllowFrom`。

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000, // 可选：出站分片大小（字符数）
      chunkMode: "length", // 可选：分片模式（length | newline）
      mediaMaxMb: 50 // 可选：入站媒体上限（MB）
    }
  }
}
```

### `channels.whatsapp.sendReadReceipts`

控制入站 WhatsApp 消息是否标记已读（蓝勾）。默认：`true`。

自聊模式始终跳过已读回执，即便启用。

按账号覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`。

```json5
{
  channels: {
    whatsapp: { sendReadReceipts: false }
  }
}
```
}
```

### `channels.whatsapp.accounts`（多账号）

在一个 gateway 中运行多个 WhatsApp 账号：

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        default: {}, // 可选：保持默认 id 稳定
        personal: {},
        biz: {
          // 可选覆盖。默认：~/.clawdbot/credentials/whatsapp/biz
          // authDir: "~/.clawdbot/credentials/whatsapp/biz",
        }
      }
    }
  }
}
```

说明：
- 出站命令默认使用 `default` 账号（若存在），否则使用排序后的第一个账号 id。
- 旧版单账号 Baileys 认证目录会由 `moltbot doctor` 迁移到 `whatsapp/default`。

### `channels.telegram.accounts` / `channels.discord.accounts` / `channels.googlechat.accounts` / `channels.slack.accounts` / `channels.mattermost.accounts` / `channels.signal.accounts` / `channels.imessage.accounts`

每个频道支持多账号（每个账号拥有自己的 `accountId` 与可选 `name`）：

```json5
{
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "123456:ABC..."
        },
        alerts: {
          name: "Alerts bot",
          botToken: "987654:XYZ..."
        }
      }
    }
  }
}
```

说明：
- 省略 `accountId` 时使用 `default`（CLI + 路由）。
- 环境变量 token 仅适用于**默认**账号。
- 基础频道设置（群策略、提及门控等）默认应用于所有账号，除非在账号层覆盖。
- 用 `bindings[].match.accountId` 将不同账号路由到不同 agents.defaults。

### 群聊提及门控（`agents.list[].groupChat` + `messages.groupChat`）

群消息默认**需要提及**（元数据提及或正则模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群聊。

**提及类型：**
- **元数据提及**：平台原生 @ 提及（例如 WhatsApp 点按提及）。在 WhatsApp 自聊模式下忽略（见 `channels.whatsapp.allowFrom`）。
- **文本模式**：`agents.list[].groupChat.mentionPatterns` 中的正则。无论是否自聊模式都检查。
- 只有在能检测提及时才会启用门控（存在原生提及或至少一个 `mentionPattern`）。

```json5
{
  messages: {
    groupChat: { historyLimit: 50 }
  },
  agents: {
    list: [
      { id: "main", groupChat: { mentionPatterns: ["@clawd", "moltbot", "clawd"] } }
    ]
  }
}
```

`messages.groupChat.historyLimit` 设定群聊历史上下文的全局默认值。频道可通过 `channels.<channel>.historyLimit` 覆盖（多账号用 `channels.<channel>.accounts.*.historyLimit`）。设为 `0` 禁用历史包裹。

#### 私聊历史上限

私聊对话使用 agent 管理的会话历史。你可以限制每个 DM 会话保留的用户轮数：

```json5
{
  channels: {
    telegram: {
      dmHistoryLimit: 30,  // 将 DM 会话限制为 30 次用户轮次
      dms: {
        "123456789": { historyLimit: 50 }  // 单用户覆盖（用户 ID）
      }
    }
  }
}
```

解析顺序：
1. 单 DM 覆盖：`channels.<provider>.dms[userId].historyLimit`
2. Provider 默认：`channels.<provider>.dmHistoryLimit`
3. 无限制（保留全部历史）

支持 provider：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

按 agent 覆盖（设置后优先级最高，即使为 `[]`）：
```json5
{
  agents: {
    list: [
      { id: "work", groupChat: { mentionPatterns: ["@workbot", "\\+15555550123"] } },
      { id: "personal", groupChat: { mentionPatterns: ["@homebot", "\\+15555550999"] } }
    ]
  }
}
```

提及门控的默认值在各频道配置中（`channels.whatsapp.groups`、`channels.telegram.groups`、`channels.imessage.groups`、`channels.discord.guilds`）。当设置 `*.groups` 时，它也作为群 allowlist；包含 `"*"` 即允许所有群。

若要**只**响应特定文本触发（忽略原生 @ 提及）：

```json5
{
  channels: {
    whatsapp: {
      // 包含自己的号码以启用自聊模式（忽略原生 @ 提及）。
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          // 仅这些文本模式触发响应
          mentionPatterns: ["reisponde", "@clawd"]
        }
      }
    ]
  }
}
```

### 群策略（按频道）

使用 `channels.*.groupPolicy` 控制是否接受群/房间消息：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"]
    },
    telegram: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["tg:123456789", "@alice"]
    },
    signal: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"]
      groupAllowFrom: ["+15551234567"]
    },
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["chat_id:123"]
    },
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["user@org.com"]
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "GUILD_ID": {
          channels: { help: { allow: true } }
        }
      }
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { allow: true } }
    }
  }
}
```

说明：
- `"open"`：群消息绕过 allowlist；仍会执行提及门控。
- `"disabled"`：阻止所有群/房间消息。
- `"allowlist"`：仅允许匹配 allowlist 的群/房间。
- `channels.defaults.groupPolicy` 用于 provider 未设置 `groupPolicy` 时的默认值。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams 使用 `groupAllowFrom`（兜底：显式 `allowFrom`）。
- Discord/Slack 使用频道 allowlist（`channels.discord.guilds.*.channels`、`channels.slack.channels`）。
- Discord/Slack 的群 DM 仍由 `dm.groupEnabled` + `dm.groupChannels` 控制。
- 默认值为 `groupPolicy: "allowlist"`（除非 `channels.defaults.groupPolicy` 覆盖）；若未配置 allowlist，则群消息被阻止。

### 多 agent 路由（`agents.list` + `bindings`）

在一个 Gateway 内运行多个隔离 agent（独立工作区、`agentDir`、会话）。入站消息通过 bindings 路由到 agent。

- `agents.list[]`：按 agent 覆盖。
  - `id`：稳定的 agent id（必填）。
  - `default`：可选；若多个为 true，则以第一个为准并记录警告。
    若都未设置，则列表**第一项**为默认 agent。
  - `name`：agent 显示名。
  - `workspace`：默认 `~/clawd-<agentId>`（对 `main` 回退到 `agents.defaults.workspace`）。
  - `agentDir`：默认 `~/.clawdbot/agents/<agentId>/agent`。
  - `model`：按 agent 默认模型，覆盖该 agent 的 `agents.defaults.model`。
    - 字符串形式：`"provider/model"`，仅覆盖 `agents.defaults.model.primary`
    - 对象形式：`{ primary, fallbacks }`（`fallbacks` 覆盖 `agents.defaults.model.fallbacks`；`[]` 可为该 agent 禁用全局 fallback）
  - `identity`：每个 agent 的 name/theme/emoji（用于提及模式 + ack 反应）。
  - `groupChat`：按 agent 提及门控（`mentionPatterns`）。
  - `sandbox`：按 agent 沙箱配置（覆盖 `agents.defaults.sandbox`）。
    - `mode`：`"off"` | `"non-main"` | `"all"`
    - `workspaceAccess`：`"none"` | `"ro"` | `"rw"`
    - `scope`：`"session"` | `"agent"` | `"shared"`
    - `workspaceRoot`：自定义沙箱工作区根目录
    - `docker`：按 agent 的 Docker 覆盖（如 `image`、`network`、`env`、`setupCommand`、限制；`scope: "shared"` 时忽略）
    - `browser`：按 agent 的沙箱浏览器覆盖（`scope: "shared"` 时忽略）
    - `prune`：按 agent 的沙箱清理覆盖（`scope: "shared"` 时忽略）
  - `subagents`：按 agent 的子 agent 默认值。
    - `allowAgents`：该 agent 可用于 `sessions_spawn` 的 agent id allowlist（`["*"]` = 任意；默认仅同一 agent）
  - `tools`：按 agent 的工具限制（在沙箱工具策略之前应用）。
    - `profile`：基础工具 profile（在 allow/deny 前应用）
    - `allow`：允许工具名数组
    - `deny`：拒绝工具名数组（deny 优先）
- `agents.defaults`：共享 agent 默认值（模型、工作区、沙箱等）。
- `bindings[]`：把入站消息路由到 `agentId`。
  - `match.channel`（必填）
  - `match.accountId`（可选；`*` = 任意账号；省略 = 默认账号）
  - `match.peer`（可选；`{ kind: dm|group|channel, id }`）
  - `match.guildId` / `match.teamId`（可选；频道特定）

确定性匹配顺序：
1) `match.peer`
2) `match.guildId`
3) `match.teamId`
4) `match.accountId`（精确，无 peer/guild/team）
5) `match.accountId: "*"`（频道级，无 peer/guild/team）
6) 默认 agent（`agents.list[].default`，否则列表第一项，否则 `"main"`）

在每个匹配层级内，`bindings` 中第一个匹配项生效。

#### 按 agent 的访问配置（多 agent）

每个 agent 可携带自己的沙箱与工具策略。用它在一个 gateway 内混合不同访问级别：
- **完全访问**（个人 agent）
- **只读**工具 + 工作区
- **无文件系统访问**（仅消息/会话工具）

优先级与更多示例见 [Multi-Agent Sandbox & Tools](/multi-agent-sandbox-tools)。

完全访问（无沙箱）：
```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/clawd-personal",
        sandbox: { mode: "off" }
      }
    ]
  }
}
```

只读工具 + 只读工作区：
```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/clawd-family",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "ro"
        },
        tools: {
          allow: ["read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"]
        }
      }
    ]
  }
}
```

无文件系统访问（仅消息/会话工具）：
```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/clawd-public",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "none"
        },
        tools: {
          allow: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status", "whatsapp", "telegram", "slack", "discord", "gateway"],
          deny: ["read", "write", "edit", "apply_patch", "exec", "process", "browser", "canvas", "nodes", "cron", "gateway", "image"]
        }
      }
    ]
  }
}
```

示例：两个 WhatsApp 账号 → 两个 agent：

```json5
{
  agents: {
