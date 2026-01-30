# 渠道工具

## 概述

渠道工具是针对特定消息渠道（如 Discord、Telegram、Slack、WhatsApp 等）的专用工具，提供渠道特定的操作能力。

## 渠道工具架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          渠道工具架构                                     │
└──────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────┐
     │                    渠道 Dock 系统                                 │
     │                 src/channels/dock.ts                             │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    渠道插件注册                                    │
     │  - Discord Plugin                                                │
     │  - Telegram Plugin                                               │
     │  - Slack Plugin                                                  │
     │  - WhatsApp Plugin                                               │
     │  - Signal Plugin                                                 │
     │  - iMessage Plugin                                               │
     │  - 扩展渠道插件...                                                │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    listChannelAgentTools()                       │
     │                 src/agents/channel-tools.ts                      │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    渠道工具列表                                    │
     │  - 登录工具 (whatsapp_login 等)                                  │
     │  - 渠道特定操作工具                                               │
     └─────────────────────────────────────────────────────────────────┘
```

## 渠道消息操作

### 通用消息操作

通过 `message` 工具支持的通用操作：

| 操作 | 描述 | 支持渠道 |
|-----|------|---------|
| `send` | 发送消息 | 所有 |
| `react` | 添加反应 | Discord, Telegram, Slack |
| `edit` | 编辑消息 | Discord, Telegram, Slack |
| `delete` | 删除消息 | 所有 |
| `pin` | 固定消息 | Discord, Telegram, Slack |
| `forward` | 转发消息 | Telegram |
| `poll` | 创建投票 | Telegram, Discord |

### 渠道特定操作

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          渠道特定操作                                     │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           Discord                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  消息操作:                                                               │
│  - send, edit, delete, react, pin, unpin                                │
│  - fetch_messages, search_messages                                      │
│  - create_thread, archive_thread                                        │
│                                                                         │
│  服务器管理:                                                             │
│  - list_channels, create_channel, edit_channel, delete_channel          │
│  - list_roles, create_role, edit_role, delete_role                      │
│  - list_members, kick_member, ban_member, unban_member                  │
│                                                                         │
│  事件管理:                                                               │
│  - list_events, create_event, edit_event, delete_event                  │
│                                                                         │
│  贴纸管理:                                                               │
│  - list_stickers, create_sticker                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           Telegram                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  消息操作:                                                               │
│  - send, edit, delete, react, pin, unpin, forward                       │
│  - send_with_effect (消息特效)                                           │
│                                                                         │
│  投票:                                                                   │
│  - poll (创建投票)                                                       │
│                                                                         │
│  贴纸:                                                                   │
│  - send_sticker, list_sticker_sets                                      │
│                                                                         │
│  群组管理:                                                               │
│  - get_chat_info, get_chat_members                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            Slack                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  消息操作:                                                               │
│  - send, edit, delete, react, pin, unpin                                │
│  - fetch_messages, search_messages                                      │
│                                                                         │
│  线程:                                                                   │
│  - reply_in_thread, list_threads                                        │
│                                                                         │
│  频道管理:                                                               │
│  - list_channels, create_channel, archive_channel                       │
│  - invite_to_channel, kick_from_channel                                 │
│                                                                         │
│  用户:                                                                   │
│  - list_users, get_user_info                                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           WhatsApp                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  消息操作:                                                               │
│  - send, delete, react                                                  │
│                                                                         │
│  群组管理:                                                               │
│  - list_groups, get_group_info                                          │
│  - add_participant, remove_participant                                  │
│                                                                         │
│  登录:                                                                   │
│  - whatsapp_login (QR 码登录)                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## 渠道工具管理

### listChannelAgentTools

列出所有渠道的 Agent 工具：

```typescript
// src/agents/channel-tools.ts

export function listChannelAgentTools(params: {
  cfg?: MoltbotConfig;
}): AnyAgentTool[] {
  const tools: AnyAgentTool[] = [];

  // 遍历所有渠道 Dock
  for (const dock of getAllChannelDocks()) {
    if (dock.agentTools) {
      const channelTools = dock.agentTools({ cfg: params.cfg });
      tools.push(...channelTools);
    }
  }

  return tools;
}
```

### listChannelSupportedActions

列出渠道支持的消息操作：

```typescript
export function listChannelSupportedActions(params: {
  cfg?: MoltbotConfig;
  channel?: string;
}): ChannelMessageActionName[] {
  const channel = normalizeMessageChannel(params.channel);
  if (!channel) return [];

  const dock = getChannelDock(channel);
  if (!dock?.messageActions) return [];

  return dock.messageActions({ cfg: params.cfg });
}
```

## 消息工具 Schema 构建

消息工具根据渠道能力动态构建 Schema：

```typescript
// src/agents/tools/message-tool.ts

