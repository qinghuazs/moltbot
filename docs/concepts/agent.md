---
summary: "代理运行时（嵌入式 p-mono）、工作区契约和会话引导"
read_when:
  - 更改代理运行时、工作区引导或会话行为
---
# 代理运行时 🤖

Moltbot 运行一个源自 **p-mono** 的单一嵌入式代理运行时。

## 工作区（必需）

Moltbot 使用单个代理工作区目录（`agents.defaults.workspace`）作为代理工具和上下文的**唯一**工作目录（`cwd`）。

推荐：使用 `moltbot setup` 创建 `~/.clawdbot/moltbot.json`（如果缺失）并初始化工作区文件。

完整工作区布局 + 备份指南：[代理工作区](/concepts/agent-workspace)

如果启用了 `agents.defaults.sandbox`，非主会话可以使用 `agents.defaults.sandbox.workspaceRoot` 下的每会话工作区覆盖此设置（参见 [网关配置](/gateway/configuration)）。

## 引导文件（注入）

在 `agents.defaults.workspace` 内，Moltbot 期望这些用户可编辑的文件：
- `AGENTS.md` — 操作指令 + "记忆"
- `SOUL.md` — 人格、边界、语气
- `TOOLS.md` — 用户维护的工具笔记（例如 `imsg`、`sag`、约定）
- `BOOTSTRAP.md` — 一次性首次运行仪式（完成后删除）
- `IDENTITY.md` — 代理名称/氛围/表情符号
- `USER.md` — 用户资料 + 首选称呼

在新会话的第一轮，Moltbot 将这些文件的内容直接注入代理上下文。

空白文件被跳过。大文件被修剪和截断并带有标记，以保持提示精简（读取文件获取完整内容）。

如果文件缺失，Moltbot 注入单个"缺失文件"标记行（`moltbot setup` 将创建安全的默认模板）。

`BOOTSTRAP.md` 仅为**全新工作区**创建（没有其他引导文件存在）。如果您在完成仪式后删除它，它不应在以后的重启时重新创建。

要完全禁用引导文件创建（对于预先填充的工作区），设置：

```json5
{ agent: { skipBootstrap: true } }
```

## 内置工具

核心工具（read/exec/edit/write 和相关系统工具）始终可用，受工具策略约束。`apply_patch` 是可选的，由 `tools.exec.applyPatch` 控制。`TOOLS.md` **不**控制哪些工具存在；它只是关于*您*希望如何使用它们的指导。

## 技能

Moltbot 从三个位置加载技能（名称冲突时工作区优先）：
- 捆绑（随安装一起发布）
- 托管/本地：`~/.clawdbot/skills`
- 工作区：`<workspace>/skills`

技能可以通过配置/环境控制（参见 [网关配置](/gateway/configuration) 中的 `skills`）。

## p-mono 集成

Moltbot 重用 p-mono 代码库的部分（模型/工具），但**会话管理、发现和工具连接是 Moltbot 拥有的**。

- 没有 p-coding agent 运行时。
- 不参考 `~/.pi/agent` 或 `<workspace>/.pi` 设置。

## 会话

会话记录存储为 JSONL，位于：
- `~/.clawdbot/agents/<agentId>/sessions/<SessionId>.jsonl`

会话 ID 是稳定的，由 Moltbot 选择。
旧版 Pi/Tau 会话文件夹**不会**被读取。

## 流式传输时的引导

当队列模式为 `steer` 时，入站消息被注入到当前运行中。
队列在**每次工具调用后**检查；如果存在排队的消息，当前助手消息中剩余的工具调用被跳过（错误工具结果为"Skipped due to queued user message."），然后在下一个助手响应之前注入排队的用户消息。

当队列模式为 `followup` 或 `collect` 时，入站消息被保留直到当前轮次结束，然后使用排队的负载开始新的代理轮次。参见 [队列](/concepts/queue) 了解模式 + 防抖/上限行为。

块流式传输在完成的助手块完成后立即发送；它**默认关闭**（`agents.defaults.blockStreamingDefault: "off"`）。
通过 `agents.defaults.blockStreamingBreak` 调整边界（`text_end` vs `message_end`；默认为 text_end）。
使用 `agents.defaults.blockStreamingChunk` 控制软块分块（默认为 800-1200 字符；优先段落断点，然后换行；句子最后）。
使用 `agents.defaults.blockStreamingCoalesce` 合并流式块以减少单行垃圾（发送前基于空闲的合并）。非 Telegram 渠道需要显式 `*.blockStreaming: true` 以启用块回复。
详细工具摘要在工具开始时发出（无防抖）；控制 UI 在可用时通过代理事件流式传输工具输出。
更多详情：[流式传输 + 分块](/concepts/streaming)。

## 模型引用

配置中的模型引用（例如 `agents.defaults.model` 和 `agents.defaults.models`）通过在**第一个** `/` 处分割来解析。

- 配置模型时使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含提供商前缀（示例：`openrouter/moonshotai/kimi-k2`）。
- 如果省略提供商，Moltbot 将输入视为别名或**默认提供商**的模型（仅在模型 ID 中没有 `/` 时有效）。

## 配置（最小）

至少设置：
- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（强烈推荐）

---

*下一步：[群聊](/concepts/group-messages)* 🦞
