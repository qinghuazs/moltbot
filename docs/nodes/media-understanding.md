---
summary: "入站图像 音频 视频理解（可选）以及 provider 与 CLI 回退"
read_when:
  - 设计或重构媒体理解
  - 调整入站音频 视频 图像预处理
---
# 媒体理解（入站）（2026-01-17）

Moltbot 可在回复管线运行前**总结入站媒体**（图像/音频/视频）。它会在本地工具或 provider key 可用时自动检测，也可禁用或自定义。即便理解关闭，模型仍会照常收到原始文件或 URL。

## 目标
- 可选：将入站媒体预消化为短文本，便于更快路由与更好命令解析。
- 保留原始媒体交付给模型（始终）。
- 支持 **provider API** 与 **CLI 回退**。
- 支持多个模型按顺序回退（错误/尺寸/超时）。

## 高层行为
1) 收集入站附件（`MediaPaths`、`MediaUrls`、`MediaTypes`）。
2) 对每个启用的能力（image/audio/video），按策略选择附件（默认：**第一条**）。
3) 选择第一个符合条件的模型条目（尺寸 + 能力 + 认证）。
4) 若模型失败或媒体过大，**回退到下一个条目**。
5) 成功后：
   - `Body` 变为 `[Image]`、`[Audio]` 或 `[Video]` 块。
   - 音频设置 `{{Transcript}}`；命令解析优先使用 caption 文本，否则使用转写。
   - caption 会以 `User text:` 的形式保留在块内。

如果理解失败或被禁用，**回复流程继续**，使用原始正文与附件。

## 配置概览

`tools.media` 支持**共享模型**与按能力覆盖：
- `tools.media.models`：共享模型列表（用 `capabilities` 限制）。
- `tools.media.image` / `tools.media.audio` / `tools.media.video`：
  - 默认项（`prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`）
  - provider 覆盖（`baseUrl`、`headers`、`providerOptions`）
  - Deepgram 音频选项：`tools.media.audio.providerOptions.deepgram`
  - 可选的**按能力 `models` 列表**（优先于共享模型）
  - `attachments` 策略（`mode`、`maxAttachments`、`prefer`）
  - `scope`（可按 channel/chatType/session key 限制）
- `tools.media.concurrency`：最大并发能力数（默认 **2**）。

```json5
{
  tools: {
    media: {
      models: [ /* shared list */ ],
      image: { /* optional overrides */ },
      audio: { /* optional overrides */ },
      video: { /* optional overrides */ }
    }
  }
}
```

### 模型条目

每个 `models[]` 条目可以是 **provider** 或 **CLI**：

```json5
{
  type: "provider",        // default if omitted
  provider: "openai",
  model: "gpt-5.2",
  prompt: "Describe the image in <= 500 chars.",
  maxChars: 500,
  maxBytes: 10485760,
  timeoutSeconds: 60,
  capabilities: ["image"], // optional, used for multi‑modal entries
  profile: "vision-profile",
  preferredProfile: "vision-fallback"
}
```

```json5
{
  type: "cli",
  command: "gemini",
  args: [
    "-m",
    "gemini-3-flash",
    "--allowed-tools",
    "read_file",
    "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."
  ],
  maxChars: 500,
  maxBytes: 52428800,
  timeoutSeconds: 120,
  capabilities: ["video", "image"]
}
```

CLI 模板还可以使用：
- `{{MediaDir}}`（媒体文件所在目录）
- `{{OutputDir}}`（本次运行的临时目录）
- `{{OutputBase}}`（临时文件基路径，无扩展名）

## 默认值与限制

推荐默认：
- `maxChars`：图像/视频 **500**（短而适合命令解析）
- `maxChars`：音频 **不设置**（除非你想截断）
- `maxBytes`：
  - 图像：**10MB**
  - 音频：**20MB**
  - 视频：**50MB**

规则：
- 若媒体超过 `maxBytes`，该模型被跳过并**尝试下一个**。
- 若模型返回超过 `maxChars`，输出会被截断。
- `prompt` 默认是简单的 “Describe the {media}.” 并附带 `maxChars` 指引（仅图像/视频）。
- 若 `<capability>.enabled: true` 但未配置模型，Moltbot 会尝试
  **当前回复模型**，前提是其 provider 支持该能力。

### 媒体理解自动检测（默认）

如果 `tools.media.<capability>.enabled` **未设置为** `false` 且你未配置模型，
Moltbot 会按以下顺序自动检测并在**第一个可用选项**处停止：

1) **本地 CLI**（仅音频；已安装时）
   - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR` 且包含 encoder/decoder/joiner/tokens）
   - `whisper-cli`（`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置 tiny 模型）
   - `whisper`（Python CLI；自动下载模型）
