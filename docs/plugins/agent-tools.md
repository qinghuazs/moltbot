---
summary: "在插件中编写 agent 工具（schema、可选工具、allowlist）"
read_when:
  - 你要在插件中新增 agent 工具
  - 你需要通过 allowlist 让工具变为可选
---
# 插件 agent 工具

Moltbot 插件可以注册 **agent 工具**（JSON schema 函数），在 agent 运行时暴露给 LLM。工具可以是**必需**（始终可用）或**可选**（需要显式启用）。

agent 工具在主配置的 `tools` 下配置，或在 `agents.list[].tools` 中按 agent 配置。allowlist/denylist 策略控制 agent 可调用哪些工具。

## 基础工具

```ts
import { Type } from "@sinclair/typebox";

export default function (api) {
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({
      input: Type.String(),
    }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });
}
```

## 可选工具（需手动启用）

可选工具**不会**自动启用。用户必须把它们加入 agent allowlist。

```ts
export default function (api) {
  api.registerTool(
    {
      name: "workflow_tool",
      description: "Run a local workflow",
      parameters: {
        type: "object",
        properties: {
          pipeline: { type: "string" },
        },
        required: ["pipeline"],
      },
      async execute(_id, params) {
        return { content: [{ type: "text", text: params.pipeline }] };
      },
    },
    { optional: true },
  );
}
```

在 `agents.list[].tools.allow`（或全局 `tools.allow`）启用可选工具：

```json5
{
  agents: {
    list: [
      {
        id: "main",
        tools: {
          allow: [
            "workflow_tool",  // 具体工具名
            "workflow",       // 插件 id（启用该插件所有工具）
            "group:plugins"   // 所有插件工具
          ]
        }
      }
    ]
  }
}
```

影响工具可用性的其他配置：
- 仅包含插件工具的 allowlist 会被视为插件启用；核心工具仍保持可用，除非你也把核心工具或分组加入 allowlist。
- `tools.profile` / `agents.list[].tools.profile`（基础 allowlist）
- `tools.byProvider` / `agents.list[].tools.byProvider`（按提供方的 allow/deny）
- `tools.sandbox.tools.*`（沙箱模式下的工具策略）

## 规则与提示

- 工具名**不能**与核心工具重名；冲突工具会被跳过。
- allowlist 中使用的插件 id 不能与核心工具名冲突。
- 对会产生副作用或需要额外二进制/凭据的工具，优先使用 `optional: true`。
