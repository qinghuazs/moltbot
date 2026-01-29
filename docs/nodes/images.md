---
summary: "发送 gateway 与 agent 回复的图像与媒体处理规则"
read_when:
  - 修改媒体管线或附件逻辑
---
# 图像与媒体支持（2025-12-05）

WhatsApp 渠道通过 **Baileys Web** 运行。本文记录当前的发送、gateway 与 agent 回复的媒体处理规则。

## 目标
- 通过 `moltbot message send --media` 发送媒体并可附加说明文字。
- 允许 web 收件箱自动回复同时包含媒体与文本。
- 保持各类型限制合理且可预期。

## CLI 接口
- `moltbot message send --media <path-or-url> [--message <caption>]`
  - `--media` 可选；caption 可为空以仅发送媒体。
  - `--dry-run` 打印解析后的 payload；`--json` 输出 `{ channel, to, messageId, mediaUrl, caption }`。

## WhatsApp Web 渠道行为
- 输入：本地文件路径**或**HTTP(S) URL。
- 流程：加载为 Buffer，检测媒体类型并构造正确 payload：
  - **图片：** 重新缩放并压缩为 JPEG（最大边 2048px），目标大小 `agents.defaults.mediaMaxMb`（默认 5 MB），上限 6 MB。
  - **音频/语音/视频：** 透传至 16 MB；音频以语音消息发送（`ptt: true`）。
  - **文档：** 其他类型，上限 100 MB，尽量保留文件名。
- WhatsApp GIF 样式播放：发送 MP4 并设置 `gifPlayback: true`（CLI：`--gif-playback`），使移动端内联循环。
- MIME 检测优先级：魔数 → 头部 → 文件扩展名。
- caption 来源于 `--message` 或 `reply.text`；允许空 caption。
- 日志：非 verbose 显示 `↩️`/`✅`；verbose 包含大小与来源路径/URL。

## 自动回复管线
- `getReplyFromConfig` 返回 `{ text?, mediaUrl?, mediaUrls? }`。
- 当包含媒体时，web sender 使用与 `moltbot message send` 相同的管线解析本地路径或 URL。
- 若提供多个媒体条目，会按顺序依次发送。

## 入站媒体到命令（Pi）
- 当入站 web 消息包含媒体时，Moltbot 下载到临时文件并暴露模板变量：
  - `{{MediaUrl}}` 入站媒体的伪 URL。
  - `{{MediaPath}}` 运行命令前写入的本地临时路径。
- 当启用按会话的 Docker 沙箱时，入站媒体会复制到沙箱工作区，`MediaPath`/`MediaUrl` 会被重写为相对路径，例如 `media/inbound/<filename>`。
- 媒体理解（若通过 `tools.media.*` 或共享 `tools.media.models` 配置）在模板替换前运行，可将 `[Image]`、`[Audio]`、`[Video]` 块插入到 `Body`。
  - 音频会设置 `{{Transcript}}`，并用转写结果进行命令解析以保证斜杠命令可用。
  - 视频与图像描述会保留 caption 文本用于命令解析。
- 默认只处理第一条匹配的图像/音频/视频附件；设置 `tools.media.<cap>.attachments` 可处理多附件。

## 限制与错误
**出站发送上限（WhatsApp web send）**
- 图片：重压缩后约 6 MB 上限。
- 音频/语音/视频：16 MB 上限；文档：100 MB 上限。
- 超大或不可读媒体 → 日志给出清晰错误，并跳过该回复。

**媒体理解上限（转写/描述）**
- 图片默认：10 MB（`tools.media.image.maxBytes`）。
- 音频默认：20 MB（`tools.media.audio.maxBytes`）。
- 视频默认：50 MB（`tools.media.video.maxBytes`）。
- 超出上限会跳过理解，但仍按原始正文继续回复。

## 测试说明
- 覆盖图片/音频/文档的发送与回复流程。
- 校验图片重压缩（大小限制）与音频语音消息标志。
- 确保多媒体回复按顺序发送。
