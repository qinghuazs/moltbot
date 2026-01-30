---
summary: "出站渠道的 Markdown 格式化管线"
read_when:
  - 需要修改出站渠道的 Markdown 格式或分块
  - 添加新的渠道格式化器或样式映射
  - 排查跨渠道格式回归
---
# Markdown 格式化

Moltbot 会先将出站 Markdown 转换为共享的中间表示（IR），再渲染为渠道特定输出。
IR 保留源文本，同时携带样式与链接跨度，确保分块与渲染在各渠道保持一致。

## 目标

- **一致性：**一次解析，多种渲染器。
- **安全分块：**在渲染前分割文本，避免内联格式跨块断裂。
- **渠道适配：**用同一 IR 映射到 Slack mrkdwn、Telegram HTML 与 Signal 样式范围，无需再次解析 Markdown。

## 管线

1. **解析 Markdown -> IR**
   - IR 是纯文本，加上样式跨度（粗体/斜体/删除线/代码/剧透）与链接跨度。
   - 偏移以 UTF-16 代码单元计，以匹配 Signal API 的样式范围。
   - 仅在渠道选择启用表格转换时解析表格。
2. **分块 IR（先格式）**
   - 分块在渲染前对 IR 文本进行。
   - 内联格式不会跨块拆分；跨度会按块切片。
3. **按渠道渲染**
   - **Slack：**mrkdwn 标记（粗体/斜体/删除线/代码），链接为 `<url|label>`。
   - **Telegram：**HTML 标签（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`）。
   - **Signal：**纯文本 + `text-style` 范围；当 label 与 url 不同，链接变为 `label (url)`。

## IR 示例

输入 Markdown：

```markdown
Hello **world** - see [docs](https://docs.molt.bot).
```

IR（示意）：

```json
{
  "text": "Hello world - see docs.",
  "styles": [
    { "start": 6, "end": 11, "style": "bold" }
  ],
  "links": [
    { "start": 19, "end": 23, "href": "https://docs.molt.bot" }
  ]
}
```

## 使用位置

- Slack、Telegram、Signal 的出站适配器从 IR 渲染。
- 其它渠道（WhatsApp、iMessage、MS Teams、Discord）仍使用纯文本或各自格式规则；启用 Markdown 表格转换时，会在分块前处理。

## 表格处理

Markdown 表格在各聊天客户端支持不一致。使用 `markdown.tables` 控制每个渠道（以及每个账号）的转换方式。

- `code`：将表格渲染为代码块（多数渠道默认）。
- `bullets`：将每行转换为项目符号（Signal 与 WhatsApp 默认）。
- `off`：禁用表格解析与转换，原表格文本透传。

配置键：

```yaml
channels:
  discord:
    markdown:
      tables: code
    accounts:
      work:
        markdown:
          tables: off
```

## 分块规则

- 分块上限来自渠道适配器或配置，并应用到 IR 文本。
- 代码块保持为单一块并带结尾换行，确保渠道正确渲染。
- 列表与引用前缀是 IR 文本的一部分，因此不会在前缀中间断开。
- 内联样式（粗体/斜体/删除线/行内代码/剧透）从不跨块拆分；渲染器会在每块内重新打开样式。

如需了解跨渠道分块行为，见
[Streaming + chunking](/concepts/streaming)。

## 链接策略

- **Slack：**`[label](url)` -> `<url|label>`；裸 URL 保持不变。解析时关闭自动链接以避免重复链接。
- **Telegram：**`[label](url)` -> `<a href="url">label</a>`（HTML 解析模式）。
- **Signal：**`[label](url)` -> `label (url)`，除非 label 与 URL 相同。

## 剧透

剧透标记（`||spoiler||`）仅在 Signal 中解析并映射为 SPOILER 样式范围。其它渠道将其视为纯文本。

## 如何添加或更新渠道格式化器

1. **只解析一次：**使用共享的 `markdownToIR(...)`，并传入渠道合适选项（autolink、heading 样式、blockquote 前缀）。
2. **渲染：**用 `renderMarkdownWithMarkers(...)` 实现渲染器与样式 marker 映射（或 Signal 样式范围）。
3. **分块：**在渲染前调用 `chunkMarkdownIR(...)`，并逐块渲染。
4. **接线适配器：**更新渠道出站适配器以使用新分块器与渲染器。
5. **测试：**新增或更新格式化测试，若渠道使用分块则添加出站投递测试。

## 常见坑

- Slack 的尖括号 token（`<@U123>`、`<#C123>`、`<https://...>`）必须保留；安全转义原始 HTML。
- Telegram HTML 需要转义标签外文本以避免破坏标记。
- Signal 样式范围依赖 UTF-16 偏移，不能用 code point 偏移。
- 对代码块保留末尾换行，使关闭标记独占一行。
