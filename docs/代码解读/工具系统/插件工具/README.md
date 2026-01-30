# 插件工具

## 概述

插件工具系统允许通过插件动态扩展 Moltbot 的工具能力。插件可以注册自定义工具，这些工具与核心工具具有相同的能力和接口。

## 插件工具架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          插件工具架构                                     │
└──────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────┐
     │                    插件加载器                                     │
     │                 loadMoltbotPlugins()                             │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    插件注册表                                     │
     │  - tools: 工具工厂列表                                           │
     │  - hooks: 钩子列表                                               │
     │  - channels: 渠道列表                                            │
     │  - services: 服务列表                                            │
     │  - providers: 提供商列表                                         │
     │  - diagnostics: 诊断信息                                         │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    resolvePluginTools()                          │
     │  - 遍历工具工厂                                                   │
     │  - 检查名称冲突                                                   │
     │  - 应用 allowlist 过滤                                           │
     │  - 设置工具元数据                                                 │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    工具实例列表                                    │
     │                 AnyAgentTool[]                                    │
     └─────────────────────────────────────────────────────────────────┘
```

## 插件工具注册

### 注册方式

插件通过 `registerTool` API 注册工具：

```typescript
// 插件定义
export default {
  id: "my-plugin",
  name: "My Plugin",
  register: (api) => {
    // 方式 1: 直接注册工具对象
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

    // 方式 2: 注册工具工厂函数
    api.registerTool((ctx) => {
      return {
        name: "context_aware_tool",
        description: "Tool with context",
        parameters: Type.Object({}),
        execute: async () => {
          // 可以访问 ctx.config, ctx.agentId 等
          return {
            content: [{ type: "text", text: `Agent: ${ctx.agentId}` }],
          };
        },
      };
    });

    // 方式 3: 注册可选工具 (需要显式启用)
    api.registerTool(myTool, { optional: true });
  },
};
```

### 工具工厂上下文

```typescript
export type MoltbotPluginToolContext = {
  config?: MoltbotConfig;      // Moltbot 配置
  workspaceDir?: string;       // 工作区目录
  agentDir?: string;           // Agent 目录
  agentId?: string;            // Agent ID
  sessionKey?: string;         // 会话密钥
  messageChannel?: string;     // 消息渠道
  agentAccountId?: string;     // Agent 账户 ID
  sandboxed?: boolean;         // 是否沙箱化
};
```

### 工具选项

```typescript
export type MoltbotPluginToolOptions = {
  name?: string;       // 工具名称 (覆盖工具对象中的名称)
  names?: string[];    // 多个工具名称 (用于工具数组)
  optional?: boolean;  // 是否为可选工具
};
```

## 可选工具

可选工具需要在配置中显式启用才能使用：

```yaml
# moltbot.yaml

tools:
  allow:
    - my_optional_tool      # 启用特定工具
    - my-plugin             # 启用插件的所有工具
    - group:plugins         # 启用所有插件工具
```

### 可选工具检查逻辑

```typescript
function isOptionalToolAllowed(params: {
  toolName: string;
  pluginId: string;
  allowlist: Set<string>;
}): boolean {
  if (params.allowlist.size === 0) return false;

  const toolName = normalizeToolName(params.toolName);

  // 检查工具名称是否在允许列表中
  if (params.allowlist.has(toolName)) return true;

  // 检查插件 ID 是否在允许列表中
  const pluginKey = normalizeToolName(params.pluginId);
  if (params.allowlist.has(pluginKey)) return true;

  // 检查是否允许所有插件工具
  return params.allowlist.has("group:plugins");
}
```

## 工具解析流程

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        插件工具解析流程                                    │
└──────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────┐
     │                    resolvePluginTools()                          │
     │                 src/plugins/tools.ts                             │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    1. 加载插件注册表                               │
     │  loadMoltbotPlugins({                                            │
     │    config,                                                       │
     │    workspaceDir,                                                 │
     │    logger,                                                       │
     │  })                                                              │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    2. 遍历工具工厂                                 │
     │  for (const entry of registry.tools) {                           │
     │    // 检查插件是否被阻止                                           │
     │    // 调用工厂函数                                                │
     │    // 处理返回的工具                                              │
     │  }                                                               │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    3. 名称冲突检查                                 │
     │  - 检查插件 ID 是否与核心工具冲突                                   │
     │  - 检查工具名称是否与已有工具冲突                                   │
     │  - 记录诊断信息                                                   │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    4. 可选工具过滤                                 │
     │  - 检查工具是否为可选                                             │
     │  - 检查是否在 allowlist 中                                        │
     │  - 过滤未启用的可选工具                                           │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    5. 设置工具元数据                               │
     │  pluginToolMeta.set(tool, {                                      │
     │    pluginId: entry.pluginId,                                     │
     │    optional: entry.optional,                                     │
     │  })                                                              │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    6. 返回工具列表                                 │
     │  return tools;                                                   │
     └─────────────────────────────────────────────────────────────────┘
```

