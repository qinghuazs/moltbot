---
summary: "Moltbot 何时显示输入指示器以及如何调整它们"
read_when:
  - 更改输入指示器行为或默认值
---
# 输入指示器

当运行活动时，输入指示器会发送到聊天渠道。使用 `agents.defaults.typingMode` 控制**何时**开始输入，使用 `typingIntervalSeconds` 控制**多久**刷新一次。

## 默认值
当 `agents.defaults.typingMode` **未设置**时，Moltbot 保持旧行为：
- **直接聊天**：模型循环开始后立即开始输入。
- **带提及的群聊**：立即开始输入。
- **无提及的群聊**：仅当消息文本开始流式传输时才开始输入。
- **心跳运行**：禁用输入。

## 模式
将 `agents.defaults.typingMode` 设置为以下之一：
- `never` — 永不显示输入指示器。
- `instant` — **模型循环开始后立即**开始输入，即使运行稍后仅返回静默回复令牌。
- `thinking` — 在**第一个推理增量**时开始输入（需要运行的 `reasoningLevel: "stream"`）。
- `message` — 在**第一个非静默文本增量**时开始输入（忽略 `NO_REPLY` 静默令牌）。

"触发时机"顺序：
`never` → `message` → `thinking` → `instant`

## 配置
```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6
  }
}
```

您可以按会话覆盖模式或节奏：
```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4
  }
}
```

## 注意事项
- `message` 模式不会为仅静默回复（例如用于抑制输出的 `NO_REPLY` 令牌）显示输入。
- `thinking` 仅在运行流式传输推理（`reasoningLevel: "stream"`）时触发。如果模型不发出推理增量，输入不会开始。
- 心跳永不显示输入，无论模式如何。
- `typingIntervalSeconds` 控制**刷新节奏**，而不是开始时间。默认值为 6 秒。
