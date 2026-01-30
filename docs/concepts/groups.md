---
summary: "跨渠道的群聊行为（WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams）"
read_when:
  - 修改群聊行为或提及 gating
---
# 群聊

Moltbot 在不同渠道上以一致方式处理群聊：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams。

## 新手入门（2 分钟）
Moltbot 运行在你的消息账号上，没有单独的 WhatsApp 机器人用户。
如果**你**在群里，Moltbot 也能看到该群并在其中回复。

默认行为：
- 群聊受限（`groupPolicy: "allowlist"`）。
- 回复需要被提及，除非你显式关闭提及 gating。

解释：只有在允许列表中的发送者，通过提及 Moltbot 才能触发它。

> TL;DR
> - **DM 访问**由 `*.allowFrom` 控制。
> - **群聊访问**由 `*.groupPolicy` + 允许列表控制（`*.groups`、`*.groupAllowFrom`）。
> - **回复触发**由提及 gating 控制（`requireMention`、`/activation`）。

快速流程（群消息会发生什么）：
```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![Group message flow](/images/groups-flow.svg)

如果你想...
| 目标 | 需要设置 |
|------|----------|
| 允许所有群，但只在 @ 提及时回复 | `groups: { "*": { requireMention: true } }` |
| 禁用所有群回复 | `groupPolicy: "disabled"` |
| 仅允许指定群 | `groups: { "<group-id>": { ... } }`（不写 `"*"`） |
| 只有你能在群里触发 | `groupPolicy: "allowlist"`，`groupAllowFrom: ["+1555..."]` |

## 会话 key
- 群会话使用 `agent:<agentId>:<channel>:group:<id>`（房间或频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题会在群 id 后追加 `:topic:<threadId>`，从而每个主题独立。
- 私聊使用主会话（或按发送者分会话，视配置而定）。
- 群会话不执行心跳。

## 模式：个人私聊 + 公开群（单代理）

可以，且效果很好，适用于“个人”流量是**私聊**、“公开”流量是**群聊**的情况。

原因：单代理模式下，私聊通常进入**主**会话 key（`agent:main:main`），而群聊总是使用**非主**会话 key（`agent:main:<channel>:group:<id>`）。如果启用沙箱并设置 `mode: "non-main"`，群会话会在 Docker 中运行，而主私聊会话留在宿主机。

这样得到一个代理“大脑”（共享工作区与记忆），但有两种执行姿态：
- **私聊**：全工具（宿主机）
- **群聊**：沙箱 + 受限工具（Docker）

> 如果你需要真正隔离的工作区或人设（“个人”和“公开”永不混用），请使用第二个代理并配置 bindings。见 [Multi-Agent Routing](/concepts/multi-agent)。

示例（私聊在宿主机，群聊沙箱并仅允许消息工具）：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // groups/channels are non-main -> sandboxed
        scope: "session", // strongest isolation (one container per group/channel)
        workspaceAccess: "none"
      }
    }
  },
  tools: {
    sandbox: {
      tools: {
        // If allow is non-empty, everything else is blocked (deny still wins).
        allow: ["group:messaging", "group:sessions"],
        deny: ["group:runtime", "group:fs", "group:ui", "nodes", "cron", "gateway"]
      }
    }
  }
}
```

想要“群只可见文件夹 X”而不是“无宿主访问”？保持 `workspaceAccess: "none"`，仅将允许路径挂载到沙箱：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
        docker: {
          binds: [
            // hostPath:containerPath:mode
            "~/FriendsShared:/data:ro"
          ]
        }
      }
    }
  }
}
```

相关：
- 配置键与默认值：[Gateway configuration](/gateway/configuration#agentsdefaultssandbox)
- 调试工具为何被阻止：[Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind 挂载细节：[Sandboxing](/gateway/sandboxing#custom-bind-mounts)

## 显示标签
- UI 标签使用 `displayName`（若可用），格式为 `<channel>:<token>`。
- `#room` 保留给房间或频道；群聊使用 `g-<slug>`（小写，空格转 `-`，保留 `#@+._-`）。

## 群策略

