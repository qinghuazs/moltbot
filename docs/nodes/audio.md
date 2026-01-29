---
summary: "入站音频 语音消息的下载 转写 与回复注入"
read_when:
  - 修改音频转写或媒体处理
---
# 音频与语音消息（2026-01-17）

## 可用功能
- **媒体理解（音频）**：如果启用音频理解（或自动检测），Moltbot 会：
  1) 定位第一条音频附件（本地路径或 URL），必要时下载。
  2) 在发送到每个模型前执行 `maxBytes` 限制。
  3) 按顺序运行第一个可用模型（provider 或 CLI）。
  4) 若失败或跳过（尺寸/超时），尝试下一个条目。
  5) 成功后，将 `Body` 替换为 `[Audio]` 块并设置 `{{Transcript}}`。
- **命令解析**：当转写成功时，`CommandBody`/`RawBody` 会设为转写文本，保证斜杠命令仍可用。
- **Verbose 日志**：`--verbose` 时会记录转写开始与替换正文的日志。

## 自动检测（默认）

如果**未配置模型**且 `tools.media.audio.enabled` **不为** `false`，
Moltbot 会按如下顺序自动检测并在找到可用选项后停止：

1) **本地 CLI**（已安装时）
   - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR` 且包含 encoder/decoder/joiner/tokens）
   - `whisper-cli`（来自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置 tiny 模型）
   - `whisper`（Python CLI；自动下载模型）
2) **Gemini CLI**（`gemini`），使用 `read_many_files`
3) **Provider keys**（OpenAI → Groq → Deepgram → Google）

要禁用自动检测，设置 `tools.media.audio.enabled: false`。
要自定义，设置 `tools.media.audio.models`。
说明：二进制检测在 macOS/Linux/Windows 上为尽力而为；确保 CLI 在 `PATH` 中（会展开 `~`），或设置带完整命令路径的 CLI 模型。

## 配置示例

### Provider + CLI 回退（OpenAI + Whisper CLI）
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
            timeoutSeconds: 45
          }
        ]
      }
    }
  }
}
```

### 仅 provider 并按 scope 限制
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        scope: {
          default: "allow",
          rules: [
            { action: "deny", match: { chatType: "group" } }
          ]
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" }
        ]
      }
    }
  }
}
```

### 仅 provider（Deepgram）
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }]
      }
    }
  }
}
```

## 说明与限制
- Provider 认证遵循标准模型认证顺序（auth profiles、环境变量、`models.providers.*.apiKey`）。
- 使用 `provider: "deepgram"` 时会读取 `DEEPGRAM_API_KEY`。
- Deepgram 详情：[Deepgram（音频转写）](/providers/deepgram)。
- 音频 provider 可通过 `tools.media.audio` 覆盖 `baseUrl`、`headers`、`providerOptions`。
- 默认大小上限为 20MB（`tools.media.audio.maxBytes`）。超出上限会跳过该模型并尝试下一个。
- 音频默认 `maxChars` **不限制**（完整转写）。可设置 `tools.media.audio.maxChars` 或每条 `maxChars` 以截断输出。
- OpenAI 的默认模型是 `gpt-4o-mini-transcribe`；如需更高准确率可设 `model: "gpt-4o-transcribe"`。
- 使用 `tools.media.audio.attachments` 处理多条语音消息（`mode: "all"` + `maxAttachments`）。
- 转写文本可在模板中使用 `{{Transcript}}`。
- CLI stdout 有上限（5MB）；请保持输出简洁。

## 注意事项
- scope 规则为先匹配先生效。`chatType` 归一化为 `direct`、`group`、`room`。
- 确保 CLI 以 0 退出并输出纯文本；JSON 输出需用 `jq -r .text` 处理。
- 适当设置超时（`timeoutSeconds`，默认 60s），避免阻塞回复队列。
