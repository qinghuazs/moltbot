# 路由系统

## 概述

路由系统是 Moltbot 的核心组件之一，负责将来自不同渠道的消息路由到正确的 Agent。它支持多种路由策略，包括基于渠道、账户、群组、用户等维度的路由匹配。

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           路由系统架构                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        入站消息                                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Telegram │ │ Discord  │ │  Slack   │ │ WhatsApp │ │  其他    │  │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │   │
│  │       │            │            │            │            │         │   │
│  │       └────────────┴────────────┴────────────┴────────────┘         │   │
│  │                                 │                                    │   │
│  └─────────────────────────────────┼────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    resolveAgentRoute()                               │   │
│  │                                                                      │   │
│  │  输入:                                                               │   │
│  │  - channel: 渠道标识 (telegram/discord/slack/...)                   │   │
│  │  - accountId: 账户 ID                                               │   │
│  │  - peer: 对话方 (kind: dm/group/channel, id: 用户/群组 ID)          │   │
│  │  - guildId: Discord 服务器 ID                                       │   │
│  │  - teamId: Slack 团队 ID                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    路由匹配优先级                                      │   │
│  │                                                                      │   │
│  │  1. binding.peer    - 精确匹配对话方                                  │   │
│  │  2. binding.guild   - 匹配 Discord 服务器                            │   │
│  │  3. binding.team    - 匹配 Slack 团队                                │   │
│  │  4. binding.account - 匹配账户 ID                                    │   │
│  │  5. binding.channel - 匹配渠道 (accountId=*)                         │   │
│  │  6. default         - 使用默认 Agent                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ResolvedAgentRoute                                │   │
│  │                                                                      │   │
│  │  - agentId: 目标 Agent ID                                           │   │
│  │  - channel: 渠道标识                                                 │   │
│  │  - accountId: 账户 ID                                               │   │
│  │  - sessionKey: 会话密钥                                              │   │
│  │  - mainSessionKey: 主会话密钥                                        │   │
│  │  - matchedBy: 匹配方式                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心概念

### 会话密钥 (Session Key)

会话密钥是唯一标识一个会话的字符串，格式如下：

```
agent:<agent-id>:<channel>:<peer-kind>:<peer-id>

示例:
- agent:main:main                              # 主会话
- agent:main:telegram:dm:123456789             # Telegram DM
- agent:main:discord:group:987654321           # Discord 群组
- agent:main:slack:channel:C12345678           # Slack 频道
- agent:main:telegram:default:dm:123456789     # 带账户的 DM
```

### DM 会话作用域

DM (私聊) 会话支持四种作用域模式：

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        DM 会话作用域                                      │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            main (默认)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  所有 DM 共享同一个会话                                                   │
│  会话密钥: agent:main:main                                               │
│  适用场景: 单用户使用，不需要区分对话方                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           per-peer                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  每个对话方一个会话 (跨渠道合并)                                          │
│  会话密钥: agent:main:dm:<peer-id>                                       │
│  适用场景: 同一用户在不同渠道的消息合并                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        per-channel-peer                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  每个渠道的每个对话方一个会话                                             │
│  会话密钥: agent:main:<channel>:dm:<peer-id>                             │
│  适用场景: 区分不同渠道的对话                                             │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    per-account-channel-peer                              │
├─────────────────────────────────────────────────────────────────────────┤
│  每个账户的每个渠道的每个对话方一个会话                                    │
│  会话密钥: agent:main:<channel>:<account-id>:dm:<peer-id>                │
│  适用场景: 多账户场景，完全隔离                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 身份链接 (Identity Links)

身份链接允许将不同渠道的用户 ID 关联到同一个身份：

```yaml
session:
  identityLinks:
    alice:
      - telegram:123456789
      - discord:987654321
      - slack:U12345678
    bob:
      - telegram:111222333
      - whatsapp:+1234567890
```

## 路由绑定配置

### 绑定结构

```typescript
type AgentBinding = {
  agentId: string;
  match: {
    channel: string;           // 渠道标识
    accountId?: string;        // 账户 ID (* 表示任意)
    peer?: {                   // 对话方匹配
      kind: "dm" | "group" | "channel";
      id: string;
    };
    guildId?: string;          // Discord 服务器 ID
    teamId?: string;           // Slack 团队 ID
  };
};
```

### 配置示例

```yaml
bindings:
  # 将特定 Telegram 用户路由到 personal Agent
  - agentId: personal
    match:
      channel: telegram
      peer:
        kind: dm
        id: "123456789"

  # 将 Discord 服务器路由到 community Agent
  - agentId: community
    match:
      channel: discord
      guildId: "987654321"

  # 将 Slack 团队路由到 work Agent
  - agentId: work
    match:
      channel: slack
      teamId: "T12345678"

  # 将特定账户的所有消息路由到 business Agent
  - agentId: business
    match:
      channel: telegram
      accountId: "business-bot"

  # 将整个渠道路由到 support Agent
  - agentId: support
    match:
      channel: whatsapp
      accountId: "*"
```

