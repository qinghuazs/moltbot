# 插件系统

## 概述

插件系统是 Moltbot 的扩展机制，允许通过插件动态添加工具、渠道、命令、钩子、服务等功能。插件可以来自工作区、全局安装或内置。

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           插件系统架构                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        插件来源                                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │   │
│  │  │ 内置插件  │ │ 全局插件  │ │ 工作区插件│ │ 配置插件  │               │   │
│  │  │ bundled  │ │ global   │ │ workspace│ │ config   │               │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘               │   │
│  │       │            │            │            │                      │   │
│  │       └────────────┴────────────┴────────────┘                      │   │
│  │                                 │                                    │   │
│  └─────────────────────────────────┼────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        插件加载器                                     │   │
│  │                    loadMoltbotPlugins()                              │   │
│  │                                                                      │   │
│  │  1. 发现插件 (discovery)                                             │   │
│  │  2. 加载插件模块 (loader)                                            │   │
│  │  3. 验证插件配置 (manifest)                                          │   │
│  │  4. 注册到注册表 (registry)                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        插件注册表                                     │   │
│  │                                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Tools   │ │  Hooks   │ │ Channels │ │ Services │ │ Commands │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                           │   │
│  │  │Providers │ │HTTP Route│ │ Gateway  │                           │   │
│  │  └──────────┘ └──────────┘ └──────────┘                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 插件定义

### 基本结构

```typescript
// 插件定义
type MoltbotPluginDefinition = {
  id?: string;                    // 插件 ID
  name?: string;                  // 插件名称
  description?: string;           // 插件描述
  version?: string;               // 插件版本
  kind?: PluginKind;              // 插件类型 (如 "memory")
  configSchema?: MoltbotPluginConfigSchema;  // 配置 Schema
  register?: (api: MoltbotPluginApi) => void | Promise<void>;  // 注册函数
  activate?: (api: MoltbotPluginApi) => void | Promise<void>;  // 激活函数
};

// 插件模块 (支持两种形式)
type MoltbotPluginModule =
  | MoltbotPluginDefinition
  | ((api: MoltbotPluginApi) => void | Promise<void>);
```

### 插件 API

```typescript
type MoltbotPluginApi = {
  // 基本信息
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  config: MoltbotConfig;
  pluginConfig?: Record<string, unknown>;
  runtime: PluginRuntime;
  logger: PluginLogger;

  // 注册方法
  registerTool: (tool, opts?) => void;           // 注册工具
  registerHook: (events, handler, opts?) => void; // 注册钩子
  registerChannel: (registration) => void;        // 注册渠道
  registerService: (service) => void;             // 注册服务
  registerProvider: (provider) => void;           // 注册提供商
  registerCommand: (command) => void;             // 注册命令
  registerHttpHandler: (handler) => void;         // 注册 HTTP 处理器
  registerHttpRoute: (params) => void;            // 注册 HTTP 路由
  registerGatewayMethod: (method, handler) => void; // 注册网关方法
  registerCli: (registrar, opts?) => void;        // 注册 CLI 命令

  // 工具方法
  resolvePath: (input: string) => string;         // 解析路径
  on: (hookName, handler, opts?) => void;         // 注册生命周期钩子
};
```

## 插件生命周期

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        插件生命周期                                       │
└──────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────┐
     │                    1. 发现 (Discovery)                           │
     │  - 扫描插件目录                                                   │
     │  - 读取 package.json                                             │
     │  - 检查插件清单                                                   │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    2. 加载 (Load)                                │
     │  - 动态导入插件模块                                               │
     │  - 解析插件定义                                                   │
     │  - 验证插件配置                                                   │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    3. 注册 (Register)                            │
     │  - 调用 register() 函数                                          │
     │  - 注册工具、钩子、渠道等                                          │
     │  - 添加到注册表                                                   │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    4. 激活 (Activate)                            │
     │  - 调用 activate() 函数                                          │
     │  - 启动服务                                                      │
     │  - 初始化状态                                                    │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    5. 运行 (Running)                             │
     │  - 处理请求                                                      │
     │  - 响应事件                                                      │
     │  - 执行任务                                                      │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    6. 停止 (Stop)                                │
     │  - 调用 service.stop()                                           │
     │  - 清理资源                                                      │
     │  - 保存状态                                                      │
     └─────────────────────────────────────────────────────────────────┘
```

## 插件钩子

### 可用钩子

| 钩子名称 | 触发时机 | 上下文 |
|---------|---------|-------|
| `before_agent_start` | Agent 启动前 | AgentContext |
| `agent_end` | Agent 结束后 | AgentContext |
| `before_compaction` | 压缩前 | AgentContext |
| `after_compaction` | 压缩后 | AgentContext |
| `message_received` | 收到消息 | MessageContext |
| `message_sending` | 发送消息前 | MessageContext |
| `message_sent` | 发送消息后 | MessageContext |
| `before_tool_call` | 工具调用前 | ToolContext |
| `after_tool_call` | 工具调用后 | ToolContext |
| `tool_result_persist` | 工具结果持久化 | ToolContext |
| `session_start` | 会话开始 | SessionContext |
| `session_end` | 会话结束 | SessionContext |
| `gateway_start` | 网关启动 | GatewayContext |
| `gateway_stop` | 网关停止 | GatewayContext |

### 钩子示例

```typescript
api.on("before_agent_start", async (event, ctx) => {
  // 在 Agent 启动前注入上下文
  return {
    prependContext: "Today is " + new Date().toDateString(),
  };
});

