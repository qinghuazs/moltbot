---
summary: "流式传输 + 分块行为（块回复、草稿流式传输、限制）"
read_when:
  - 解释流式传输或分块在渠道上的工作原理
  - 更改块流式传输或渠道分块行为
  - 调试重复/提前块回复或草稿流式传输
---
# 流式传输 + 分块

Moltbot 有两个独立的"流式传输"层：
- **块流式传输（渠道）：** 在助手写入时发出已完成的**块**。这些是普通渠道消息（不是令牌增量）。
- **类令牌流式传输（仅 Telegram）：** 在生成时用部分文本更新**草稿气泡**；最终消息在结束时发送。

目前**没有真正的令牌流式传输**到外部渠道消息。Telegram 草稿流式传输是唯一的部分流界面。

## 块流式传输（渠道消息）

块流式传输在助手输出可用时以粗块发送。

```
模型输出
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ 分块器在缓冲区增长时发出块
       └─ (blockStreamingBreak=message_end)
            └─ 分块器在 message_end 时刷新
                   └─ 渠道发送（块回复）
```
图例：
- `text_delta/events`：模型流事件（对于非流式模型可能稀疏）。
- `chunker`：`EmbeddedBlockChunker` 应用最小/最大边界 + 断点偏好。
- `channel send`：实际出站消息（块回复）。

**控制：**
- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认关闭）。
- 渠道覆盖：`*.blockStreaming`（和每账户变体）强制每渠道 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（发送前合并流式块）。
- 渠道硬上限：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 渠道分块模式：`*.chunkMode`（`length` 默认，`newline` 在长度分块前按空行（段落边界）分割）。
- Discord 软上限：`channels.discord.maxLinesPerMessage`（默认 17）分割高回复以避免 UI 裁剪。

**边界语义：**
- `text_end`：分块器发出时立即流式传输块；在每个 `text_end` 时刷新。
- `message_end`：等到助手消息完成，然后刷新缓冲输出。

如果缓冲文本超过 `maxChars`，`message_end` 仍使用分块器，因此它可以在结束时发出多个块。

## 分块算法（低/高边界）

块分块由 `EmbeddedBlockChunker` 实现：
- **低边界：** 在缓冲区 >= `minChars` 之前不发出（除非强制）。
- **高边界：** 优先在 `maxChars` 之前分割；如果强制，在 `maxChars` 处分割。
- **断点偏好：** `paragraph` → `newline` → `sentence` → `whitespace` → 硬断点。
- **代码围栏：** 永不在围栏内分割；当在 `maxChars` 处强制时，关闭 + 重新打开围栏以保持 Markdown 有效。

`maxChars` 被限制在渠道 `textChunkLimit`，因此您不能超过每渠道上限。

## 合并（合并流式块）

启用块流式传输时，Moltbot 可以在发送前**合并连续块**。这减少了"单行垃圾"同时仍提供渐进输出。

- 合并在刷新前等待**空闲间隙**（`idleMs`）。
- 缓冲区受 `maxChars` 限制，超过时会刷新。
- `minChars` 防止微小片段发送，直到累积足够文本（最终刷新始终发送剩余文本）。
- 连接符从 `blockStreamingChunk.breakPreference` 派生（`paragraph` → `\n\n`，`newline` → `\n`，`sentence` → 空格）。
- 渠道覆盖可通过 `*.blockStreamingCoalesce`（包括每账户配置）获得。
- 除非覆盖，Signal/Slack/Discord 的默认合并 `minChars` 提升到 1500。

## 块之间的类人节奏

启用块流式传输时，您可以在块回复之间添加**随机暂停**（在第一个块之后）。这使多气泡响应感觉更自然。

- 配置：`agents.defaults.humanDelay`（通过 `agents.list[].humanDelay` 按代理覆盖）。
- 模式：`off`（默认）、`natural`（800-2500ms）、`custom`（`minMs`/`maxMs`）。
- 仅适用于**块回复**，不适用于最终回复或工具摘要。

## "流式块或全部"

这映射到：
- **流式块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（边写边发）。非 Telegram 渠道还需要 `*.blockStreaming: true`。
- **结束时流式全部：** `blockStreamingBreak: "message_end"`（刷新一次，如果很长可能多个块）。
- **无块流式传输：** `blockStreamingDefault: "off"`（仅最终回复）。

**渠道说明：** 对于非 Telegram 渠道，块流式传输**默认关闭**，除非 `*.blockStreaming` 明确设置为 `true`。Telegram 可以在没有块回复的情况下流式传输草稿（`channels.telegram.streamMode`）。

配置位置提醒：`blockStreaming*` 默认值位于 `agents.defaults` 下，而不是根配置。

## Telegram 草稿流式传输（类令牌）

Telegram 是唯一具有草稿流式传输的渠道：
- 在**带主题的私聊**中使用 Bot API `sendMessageDraft`。
- `channels.telegram.streamMode: "partial" | "block" | "off"`。
  - `partial`：用最新流文本更新草稿。
  - `block`：以分块块更新草稿（相同分块器规则）。
  - `off`：无草稿流式传输。
- 草稿块配置（仅用于 `streamMode: "block"`）：`channels.telegram.draftChunk`（默认：`minChars: 200`，`maxChars: 800`）。
- 草稿流式传输与块流式传输分开；块回复默认关闭，仅在非 Telegram 渠道上通过 `*.blockStreaming: true` 启用。
- 最终回复仍是普通消息。
- `/reasoning stream` 将推理写入草稿气泡（仅 Telegram）。

当草稿流式传输活动时，Moltbot 为该回复禁用块流式传输以避免双重流式传输。

```
Telegram（私聊 + 主题）
  └─ sendMessageDraft（草稿气泡）
       ├─ streamMode=partial → 更新最新文本
       └─ streamMode=block   → 分块器更新草稿
  └─ 最终回复 → 普通消息
```
图例：
- `sendMessageDraft`：Telegram 草稿气泡（不是真正的消息）。
- `final reply`：普通 Telegram 消息发送。
