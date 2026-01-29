---
summary: "提升 exec 模式与 /elevated 指令"
read_when:
  - 调整 elevated 默认值、allowlist 或斜杠命令行为
---
# 提升模式（/elevated 指令）

## 功能说明
- `/elevated on` 在 gateway 主机执行，并保留 exec 审批（同 `/elevated ask`）。
- `/elevated full` 在 gateway 主机执行，**自动审批 exec**（跳过 exec 审批）。
- `/elevated ask` 在 gateway 主机执行，但保留 exec 审批（同 `/elevated on`）。
- `on`/`ask` **不会**强制 `exec.security=full`；仍遵循已配置的 security/ask 策略。
- 仅在 agent **处于沙箱**时改变行为（否则 exec 已在宿主运行）。
- 指令形式：`/elevated on|off|ask|full`，`/elev on|off|ask|full`。
- 仅接受 `on|off|ask|full`；其他输入会返回提示且不改变状态。

## 控制范围（与不控制的内容）
- **可用性门控**：`tools.elevated` 为全局基线。`agents.list[].tools.elevated` 可进一步限制（两者都需允许）。
- **会话级状态**：`/elevated on|off|ask|full` 为当前会话 key 设置 elevated 级别。
- **行内指令**：消息中的 `/elevated on|ask|full` 仅对该条消息生效。
- **群聊**：群聊中仅在提及 agent 时才生效；绕过提及要求的命令消息视为已提及。
- **宿主执行**：elevated 会强制 `exec` 在 gateway 主机运行；`full` 还会设置 `security=full`。
- **审批**：`full` 跳过 exec 审批；`on`/`ask` 在规则要求时仍需审批。
- **非沙箱 agent**：对执行位置无效；仅影响门控、日志与状态。
- **工具策略仍生效**：若工具策略拒绝 `exec`，elevated 无效。
- **与 `/exec` 分离**：`/exec` 调整会话级默认值，且不需要 elevated。

## 解析顺序
1. 消息内的行内指令（仅对该消息生效）。
2. 会话覆盖（通过仅含指令的消息设置）。
3. 全局默认值（配置中的 `agents.defaults.elevatedDefault`）。

## 设置会话默认值
- 发送**仅包含**指令的消息（可带空白），如 `/elevated full`。
- 会返回确认回复（`Elevated mode set to full...` / `Elevated mode disabled.`）。
- 若 elevated 被禁用或发送者不在 allowlist，指令会返回可操作错误且不更改会话状态。
- 发送 `/elevated`（或 `/elevated:`）不带参数可查看当前 elevated 级别。

## 可用性 + allowlist
- 功能开关：`tools.elevated.enabled`（即便代码支持，也可在配置中关闭）。
- 发送者 allowlist：`tools.elevated.allowFrom`（按 provider，如 `discord`、`whatsapp`）。
- 按 agent 开关：`agents.list[].tools.elevated.enabled`（可选，仅能进一步限制）。
- 按 agent allowlist：`agents.list[].tools.elevated.allowFrom`（可选；设置后发送者需同时匹配全局 + 按 agent allowlist）。
- Discord 兜底：若未设置 `tools.elevated.allowFrom.discord`，会回退到 `channels.discord.dm.allowFrom`。设置 `tools.elevated.allowFrom.discord`（即便为空数组）即可覆盖。按 agent allowlist 不走此兜底。
- 所有门控均需通过；否则 elevated 视为不可用。

## 日志与状态
- Elevated exec 调用记录为 info 级别日志。
- 会话状态包含 elevated 模式（如 `elevated=ask`、`elevated=full`）。