api.on("message_sending", async (event, ctx) => {
  // 修改或取消消息发送
  if (event.content.includes("secret")) {
    return { cancel: true };
  }
  return { content: event.content + "\n\n-- Sent via Moltbot" };
});

api.on("before_tool_call", async (event, ctx) => {
  // 阻止特定工具调用
  if (event.toolName === "exec" && !isAllowed(ctx)) {
    return { block: true, blockReason: "Not authorized" };
  }
});
```

## 插件类型

### 工具插件

```typescript
api.registerTool({
  name: "my_tool",
  description: "My custom tool",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: async (toolCallId, params) => {
    return {
      content: [{ type: "text", text: "Result" }],
    };
  },
});
```

### 渠道插件

```typescript
api.registerChannel({
  plugin: {
    id: "my-channel",
    name: "My Channel",
    // ... 渠道实现
  },
  dock: {
    // ... Dock 配置
  },
});
```

### 服务插件

```typescript
api.registerService({
  id: "my-service",
  start: async (ctx) => {
    // 启动服务
  },
  stop: async (ctx) => {
    // 停止服务
  },
});
```

### 命令插件

```typescript
api.registerCommand({
  name: "mycommand",
  description: "My custom command",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    return {
      text: `Hello, ${ctx.senderId}!`,
    };
  },
});
```

### 提供商插件

```typescript
api.registerProvider({
  id: "my-provider",
  label: "My Provider",
  models: {
    // 模型配置
  },
  auth: [
    {
      id: "api-key",
      label: "API Key",
      kind: "api_key",
      run: async (ctx) => {
        // 认证流程
      },
    },
  ],
});
```

## 插件配置

### 配置 Schema

```typescript
const configSchema: MoltbotPluginConfigSchema = {
  safeParse: (value) => {
    // Zod 风格的验证
    return { success: true, data: value };
  },
  validate: (value) => {
    // 自定义验证
    return { ok: true, value };
  },
  uiHints: {
    apiKey: {
      label: "API Key",
      help: "Your API key",
      sensitive: true,
    },
  },
  jsonSchema: {
    type: "object",
    properties: {
      apiKey: { type: "string" },
    },
  },
};
```

### 配置文件

```yaml
# moltbot.yaml

plugins:
  my-plugin:
    enabled: true
    apiKey: "..."
    options:
      feature1: true
      feature2: false
```

## 插件目录结构

```
my-plugin/
├── package.json          # 包信息
├── index.ts              # 入口文件
├── src/
│   ├── tools/            # 工具实现
│   ├── hooks/            # 钩子实现
│   └── services/         # 服务实现
└── README.md             # 文档
```

### package.json

```json
{
  "name": "moltbot-plugin-example",
  "version": "1.0.0",
  "main": "index.ts",
  "moltbot": {
    "plugin": true,
    "id": "example",
    "name": "Example Plugin"
  },
  "dependencies": {
    "moltbot": "^2024.1.0"
  }
}
```

## 核心代码位置

```
src/plugins/
├── loader.ts             # 插件加载器
├── registry.ts           # 插件注册表
├── discovery.ts          # 插件发现
├── manifest.ts           # 插件清单
├── hooks.ts              # 插件钩子
├── tools.ts              # 插件工具
├── commands.ts           # 插件命令
├── types.ts              # 类型定义
├── config-state.ts       # 配置状态
└── runtime/
    └── types.ts          # 运行时类型
```

## 示例插件

### 完整示例

```typescript
// index.ts
import { Type } from "@sinclair/typebox";

export default {
  id: "example-plugin",
  name: "Example Plugin",
  version: "1.0.0",
  description: "An example Moltbot plugin",

  configSchema: {
    jsonSchema: {
      type: "object",
      properties: {
        greeting: { type: "string", default: "Hello" },
      },
    },
  },

  register: (api) => {
    const greeting = api.pluginConfig?.greeting ?? "Hello";

    // 注册工具
    api.registerTool({
      name: "greet",
      description: "Greet someone",
      parameters: Type.Object({
        name: Type.String(),
      }),
      execute: async (_, params) => ({
        content: [{ type: "text", text: `${greeting}, ${params.name}!` }],
      }),
    });

    // 注册钩子
    api.on("message_received", async (event, ctx) => {
      api.logger.info(`Received message from ${event.from}`);
    });

    // 注册命令
    api.registerCommand({
      name: "hello",
      description: "Say hello",
      handler: async (ctx) => ({
        text: `${greeting}, ${ctx.senderId}!`,
      }),
    });
  },
};
```

## 相关文档

- [工具系统](../工具系统/README.md)
- [插件工具](../工具系统/插件工具/README.md)
- [渠道系统](../渠道系统/README.md)
