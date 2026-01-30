---
summary: "计划：添加 OpenResponses /v1/responses 端点，并平滑弃用 chat completions"
owner: "moltbot"
status: "draft"
last_updated: "2026-01-19"
---

# OpenResponses Gateway 集成计划

## 背景

Moltbot Gateway 目前暴露一个最小的 OpenAI 兼容 Chat Completions 端点
`/v1/chat/completions`（见 [OpenAI Chat Completions](/gateway/openai-http-api)）。

Open Responses 是基于 OpenAI Responses API 的开放推理标准，面向代理工作流，使用基于 item 的输入与语义化流事件。OpenResponses 规范定义的是 `/v1/responses`，不是 `/v1/chat/completions`。

## 目标

- 添加遵循 OpenResponses 语义的 `/v1/responses` 端点。
- 保留 Chat Completions 作为易于关闭且最终可移除的兼容层。
- 使用隔离且可复用的 schema 标准化校验与解析。

## 非目标

- 首版即实现 OpenResponses 全特性（图片、文件、托管工具）。
- 替换内部代理执行逻辑或工具编排。
- 在首阶段改变现有 `/v1/chat/completions` 行为。

## 研究总结

来源：OpenResponses OpenAPI、OpenResponses 规范站点、Hugging Face 博文。

关键要点：

- `POST /v1/responses` 接受 `CreateResponseBody` 字段，如 `model`、`input`（字符串或 `ItemParam[]`）、`instructions`、`tools`、`tool_choice`、`stream`、`max_output_tokens`、`max_tool_calls`。
- `ItemParam` 是区分联合：
  - `message` 项，角色为 `system`、`developer`、`user`、`assistant`
  - `function_call` 与 `function_call_output`
  - `reasoning`
  - `item_reference`
- 成功响应返回 `ResponseResource`，包含 `object: "response"`、`status` 与 `output` items。
- 流式使用语义事件：
  - `response.created`、`response.in_progress`、`response.completed`、`response.failed`
  - `response.output_item.added`、`response.output_item.done`
  - `response.content_part.added`、`response.content_part.done`
  - `response.output_text.delta`、`response.output_text.done`
- 规范要求：
  - `Content-Type: text/event-stream`
  - `event:` 必须与 JSON `type` 字段匹配
  - 终止事件必须是字面量 `[DONE]`
- Reasoning item 可包含 `content`、`encrypted_content` 与 `summary`。
- HF 示例在请求中包含可选头 `OpenResponses-Version: latest`。

## 方案架构

- 新增 `src/gateway/open-responses.schema.ts`，仅包含 Zod schema（不引入 gateway）。
- 新增 `src/gateway/openresponses-http.ts`（或 `open-responses-http.ts`）实现 `/v1/responses`。
- 保留 `src/gateway/openai-http.ts` 作为旧兼容适配器。
- 新增配置 `gateway.http.endpoints.responses.enabled`（默认 `false`）。
- 保持 `gateway.http.endpoints.chatCompletions.enabled` 独立，可分别开关。
- 当启用 Chat Completions 时输出启动警告，提示其为旧接口。

## Chat Completions 弃用路径

- 严格模块边界：responses 与 chat completions 之间不共享 schema 类型。
- Chat Completions 通过配置 opt-in，可不改代码直接关闭。
- 当 `/v1/responses` 稳定后在文档标注 Chat Completions 为 legacy。
- 可选未来步骤：将 Chat Completions 请求映射到 Responses 处理器，方便移除。

## Phase 1 支持子集

- 允许 `input` 为字符串或带 message 角色与 `function_call_output` 的 `ItemParam[]`。
- 将 system 与 developer 消息提取为 `extraSystemPrompt`。
- 使用最新的 `user` 或 `function_call_output` 作为代理运行的当前消息。
- 对不支持的 content part（图片、文件）返回 `invalid_request_error`。
- 返回单条 assistant 消息，包含 `output_text` 内容。
- 返回 `usage`，在接入 token 统计前使用零值。

## 校验策略（不依赖 SDK）

- 为支持子集实现 Zod schema：
  - `CreateResponseBody`
  - `ItemParam` 与 message content part 联合
  - `ResponseResource`
  - gateway 使用到的流事件形态
- schema 放在单一隔离模块，避免漂移并便于未来代码生成。

## 流式实现（Phase 1）

- SSE 行包含 `event:` 与 `data:`。
- 最小可用事件序列：
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta`（按需重复）
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## 测试与验证计划

- 为 `/v1/responses` 添加 e2e 覆盖：
  - 认证必需
  - 非流式响应形态
  - 流事件顺序与 `[DONE]`
  - 通过 header 与 `user` 的会话路由
- 保持 `src/gateway/openai-http.e2e.test.ts` 不变。
- 手动：用 curl 请求 `/v1/responses` 且 `stream: true`，验证事件顺序与终止 `[DONE]`。

## 文档更新（后续）

- 新增 `/v1/responses` 使用与示例文档。
- 更新 `/gateway/openai-http-api`，注明 legacy 并指向 `/v1/responses`。