## 路由解析流程

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        路由解析流程                                       │
└──────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────┐
     │                    1. 规范化输入                                   │
     │  - channel: 转小写                                               │
     │  - accountId: 默认为 "default"                                   │
     │  - peer.id: 保留原始大小写                                        │
     │  - guildId/teamId: 保留原始大小写                                 │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    2. 过滤绑定                                    │
     │  - 匹配 channel                                                  │
     │  - 匹配 accountId (支持 * 通配符)                                │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    3. 优先级匹配                                   │
     │                                                                  │
     │  if (peer) {                                                     │
     │    // 1. 尝试精确匹配 peer                                        │
     │    match = bindings.find(b => matchesPeer(b, peer))              │
     │  }                                                               │
     │                                                                  │
     │  if (!match && guildId) {                                        │
     │    // 2. 尝试匹配 guildId                                         │
     │    match = bindings.find(b => matchesGuild(b, guildId))          │
     │  }                                                               │
     │                                                                  │
     │  if (!match && teamId) {                                         │
     │    // 3. 尝试匹配 teamId                                          │
     │    match = bindings.find(b => matchesTeam(b, teamId))            │
     │  }                                                               │
     │                                                                  │
     │  if (!match) {                                                   │
     │    // 4. 尝试匹配特定 accountId                                   │
     │    match = bindings.find(b => hasSpecificAccount(b))             │
     │  }                                                               │
     │                                                                  │
     │  if (!match) {                                                   │
     │    // 5. 尝试匹配 accountId=*                                     │
     │    match = bindings.find(b => hasWildcardAccount(b))             │
     │  }                                                               │
     │                                                                  │
     │  if (!match) {                                                   │
     │    // 6. 使用默认 Agent                                           │
     │    return defaultAgent                                           │
     │  }                                                               │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    4. 构建会话密钥                                 │
     │  - 根据 dmScope 配置构建会话密钥                                  │
     │  - 应用身份链接                                                   │
     │  - 返回 ResolvedAgentRoute                                       │
     └─────────────────────────────────────────────────────────────────┘
```

## 核心代码位置

```
src/routing/
├── resolve-route.ts    # 路由解析核心逻辑
├── bindings.ts         # 路由绑定管理
└── session-key.ts      # 会话密钥构建和解析
```

## 关键函数

### resolveAgentRoute

解析消息应该路由到哪个 Agent：

```typescript
function resolveAgentRoute(input: ResolveAgentRouteInput): ResolvedAgentRoute {
  // 1. 规范化输入
  // 2. 过滤匹配的绑定
  // 3. 按优先级匹配
  // 4. 构建会话密钥
  // 5. 返回路由结果
}
```

### buildAgentSessionKey

构建会话密钥：

```typescript
function buildAgentSessionKey(params: {
  agentId: string;
  channel: string;
  accountId?: string | null;
  peer?: RoutePeer | null;
  dmScope?: "main" | "per-peer" | "per-channel-peer" | "per-account-channel-peer";
  identityLinks?: Record<string, string[]>;
}): string;
```

### buildAgentPeerSessionKey

构建带对话方信息的会话密钥：

```typescript
function buildAgentPeerSessionKey(params: {
  agentId: string;
  mainKey?: string;
  channel: string;
  accountId?: string | null;
  peerKind?: "dm" | "group" | "channel" | null;
  peerId?: string | null;
  identityLinks?: Record<string, string[]>;
  dmScope?: "main" | "per-peer" | "per-channel-peer" | "per-account-channel-peer";
}): string;
```

## 配置参考

### 完整配置示例

```yaml
# moltbot.yaml

# 默认 Agent
agents:
  default: main
  list:
    - id: main
      model: claude-3-5-sonnet
    - id: work
      model: gpt-4
    - id: personal
      model: claude-3-opus

# 会话配置
session:
  # DM 会话作用域
  dmScope: per-channel-peer

  # 身份链接
  identityLinks:
    alice:
      - telegram:123456789
      - discord:987654321

# 路由绑定
bindings:
  # 特定用户 → personal Agent
  - agentId: personal
    match:
      channel: telegram
      peer:
        kind: dm
        id: "123456789"

  # Discord 服务器 → work Agent
  - agentId: work
    match:
      channel: discord
      guildId: "987654321"

  # 所有 Slack 消息 → work Agent
  - agentId: work
    match:
      channel: slack
      accountId: "*"
```

## 相关文档

- [会话管理系统](../会话管理系统分析.md)
- [渠道系统](../渠道系统/README.md)
- [配置系统](../配置系统/README.md)
