---
summary: "/think + /verbose 指令语法及其对模型推理的影响"
read_when:
  - 调整 thinking 或 verbose 指令解析或默认值
---
# 思考级别（/think 指令）

## 功能说明
- 任意入站消息内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh`（仅 GPT-5.2 + Codex 模型）
  - minimal → “think”
  - low → “think hard”
  - medium → “think harder”
  - high → “ultrathink”（最高预算）
  - xhigh → “ultrathink+”（仅 GPT-5.2 + Codex）
  - `highest`、`max` 映射到 `high`。
- Provider 说明：
  - Z.AI（`zai/*`）仅支持二元思考（`on`/`off`）。任何非 `off` 都视为 `on`（映射到 `low`）。

## 解析顺序
1. 消息内联指令（仅对该消息生效）。
2. 会话覆盖（通过仅指令消息设置）。
3. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
4. 回退：支持推理的模型默认为 low，否则 off。

## 设置会话默认值
- 发送**仅包含**指令的消息（可含空白），如 `/think:medium` 或 `/t high`。
- 对当前会话生效（默认按发送者）；`/think:off` 或会话 idle 重置会清除。
- 会返回确认回复（`Thinking level set to high.` / `Thinking disabled.`）。若级别无效（如 `/thinking big`），会提示并保持原状态。
- 发送 `/think`（或 `/think:`）不带参数可查看当前思考级别。

## 按 agent 应用
- **Embedded Pi**：解析后的级别会传给进程内的 Pi agent 运行时。

## Verbose 指令（/verbose 或 /v）
- 级别：`on`（minimal） | `full` | `off`（默认）。
- 仅指令消息会切换会话 verbose 并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效级别会提示且不改变状态。
- `/verbose off` 会写入显式会话覆盖；可在 Sessions UI 中选择 `inherit` 清除。
- 内联指令仅影响该条消息；其他情况使用会话/全局默认。
- 发送 `/verbose`（或 `/verbose:`）不带参数可查看当前 verbose 级别。
- 开启 verbose 时，输出结构化工具结果的 agent（Pi、其他 JSON agent）会将每个工具调用作为独立的元数据消息发送，尽可能以 `<emoji> <tool-name>: <arg>` 前缀（如 path/command）。这些摘要会在工具启动时发送（独立气泡），非流式增量。
- `full` 时，工具输出在完成后也会单独转发（独立气泡，安全截断）。若运行中切换 `/verbose on|full|off`，后续工具气泡将遵循新设置。

## Reasoning 可见性（/reasoning）
- 级别：`on|off|stream`。
- 仅指令消息可切换是否显示 reasoning 块。
- 启用后，reasoning 会以**独立消息**发送，并以 `Reasoning:` 前缀标识。
- `stream`（仅 Telegram）：在生成回复时把 reasoning 流式写入 Telegram 草稿气泡，最终答案不含 reasoning。
- 别名：`/reason`。
- 发送 `/reasoning`（或 `/reasoning:`）不带参数可查看当前 reasoning 级别。

## 相关
- Elevated 模式文档见 [Elevated mode](/tools/elevated)。

## 心跳
- 心跳探测体为配置的心跳提示（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令照常生效（但避免在心跳中修改会话默认值）。
- 心跳默认仅投递最终 payload。若要同时发送单独的 `Reasoning:` 消息（如可用），设置 `agents.defaults.heartbeat.includeReasoning: true` 或按 agent 设置 `agents.list[].heartbeat.includeReasoning: true`。

## Web chat UI
- Web chat 思考选择器在页面加载时会从入站会话存储/配置读取当前级别。
- 选择其他级别仅对下一条消息生效（`thinkingOnce`）；发送后会回到会话级别。
- 要更改会话默认值，请发送 `/think:<level>` 指令；下次刷新后选择器会反映该设置。
