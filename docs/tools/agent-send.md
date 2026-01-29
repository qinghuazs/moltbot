---
summary: "直接运行 `moltbot agent`（可选回传投递）"
read_when:
  - 添加或修改 agent CLI 入口
---
# `moltbot agent`（直接运行 agent）

`moltbot agent` 在没有入站聊天消息的情况下运行一次 agent。默认会**通过 Gateway**；加上 `--local` 可强制使用当前机器上的内置运行时。

## 行为

- 必填：`--message <text>`
- 会话选择：
  - `--to <dest>` 派生会话键（群组或频道目标保持隔离；私聊折叠到 `main`），**或**
  - `--session-id <id>` 复用已有会话 id，**或**
  - `--agent <id>` 直接指定已配置的 agent（使用该 agent 的 `main` 会话键）
- 运行同样的内置 agent 运行时，与正常入站回复一致。
- thinking/verbose 标志会持久化到会话存储。
- 输出：
  - 默认：打印回复文本（附带 `MEDIA:<url>` 行）
  - `--json`：打印结构化载荷与元数据
- 可使用 `--deliver` + `--channel` 把回复回传到某个渠道（目标格式与 `moltbot message --target` 一致）。
- 使用 `--reply-channel`/`--reply-to`/`--reply-account` 在不改变会话的情况下覆盖投递目标。

若 Gateway 不可达，CLI 会**回退**为本地内置运行。

## 示例

```bash
moltbot agent --to +15555550123 --message "status update"
moltbot agent --agent ops --message "Summarize logs"
moltbot agent --session-id 1234 --message "Summarize inbox" --thinking medium
moltbot agent --to +15555550123 --message "Trace logs" --verbose on --json
moltbot agent --to +15555550123 --message "Summon reply" --deliver
moltbot agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## 参数

- `--local`：本地运行（需要在 shell 中设置模型提供方 API key）
- `--deliver`：将回复发送到选定渠道
- `--channel`：投递渠道（`whatsapp|telegram|discord|googlechat|slack|signal|imessage`，默认：`whatsapp`）
- `--reply-to`：覆盖投递目标
- `--reply-channel`：覆盖投递渠道
- `--reply-account`：覆盖投递账号 id
- `--thinking <off|minimal|low|medium|high|xhigh>`：持久化思考级别（仅 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`：持久化 verbose 级别
- `--timeout <seconds>`：覆盖 agent 超时
- `--json`：输出结构化 JSON