2) **Gemini CLI**（`gemini`）使用 `read_many_files`
3) **Provider keys**
   - 音频：OpenAI → Groq → Deepgram → Google
   - 图像：OpenAI → Anthropic → Google → MiniMax
   - 视频：Google

要禁用自动检测，设置：
```json5
{
  tools: {
    media: {
      audio: {
        enabled: false
      }
    }
  }
}
```
说明：二进制检测在 macOS/Linux/Windows 上为尽力而为；确保 CLI 在 `PATH` 中（会展开 `~`），或设置带完整命令路径的 CLI 模型。

## 能力（可选）

如果你设置了 `capabilities`，条目只会在这些媒体类型中运行。对于共享列表，Moltbot 可推断默认值：
- `openai`、`anthropic`、`minimax`：**image**
- `google`（Gemini API）：**image + audio + video**
- `groq`：**audio**
- `deepgram`：**audio**

对于 CLI 条目，**请显式设置 `capabilities`**，避免意外匹配。
如果省略 `capabilities`，条目会在其所在列表中生效。

## Provider 支持矩阵（Moltbot 集成）
| 能力 | Provider 集成 | 说明 |
|------------|----------------------|-------|
| 图像 | OpenAI / Anthropic / Google / 其他（通过 `pi-ai`） | 注册表中任意支持图像的模型均可。 |
| 音频 | OpenAI、Groq、Deepgram、Google | Provider 级转写（Whisper/Deepgram/Gemini）。 |
| 视频 | Google（Gemini API） | Provider 级视频理解。 |

## 推荐 provider
**图像**
- 优先使用当前回复模型（若支持图像）。
- 常用默认：`openai/gpt-5.2`、`anthropic/claude-opus-4-5`、`google/gemini-3-pro-preview`。

**音频**
- `openai/gpt-4o-mini-transcribe`、`groq/whisper-large-v3-turbo` 或 `deepgram/nova-3`。
- CLI 回退：`whisper-cli`（whisper-cpp）或 `whisper`。
- Deepgram 设置：[Deepgram（音频转写）](/providers/deepgram)。

**视频**
- `google/gemini-3-flash-preview`（快速）、`google/gemini-3-pro-preview`（更丰富）。
- CLI 回退：`gemini` CLI（支持对视频/音频使用 `read_file`）。

## 附件策略

按能力的 `attachments` 控制处理哪些附件：
- `mode`：`first`（默认）或 `all`
- `maxAttachments`：处理数量上限（默认 **1**）
- `prefer`：`first`、`last`、`path`、`url`

当 `mode: "all"` 时，输出会标注为 `[Image 1/2]`、`[Audio 2/2]` 等。

## 配置示例

### 1) 共享模型列表 + 覆盖
```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.2", capabilities: ["image"] },
        { provider: "google", model: "gemini-3-flash-preview", capabilities: ["image", "audio", "video"] },
        {
          type: "cli",
          command: "gemini",
          args: [
            "-m",
            "gemini-3-flash",
            "--allowed-tools",
            "read_file",
            "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."
          ],
          capabilities: ["image", "video"]
        }
      ],
      audio: {
        attachments: { mode: "all", maxAttachments: 2 }
      },
      video: {
        maxChars: 500
      }
    }
  }
}
```

### 2) 仅音频 + 视频（关闭图像）
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"]
          }
        ]
      },
      video: {
        enabled: true,
        maxChars: 500,
        models: [
          { provider: "google", model: "gemini-3-flash-preview" },
          {
            type: "cli",
            command: "gemini",
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."
            ]
          }
        ]
      }
    }
  }
}
```

### 3) 可选图像理解
```json5
{
  tools: {
    media: {
      image: {
        enabled: true,
        maxBytes: 10485760,
        maxChars: 500,
        models: [
          { provider: "openai", model: "gpt-5.2" },
          { provider: "anthropic", model: "claude-opus-4-5" },
          {
            type: "cli",
            command: "gemini",
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."
            ]
          }
        ]
      }
    }
  }
}
```

### 4) 多模态单条目（显式能力）
```json5
{
  tools: {
    media: {
      image: { models: [{ provider: "google", model: "gemini-3-pro-preview", capabilities: ["image", "video", "audio"] }] },
      audio: { models: [{ provider: "google", model: "gemini-3-pro-preview", capabilities: ["image", "video", "audio"] }] },
      video: { models: [{ provider: "google", model: "gemini-3-pro-preview", capabilities: ["image", "video", "audio"] }] }
    }
  }
}
```

## 状态输出

当媒体理解运行时，`/status` 会包含一行摘要：

```
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)
```

该行显示每项能力的结果，以及适用时选择的 provider/model。

## 说明
- 理解是**尽力而为**。错误不会阻断回复。
- 即使禁用理解，附件仍会传给模型。
- 使用 `scope` 限制理解运行范围（例如仅私信）。

## 相关文档
- [Configuration](/gateway/configuration)
- [Image & Media Support](/nodes/images)
