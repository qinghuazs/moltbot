# 核心工具

## 概述

核心工具是 Moltbot 原生提供的工具集，提供系统级功能，包括消息发送、记忆搜索、网络访问、浏览器控制、会话管理等。

## 工具列表

| 工具名称 | 功能描述 | 文档链接 |
|---------|---------|---------|
| `message` | 跨渠道消息发送和管理 | [消息工具](./消息工具.md) |
| `memory_search` | 语义搜索记忆文件 | [记忆工具](./记忆工具.md) |
| `memory_get` | 读取记忆文件片段 | [记忆工具](./记忆工具.md) |
| `web_search` | 网络搜索 | [网络工具](./网络工具.md) |
| `web_fetch` | 网页内容抓取 | [网络工具](./网络工具.md) |
| `browser` | 浏览器控制 | [浏览器工具](./浏览器工具.md) |
| `canvas` | 画布操作 | [画布工具](./画布工具.md) |
| `sessions_list` | 列出会话 | [会话工具](./会话工具.md) |
| `sessions_history` | 获取会话历史 | [会话工具](./会话工具.md) |
| `sessions_send` | 发送消息到会话 | [会话工具](./会话工具.md) |
| `sessions_spawn` | 创建子会话 | [会话工具](./会话工具.md) |
| `session_status` | 获取会话状态 | [会话工具](./会话工具.md) |
| `cron` | 定时任务管理 | [自动化工具](./自动化工具.md) |
| `gateway` | 网关控制 | [自动化工具](./自动化工具.md) |
| `agents_list` | 列出 Agent | [自动化工具](./自动化工具.md) |
| `nodes` | 节点管理 | [节点工具](./节点工具.md) |
| `image` | 图像处理 | [媒体工具](./媒体工具.md) |
| `tts` | 文本转语音 | [媒体工具](./媒体工具.md) |

## 工具创建流程

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        核心工具创建流程                                    │
└──────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────┐
     │                    createMoltbotTools()                          │
     │                 src/agents/moltbot-tools.ts                      │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    创建各个工具实例                                │
     │                                                                  │
     │  createBrowserTool()      → browser                             │
     │  createCanvasTool()       → canvas                              │
     │  createNodesTool()        → nodes                               │
     │  createCronTool()         → cron                                │
     │  createMessageTool()      → message                             │
     │  createTtsTool()          → tts                                 │
     │  createGatewayTool()      → gateway                             │
     │  createAgentsListTool()   → agents_list                         │
     │  createSessionsListTool() → sessions_list                       │
     │  createSessionsHistoryTool() → sessions_history                 │
     │  createSessionsSendTool() → sessions_send                       │
     │  createSessionsSpawnTool() → sessions_spawn                     │
     │  createSessionStatusTool() → session_status                     │
     │  createWebSearchTool()    → web_search                          │
     │  createWebFetchTool()     → web_fetch                           │
     │  createImageTool()        → image                               │
     │                                                                  │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    resolvePluginTools()                          │
     │                 加载插件工具                                       │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    返回工具数组                                    │
     │                 [...tools, ...pluginTools]                       │
     └─────────────────────────────────────────────────────────────────┘
```

## 核心代码位置

```
src/agents/
├── moltbot-tools.ts           # 核心工具集创建入口
└── tools/
    ├── common.ts              # 通用工具辅助函数
    ├── message-tool.ts        # 消息工具
    ├── memory-tool.ts         # 记忆工具
    ├── web-tools.ts           # 网络工具入口
    ├── web-search.ts          # 网络搜索实现
    ├── web-fetch.ts           # 网页抓取实现
    ├── browser-tool.ts        # 浏览器工具
    ├── canvas-tool.ts         # 画布工具
    ├── sessions-list-tool.ts  # 会话列表工具
    ├── sessions-history-tool.ts # 会话历史工具
    ├── sessions-send-tool.ts  # 会话发送工具
    ├── sessions-spawn-tool.ts # 会话生成工具
    ├── session-status-tool.ts # 会话状态工具
    ├── cron-tool.ts           # 定时任务工具
    ├── gateway-tool.ts        # 网关工具
    ├── agents-list-tool.ts    # Agent 列表工具
    ├── nodes-tool.ts          # 节点工具
    ├── image-tool.ts          # 图像工具
    └── tts-tool.ts            # TTS 工具