function buildMessageToolSchema(cfg: MoltbotConfig) {
  const actions = listChannelMessageActions(cfg);
  const includeButtons = supportsChannelMessageButtons(cfg);
  const includeCards = supportsChannelMessageCards(cfg);

  return buildMessageToolSchemaFromActions(
    actions.length > 0 ? actions : ["send"],
    { includeButtons, includeCards }
  );
}
```

## 渠道 Dock 接口

每个渠道通过 Dock 接口注册其能力：

```typescript
// src/channels/dock.ts

export type ChannelDock = {
  // 渠道标识
  id: string;
  name: string;

  // Agent 工具
  agentTools?: (params: { cfg?: MoltbotConfig }) => AnyAgentTool[];

  // 消息操作
  messageActions?: (params: { cfg?: MoltbotConfig }) => ChannelMessageActionName[];

  // 群组策略
  groups?: {
    resolveToolPolicy?: (params: GroupPolicyParams) => ToolPolicyConfig | undefined;
  };

  // 其他能力...
};
```

## 渠道特定操作实现

### Discord 操作

```
src/agents/tools/
├── discord-actions.ts           # Discord 操作入口
├── discord-actions-guild.ts     # 服务器管理操作
├── discord-actions-messaging.ts # 消息操作
└── discord-actions-moderation.ts # 审核操作
```

### Telegram 操作

```
src/agents/tools/
└── telegram-actions.ts          # Telegram 操作
```

### Slack 操作

```
src/agents/tools/
└── slack-actions.ts             # Slack 操作
```

### WhatsApp 操作

```
src/agents/tools/
└── whatsapp-actions.ts          # WhatsApp 操作
```

## 消息操作执行流程

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        消息操作执行流程                                    │
└──────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────┐
     │                    message 工具调用                               │
     │  action: "send" | "edit" | "delete" | ...                        │
     │  channel: "discord" | "telegram" | "slack" | ...                 │
     │  target: 目标 ID                                                 │
     │  params: 操作参数                                                │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    runMessageAction()                            │
     │                 src/infra/outbound/message-action-runner.ts      │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    路由到渠道处理器                                │
     │  - 解析渠道类型                                                   │
     │  - 获取渠道插件                                                   │
     │  - 调用渠道特定处理器                                             │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    渠道插件执行                                    │
     │  - Discord: Discord.js API                                       │
     │  - Telegram: Telegram Bot API                                    │
     │  - Slack: Slack Web API                                          │
     │  - WhatsApp: WhatsApp Web API                                    │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    返回结果                                       │
     │  - 成功: 返回操作结果                                             │
     │  - 失败: 返回错误信息                                             │
     └─────────────────────────────────────────────────────────────────┘
```

## 渠道工具配置

### 启用渠道

```yaml
# moltbot.yaml

channels:
  discord:
    enabled: true
    token: "..."

  telegram:
    enabled: true
    token: "..."

  slack:
    enabled: true
    token: "..."
```

### 渠道特定工具策略

```yaml
# 按渠道配置工具策略
channels:
  discord:
    groups:
      "123456789":  # 服务器 ID
        tools:
          allow:
            - message
            - discord_*
          deny:
            - exec
```

## 核心代码位置

```
src/
├── agents/
│   ├── channel-tools.ts              # 渠道工具管理
│   └── tools/
│       ├── message-tool.ts           # 消息工具
│       ├── discord-actions.ts        # Discord 操作
│       ├── telegram-actions.ts       # Telegram 操作
│       ├── slack-actions.ts          # Slack 操作
│       └── whatsapp-actions.ts       # WhatsApp 操作
├── channels/
│   ├── dock.ts                       # 渠道 Dock 系统
│   └── plugins/
│       ├── types.ts                  # 渠道插件类型
│       └── message-actions.ts        # 消息操作定义
└── infra/
    └── outbound/
        └── message-action-runner.ts  # 消息操作执行器
```

## 相关文档

- [工具系统架构](../README.md)
- [核心工具](../核心工具/README.md)
- [消息工具](../核心工具/消息工具.md)
