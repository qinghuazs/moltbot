---
summary: "引导向导与配置 schema 的 RPC 协议说明"
read_when: "修改引导向导步骤或配置 schema 端点"
---

# 引导与配置协议

目的：在 CLI、macOS 应用与 Web UI 之间共享引导与配置入口。

## 组件
- 向导引擎（共享会话、提示与引导状态）。
- CLI 引导与 UI 客户端使用同一套向导流程。
- Gateway RPC 暴露向导与配置 schema 端点。
- macOS 引导使用向导步骤模型。
- Web UI 通过 JSON Schema 与 UI hint 渲染配置表单。

## Gateway RPC
- `wizard.start` 参数：`{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` 参数：`{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` 参数：`{ sessionId }`
- `wizard.status` 参数：`{ sessionId }`
- `config.schema` 参数：`{}`

响应（结构）
- 向导：`{ sessionId, done, step?, status?, error? }`
- 配置 schema：`{ schema, uiHints, version, generatedAt }`

## UI Hint
- `uiHints` 以路径为 key；包含可选元数据（label/help/group/order/advanced/sensitive/placeholder）。
- 敏感字段渲染为密码输入；没有额外脱敏层。
- 不支持的 schema 节点会回退为原始 JSON 编辑器。

## 说明
- 本文档是跟踪引导与配置协议重构的唯一位置。