```

## 工具接口定义

所有工具都实现 `AnyAgentTool` 接口：

```typescript
// src/agents/tools/common.ts

export type AnyAgentTool = AgentTool<any, unknown>;

// 来自 @mariozechner/pi-agent-core
interface AgentTool<TParams, TDetails> {
  name: string;
  label?: string;
  description: string;
  parameters: TSchema;  // TypeBox schema
  execute: (
    toolCallId: string,
    params: TParams,
    signal?: AbortSignal,
    onUpdate?: (result: AgentToolResult<TDetails>) => void
  ) => Promise<AgentToolResult<TDetails>>;
}
```

## 通用辅助函数

`src/agents/tools/common.ts` 提供了通用的参数读取和结果格式化函数：

### 参数读取

```typescript
// 读取字符串参数
readStringParam(params, "key", { required: true });

// 读取数字参数
readNumberParam(params, "key", { integer: true });

// 读取字符串数组参数
readStringArrayParam(params, "key");

// 读取反应参数
readReactionParams(params, { emojiKey: "emoji", removeKey: "remove" });
```

### 结果格式化

```typescript
// JSON 结果
jsonResult({ success: true, data: {...} });

// 图像结果
await imageResult({
  label: "screenshot",
  path: "/path/to/image.png",
  base64: "...",
  mimeType: "image/png"
});

// 从文件创建图像结果
await imageResultFromFile({
  label: "screenshot",
  path: "/path/to/image.png"
});
```

## 工具配置选项

创建核心工具时可以传入以下选项：

```typescript
createMoltbotTools({
  // 沙箱浏览器桥接 URL
  sandboxBrowserBridgeUrl?: string;

  // 是否允许主机浏览器控制
  allowHostBrowserControl?: boolean;

  // Agent 会话密钥
  agentSessionKey?: string;

  // Agent 渠道
  agentChannel?: GatewayMessageChannel;

  // Agent 账户 ID
  agentAccountId?: string;

  // 投递目标
  agentTo?: string;

  // 线程 ID
  agentThreadId?: string | number;

  // 群组 ID
  agentGroupId?: string | null;

  // Agent 目录
  agentDir?: string;

  // 沙箱根目录
  sandboxRoot?: string;

  // 工作区目录
  workspaceDir?: string;

  // 是否沙箱化
  sandboxed?: boolean;

  // 配置
  config?: MoltbotConfig;

  // 插件工具允许列表
  pluginToolAllowlist?: string[];

  // 当前频道 ID (Slack)
  currentChannelId?: string;

  // 当前线程时间戳 (Slack)
  currentThreadTs?: string;

  // 回复模式
  replyToMode?: "off" | "first" | "all";

  // 模型是否有视觉能力
  modelHasVision?: boolean;
});
```

## 工具组归属

核心工具属于以下工具组：

| 工具组 | 包含工具 |
|-------|---------|
| `group:memory` | memory_search, memory_get |
| `group:web` | web_search, web_fetch |
| `group:sessions` | sessions_list, sessions_history, sessions_send, sessions_spawn, session_status |
| `group:ui` | browser, canvas |
| `group:automation` | cron, gateway |
| `group:messaging` | message |
| `group:nodes` | nodes |
| `group:moltbot` | 所有核心工具 |

## 相关文档

- [工具系统架构](../README.md)
- [工具策略系统](../工具策略系统.md)
- [消息工具](./消息工具.md)
- [记忆工具](./记忆工具.md)
- [网络工具](./网络工具.md)
- [会话工具](./会话工具.md)