按渠道控制群或房间消息的处理：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"]
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789", "@username"]
    },
    signal: {
      groupPolicy: "disabled",
      groupAllowFrom: ["+15551234567"]
    },
    imessage: {
      groupPolicy: "disabled",
      groupAllowFrom: ["chat_id:123"]
    },
    msteams: {
      groupPolicy: "disabled",
      groupAllowFrom: ["user@org.com"]
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "GUILD_ID": { channels: { help: { allow: true } } }
      }
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { allow: true } }
    },
    matrix: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["@owner:example.org"],
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true }
      }
    }
  }
}
```

| 策略 | 行为 |
|--------|----------|
| `"open"` | 群聊绕过允许列表；提及 gating 仍生效。 |
| `"disabled"` | 完全阻止群聊消息。 |
| `"allowlist"` | 仅允许与配置允许列表匹配的群或房间。 |

说明：
- `groupPolicy` 与提及 gating 分离（提及 gating 要求 @ 提及）。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams：使用 `groupAllowFrom`（兜底为显式 `allowFrom`）。
- Discord：允许列表使用 `channels.discord.guilds.<id>.channels`。
- Slack：允许列表使用 `channels.slack.channels`。
- Matrix：允许列表使用 `channels.matrix.groups`（房间 ID、别名或名称）。用 `channels.matrix.groupAllowFrom` 限制发送者；也支持按房间 `users` 允许列表。
- 群 DM 有单独控制（`channels.discord.dm.*`、`channels.slack.dm.*`）。
- Telegram 允许列表可匹配用户 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
- 默认是 `groupPolicy: "allowlist"`；若允许列表为空，群消息被阻止。

群消息的评估顺序（快速心智模型）：
1) `groupPolicy`（open/disabled/allowlist）
2) 群允许列表（`*.groups`、`*.groupAllowFrom`、渠道特定允许列表）
3) 提及 gating（`requireMention`、`/activation`）

## 提及 gating（默认）

群消息需要提及，除非按群覆盖。默认值位于 `*.groups."*"`。

回复机器人消息视为隐式提及（渠道支持回复元数据时生效）。适用于 Telegram、WhatsApp、Slack、Discord、Microsoft Teams。

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
        "123@g.us": { requireMention: false }
      }
    },
    telegram: {
      groups: {
        "*": { requireMention: true },
        "123456789": { requireMention: false }
      }
    },
    imessage: {
      groups: {
        "*": { requireMention: true },
        "123": { requireMention: false }
      }
    }
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          mentionPatterns: ["@clawd", "moltbot", "\\+15555550123"],
          historyLimit: 50
        }
      }
    ]
  }
}
```

说明：
- `mentionPatterns` 为大小写不敏感的正则。
- 渠道提供显式提及时仍会通过；正则仅为兜底。
- 每代理覆盖：`agents.list[].groupChat.mentionPatterns`（多个代理共享群时很有用）。
- 仅在可检测提及时才会执行提及 gating（原生提及或已配置 `mentionPatterns`）。
- Discord 默认值在 `channels.discord.guilds."*"`（可按 guild 或 channel 覆盖）。
- 群历史上下文在各渠道统一包装，且**仅待处理**（因提及 gating 被跳过的消息）；全局默认用 `messages.groupChat.historyLimit`，覆盖用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）。设为 `0` 以禁用。

## 群或频道工具限制（可选）
某些渠道配置允许限制**特定群或房间或频道**内可用的工具。

- `tools`：整个群的工具 allow/deny。
- `toolsBySender`：群内按发送者覆盖（key 为发送者 ID、用户名、邮箱或手机号，取决于渠道）。可使用 `"*"` 作为通配。

解析顺序（越具体优先级越高）：
1) 群或频道 `toolsBySender` 匹配
2) 群或频道 `tools`
3) 默认（`"*"`）`toolsBySender` 匹配
4) 默认（`"*"`）`tools`

示例（Telegram）：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { tools: { deny: ["exec"] } },
        "-1001234567890": {
          tools: { deny: ["exec", "read", "write"] },
          toolsBySender: {
            "123456789": { alsoAllow: ["exec"] }
          }
        }
      }
    }
  }
}
```

说明：
- 群或频道工具限制会叠加到全局或代理工具策略上（deny 仍优先）。
- 不同渠道对房间或频道的嵌套不同（如 Discord `guilds.*.channels.*`，Slack `channels.*`，MS Teams `teams.*.channels.*`）。

## 群允许列表
当配置了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些 key 会作为群允许列表。使用 `"*"` 允许所有群，同时仍可设置默认提及行为。

常见意图（可直接复制）：

1) 禁用所有群回复
```json5
{
  channels: { whatsapp: { groupPolicy: "disabled" } }
}
```

2) 仅允许指定群（WhatsApp）
```json5
{
  channels: {
    whatsapp: {
      groups: {
        "123@g.us": { requireMention: true },
        "456@g.us": { requireMention: false }
      }
    }
  }
}
```

3) 允许所有群但需要提及（显式）
```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } }
    }
  }
}
```

4) 只有 owner 能在群里触发（WhatsApp）
```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
      groups: { "*": { requireMention: true } }
    }
  }
}
```

## 激活（仅 owner）
群 owner 可切换每群激活模式：
- `/activation mention`
- `/activation always`

owner 由 `channels.whatsapp.allowFrom` 决定（若未设置则为机器人自身 E.164）。以独立消息发送命令。其它渠道目前忽略 `/activation`。

## 上下文字段
群入站 payload 会设置：
- `ChatType=group`
- `GroupSubject`（如已知）
- `GroupMembers`（如已知）
- `WasMentioned`（提及 gating 结果）
- Telegram 论坛主题还包含 `MessageThreadId` 与 `IsForum`。

代理系统提示会在新群会话的首轮包含群聊简介，提醒模型像人类回复、避免 Markdown 表格，并避免输出字面量 `\n` 序列。

## iMessage 细节
- 路由或允许列表优先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群回复始终回到同一 `chat_id`。

## WhatsApp 细节
WhatsApp 专用行为（历史注入、提及处理细节）见 [Group messages](/concepts/group-messages)。
