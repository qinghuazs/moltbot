---
summary: "面向工作流的 JSON-only LLM 任务（可选插件工具）"
read_when:
  - 想在工作流中加入 JSON-only 的 LLM 步骤
  - 需要可 schema 校验的 LLM 输出
---

# LLM Task

`llm-task` 是**可选插件工具**，运行 JSON-only LLM 任务并返回结构化输出（可选 JSON Schema 校验）。

这非常适合 Lobster 等工作流引擎：你可以插入一个 LLM 步骤，而无需为每个工作流编写自定义 Moltbot 代码。

## 启用插件

1) 启用插件：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

2) 加入工具 allowlist（该工具注册为 `optional: true`）：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

## 配置（可选）

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai-codex",
          "defaultModel": "gpt-5.2",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai-codex/gpt-5.2"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` 是 `provider/model` 的 allowlist。设置后，列表外请求会被拒绝。

## 工具参数

- `prompt`（string，必填）
- `input`（any，可选）
- `schema`（object，可选 JSON Schema）
- `provider`（string，可选）
- `model`（string，可选）
- `authProfileId`（string，可选）
- `temperature`（number，可选）
- `maxTokens`（number，可选）
- `timeoutMs`（number，可选）

## 输出

返回 `details.json`，包含解析后的 JSON（如提供 `schema` 则校验）。

## 示例：Lobster 工作流步骤

```lobster
clawd.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "input": {
    "subject": "Hello",
    "body": "Can you help?"
  },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

## 安全说明

- 工具为 **JSON-only**，会要求模型只输出 JSON（不含代码围栏/评论）。
- 此次运行不会暴露任何工具给模型。
- 如无 `schema` 校验，请将输出视为不可信。
- 任何有副作用的步骤（发送/发布/执行）前应设置审批。
