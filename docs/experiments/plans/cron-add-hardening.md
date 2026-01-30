---
summary: "加固 cron.add 输入处理、对齐 schema，并改进 cron UI 与代理工具"
owner: "moltbot"
status: "complete"
last_updated: "2026-01-05"
---

# Cron Add 加固与 Schema 对齐

## 背景
近期 gateway 日志显示大量 `cron.add` 因参数无效而失败（缺少 `sessionTarget`、`wakeMode`、`payload`，以及 `schedule` 结构不正确）。这表明至少有一个客户端（很可能是代理工具调用路径）在发送包裹型或不完整的任务 payload。与此同时，TypeScript、gateway schema、CLI 标志与 UI 表单类型之间的 cron provider 枚举存在漂移，且 `cron.status` 的 UI 字段不匹配（UI 期待 `jobCount`，而 gateway 返回 `jobs`）。

## 目标
- 通过规范化常见包裹形态并推断缺失的 `kind` 字段，停止 `cron.add` 的 INVALID_REQUEST 垃圾日志。
- 对齐 gateway schema、cron 类型、CLI 文档与 UI 表单中的 provider 列表。
- 明确代理 cron 工具 schema，让 LLM 生成正确的任务 payload。
- 修复 Control UI 中 cron 状态的任务数显示。
- 添加测试覆盖规范化与工具行为。

## 非目标
- 改变 cron 调度语义或任务执行行为。
- 新增调度类型或 cron 表达式解析。
- 对 cron 的 UI/UX 做超过字段修复之外的改造。

## 发现的问题（当前缺口）
- gateway 的 `CronPayloadSchema` 排除了 `signal` 与 `imessage`，但 TS 类型包含它们。
- Control UI 的 CronStatus 期望 `jobCount`，但 gateway 返回 `jobs`。
- 代理 cron 工具 schema 允许任意 `job` 对象，导致无效输入。
- gateway 对 `cron.add` 严格校验且无规范化，包裹 payload 会失败。

## 已变更内容

- `cron.add` 与 `cron.update` 现在会规范化常见包裹形态，并推断缺失的 `kind` 字段。
- 代理 cron 工具 schema 与 gateway schema 对齐，减少无效 payload。
- provider 枚举在 gateway、CLI、UI 与 macOS 选择器中对齐。
- Control UI 使用 gateway 返回的 `jobs` 字段来显示状态计数。

## 当前行为

- **规范化：**`data`/`job` 包裹的 payload 会被解包；在安全时推断 `schedule.kind` 与 `payload.kind`。
- **默认值：**当缺失时，为 `wakeMode` 与 `sessionTarget` 设定安全默认值。
- **Providers：**Discord/Slack/Signal/iMessage 现已在 CLI 与 UI 中一致展示。

规范化形态与示例见 [Cron jobs](/automation/cron-jobs)。

## 验证

- 观察 gateway 日志，确认 `cron.add` INVALID_REQUEST 错误减少。
- 刷新后确认 Control UI 的 cron 状态显示任务数量。

## 可选后续

- 手动 Control UI 冒烟：为每个 provider 添加一个 cron 任务并验证状态计数。

## 未决问题
- 是否让 `cron.add` 接受客户端传入的 `state`（当前 schema 禁止）？
- 是否允许 `webchat` 作为显式投递 provider（当前在投递解析中被过滤）？
