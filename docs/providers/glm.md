---
summary: "GLM 模型家族概览及在 Moltbot 中的使用方式"
read_when:
  - 想在 Moltbot 中使用 GLM 模型
  - 需要模型命名规则与设置
---
# GLM models

GLM 是一个**模型家族**（非公司），通过 Z.AI 平台提供。在 Moltbot 中，GLM 模型通过 `zai` provider 访问，模型 ID 类似 `zai/glm-4.7`。

## CLI 设置

```bash
moltbot onboard --auth-choice zai-api-key
```

## 配置片段

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-4.7" } } }
}
```

## 说明

- GLM 版本与可用性可能变化，请查看 Z.AI 最新文档。
- 示例模型 ID：`glm-4.7`、`glm-4.6`。
- 提供商详情见 [/providers/zai](/providers/zai)。
