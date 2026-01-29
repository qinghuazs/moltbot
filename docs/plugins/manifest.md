---
summary: "插件清单与 JSON schema 要求（严格配置校验）"
read_when:
  - 你在构建 Moltbot 插件
  - 你需要发布插件配置 schema 或排查插件校验错误
---
# 插件清单（moltbot.plugin.json）

每个插件**必须**在**插件根目录**提供 `moltbot.plugin.json` 文件。
Moltbot 使用该清单在**不执行插件代码**的情况下验证配置。缺失或无效的清单会被视为插件错误并阻断配置校验。

完整插件系统指南见：[Plugins](/plugin)。

## 必填字段

```json
{
  "id": "voice-call",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

必填键：
- `id`（string）：规范的插件 id。
- `configSchema`（object）：插件配置的 JSON Schema（内联）。

可选键：
- `kind`（string）：插件类型（例如：`"memory"`）。
- `channels`（array）：该插件注册的渠道 id（例如：`["matrix"]`）。
- `providers`（array）：该插件注册的 provider id。
- `skills`（array）：需要加载的技能目录（相对插件根目录）。
- `name`（string）：插件显示名称。
- `description`（string）：插件简述。
- `uiHints`（object）：用于 UI 渲染的字段标签/占位符/敏感标记。
- `version`（string）：插件版本（信息用途）。

## JSON Schema 要求

- **每个插件都必须提供 JSON Schema**，即便不需要配置。
- 可以提供空 schema（例如 `{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置读写时校验，而不是运行时。

## 校验行为

- 未知的 `channels.*` 键视为**错误**，除非该 channel id 在某个插件清单中声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 与 `plugins.slots.*` 必须引用**可发现的**插件 id。未知 id 视为**错误**。
- 插件已安装但清单或 schema 缺失或损坏时，校验失败，Doctor 会报告插件错误。
- 如果存在插件配置但插件被**禁用**，配置会保留，并在 Doctor 与日志中给出**警告**。

## 说明

- 清单对**所有插件**都必需，包括本地文件系统加载的插件。
- 运行时仍会单独加载插件模块；清单仅用于发现与校验。
- 如果插件依赖原生模块，请记录构建步骤以及包管理器 allowlist 要求（例如 pnpm 的 `allow-build-scripts` + `pnpm rebuild <package>`）。