## 插件工具组

插件工具支持特殊的组标识：

| 组标识 | 描述 |
|-------|------|
| `group:plugins` | 所有插件工具 |
| `<plugin-id>` | 特定插件的所有工具 |

### 插件组构建

```typescript
export function buildPluginToolGroups<T extends { name: string }>(params: {
  tools: T[];
  toolMeta: (tool: T) => { pluginId: string } | undefined;
}): PluginToolGroups {
  const all: string[] = [];
  const byPlugin = new Map<string, string[]>();

  for (const tool of params.tools) {
    const meta = params.toolMeta(tool);
    if (!meta) continue;

    const name = normalizeToolName(tool.name);
    all.push(name);

    const pluginId = meta.pluginId.toLowerCase();
    const list = byPlugin.get(pluginId) ?? [];
    list.push(name);
    byPlugin.set(pluginId, list);
  }

  return { all, byPlugin };
}
```

## 插件工具元数据

每个插件工具都有关联的元数据：

```typescript
type PluginToolMeta = {
  pluginId: string;   // 插件 ID
  optional: boolean;  // 是否为可选工具
};

// 获取工具元数据
export function getPluginToolMeta(tool: AnyAgentTool): PluginToolMeta | undefined {
  return pluginToolMeta.get(tool);
}
```

## 插件 API

### MoltbotPluginApi

```typescript
export type MoltbotPluginApi = {
  id: string;                    // 插件 ID
  name: string;                  // 插件名称
  version?: string;              // 插件版本
  description?: string;          // 插件描述
  source: string;                // 插件来源
  config: MoltbotConfig;         // Moltbot 配置
  pluginConfig?: Record<string, unknown>;  // 插件配置
  runtime: PluginRuntime;        // 插件运行时
  logger: PluginLogger;          // 日志记录器

  // 注册工具
  registerTool: (
    tool: AnyAgentTool | MoltbotPluginToolFactory,
    opts?: MoltbotPluginToolOptions,
  ) => void;

  // 注册钩子
  registerHook: (
    events: string | string[],
    handler: InternalHookHandler,
    opts?: MoltbotPluginHookOptions,
  ) => void;

  // 注册渠道
  registerChannel: (registration: MoltbotPluginChannelRegistration | ChannelPlugin) => void;

  // 注册服务
  registerService: (service: MoltbotPluginService) => void;

  // 注册提供商
  registerProvider: (provider: ProviderPlugin) => void;

  // 注册命令
  registerCommand: (command: MoltbotPluginCommandDefinition) => void;

  // 其他 API...
};
```

## 示例插件

### 基本工具插件

```typescript
// my-plugin/index.ts

import { Type } from "@sinclair/typebox";

export default {
  id: "my-plugin",
  name: "My Plugin",
  version: "1.0.0",

  register: (api) => {
    api.registerTool({
      name: "greet",
      description: "Greet a user",
      parameters: Type.Object({
        name: Type.String({ description: "Name to greet" }),
      }),
      execute: async (toolCallId, params) => {
        const name = params.name || "World";
        return {
          content: [{ type: "text", text: `Hello, ${name}!` }],
          details: { greeted: name },
        };
      },
    });
  },
};
```

### 上下文感知工具插件

```typescript
// context-plugin/index.ts

export default {
  id: "context-plugin",
  name: "Context Plugin",

  register: (api) => {
    api.registerTool((ctx) => {
      // 根据上下文决定是否创建工具
      if (!ctx.config?.myFeature?.enabled) {
        return null;
      }

      return {
        name: "context_tool",
        description: "Tool that uses context",
        parameters: Type.Object({}),
        execute: async () => {
          return {
            content: [{
              type: "text",
              text: `Agent: ${ctx.agentId}, Channel: ${ctx.messageChannel}`,
            }],
          };
        },
      };
    });
  },
};
```

### 可选工具插件

```typescript
// optional-plugin/index.ts

export default {
  id: "optional-plugin",
  name: "Optional Plugin",

  register: (api) => {
    // 可选工具需要在配置中显式启用
    api.registerTool({
      name: "dangerous_tool",
      description: "A dangerous tool that requires explicit enablement",
      parameters: Type.Object({}),
      execute: async () => {
        return {
          content: [{ type: "text", text: "Executed!" }],
        };
      },
    }, { optional: true });
  },
};
```

## 核心代码位置

```
src/plugins/
├── tools.ts           # 插件工具解析
├── types.ts           # 插件类型定义
├── loader.ts          # 插件加载器
└── runtime/
    └── types.ts       # 插件运行时类型
```

## 相关文档

- [工具系统架构](../README.md)
- [工具策略系统](../工具策略系统.md)
- [核心工具](../核心工具/README.md)
