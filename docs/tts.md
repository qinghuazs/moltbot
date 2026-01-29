---
summary: "出站回复的文本转语音（TTS）"
read_when:
  - 为回复启用 TTS
  - 配置 TTS 提供方或限制
  - 使用 /tts 命令
---

# 文本转语音（TTS）

Moltbot 可用 ElevenLabs、OpenAI 或 Edge TTS 将出站回复转换为音频。
它可在 Moltbot 能发送音频的地方工作；Telegram 会显示为语音消息气泡。

## 支持的服务

- **ElevenLabs**（主/备提供方）
- **OpenAI**（主/备提供方；也用于摘要）
- **Edge TTS**（主/备提供方；使用 `node-edge-tts`，无 API key 时默认）

### Edge TTS 说明

Edge TTS 通过 `node-edge-tts` 库使用 Microsoft Edge 的在线神经 TTS 服务。
它是托管服务（非本地），使用微软端点，且无需 API key。
`node-edge-tts` 提供语音配置与输出格式，但 Edge 服务并非全部支持。 citeturn2search0

由于 Edge TTS 是公共 Web 服务且无公开 SLA/配额，建议将其视为尽力而为。
若需要可保证的配额与支持，请使用 OpenAI 或 ElevenLabs。
Microsoft 的 Speech REST API 文档提到每次请求 10 分钟音频限制；Edge TTS
未公布限制，假设相同或更低。 citeturn0search3

## 可选 API key

若使用 OpenAI 或 ElevenLabs：
- `ELEVENLABS_API_KEY`（或 `XI_API_KEY`）
- `OPENAI_API_KEY`

Edge TTS **不需要** API key。若未找到 API key，Moltbot 默认使用 Edge TTS
（除非 `messages.tts.edge.enabled=false` 禁用）。

若配置了多个提供方，选定的提供方优先使用，其他作为兜底。
自动摘要使用配置的 `summaryModel`（或 `agents.defaults.model.primary`），
因此启用摘要时，该提供方也必须完成认证。

## 服务链接

- [OpenAI Text-to-Speech guide](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Audio API reference](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs Text to Speech](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs Authentication](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech output formats](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## 默认启用吗？

否。自动 TTS **默认关闭**。在配置中用 `messages.tts.auto` 启用，
或在会话内使用 `/tts always`（别名：`/tts on`）。

TTS 启用后，Edge TTS **默认启用**，且在缺少 OpenAI/ElevenLabs API key 时自动使用。

## 配置

TTS 配置位于 `moltbot.json` 的 `messages.tts` 下。
完整 schema 见 [Gateway configuration](/gateway/configuration)。

### 最小配置（启用 + 提供方）

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs"
    }
  }
}
```

### OpenAI 主，ElevenLabs 兜底

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openai",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: {
        enabled: true
      },
      openai: {
        apiKey: "openai_api_key",
        model: "gpt-4o-mini-tts",
        voice: "alloy"
      },
      elevenlabs: {
        apiKey: "elevenlabs_api_key",
        baseUrl: "https://api.elevenlabs.io",
        voiceId: "voice_id",
        modelId: "eleven_multilingual_v2",
        seed: 42,
        applyTextNormalization: "auto",
        languageCode: "en",
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
          speed: 1.0
        }
      }
    }
  }
}
```

### Edge TTS 主（无 API key）

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "edge",
      edge: {
        enabled: true,
        voice: "en-US-MichelleNeural",
        lang: "en-US",
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        rate: "+10%",
        pitch: "-5%"
      }
    }
  }
}
```

### 禁用 Edge TTS

```json5
{
  messages: {
    tts: {
      edge: {
        enabled: false
      }
    }
  }
}
```

### 自定义限制 + prefs 路径

```json5
{
  messages: {
    tts: {
      auto: "always",
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.clawdbot/settings/tts.json"
    }
  }
}
```

### 仅在收到语音时回复音频

```json5
{
  messages: {
    tts: {
      auto: "inbound"
    }
  }
}
```

### 禁用长回复自动摘要

```json5
{
  messages: {
    tts: {
      auto: "always"
    }
  }
}
```

然后运行：

```
/tts summary off
```

### 字段说明

- `auto`：自动 TTS 模式（`off`、`always`、`inbound`、`tagged`）。
  - `inbound` 仅在收到语音消息后回复音频。
  - `tagged` 仅当回复包含 `[[tts]]` 标签时回复音频。
- `enabled`：旧开关（doctor 会迁移为 `auto`）。
- `mode`：`"final"`（默认）或 `"all"`（包含工具/块回复）。
- `provider`：`"elevenlabs"`、`"openai"` 或 `"edge"`（自动回退）。
- 若 `provider` **未设置**，Moltbot 优先 `openai`（有 key），其次 `elevenlabs`（有 key），否则 `edge`。
- `summaryModel`：可选的低成本模型用于自动摘要；默认 `agents.defaults.model.primary`。
  - 可用 `provider/model` 或已配置的 model alias。
- `modelOverrides`：允许模型输出 TTS 指令（默认开启）。
- `maxTextLength`：TTS 输入硬限制（字符数）。超过则 `/tts audio` 失败。
- `timeoutMs`：请求超时（毫秒）。
- `prefsPath`：覆盖本地偏好 JSON 路径（provider/limit/summary）。
- `apiKey` 值会回退到环境变量（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`OPENAI_API_KEY`）。
- `elevenlabs.baseUrl`：覆盖 ElevenLabs API 基础 URL。
- `elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`：`0.5..2.0`（1.0 = 正常）
- `elevenlabs.applyTextNormalization`：`auto|on|off`
- `elevenlabs.languageCode`：ISO 639-1 两字母（如 `en`、`de`）
- `elevenlabs.seed`：整数 `0..4294967295`（尽力而为的确定性）
- `edge.enabled`：允许使用 Edge TTS（默认 `true`；无需 API key）。
- `edge.voice`：Edge 神经语音名（如 `en-US-MichelleNeural`）。
- `edge.lang`：语言码（如 `en-US`）。
- `edge.outputFormat`：Edge 输出格式（如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 具体可用值见 Microsoft Speech 输出格式；并非所有格式都被 Edge 支持。
- `edge.rate` / `edge.pitch` / `edge.volume`：百分比字符串（如 `+10%`、`-5%`）。
- `edge.saveSubtitles`：在音频旁写出 JSON 字幕。
- `edge.proxy`：Edge TTS 请求代理 URL。
- `edge.timeoutMs`：请求超时覆盖（毫秒）。

## 模型驱动覆盖（默认开启）

默认情况下，模型 **可以** 为单条回复输出 TTS 指令。
当 `messages.tts.auto` 为 `tagged` 时，必须有这些指令才触发音频。

启用后，模型可输出 `[[tts:...]]` 指令以覆盖单条回复的语音参数，
并可选 `[[tts:text]]...[[/tts:text]]` 块来提供表达性标签（如笑声、唱腔提示），仅出现在音频中。

回复示例：

```
Here you go.

[[tts:provider=elevenlabs voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用指令键（启用时）：
- `provider`（`openai` | `elevenlabs` | `edge`）
- `voice`（OpenAI voice）或 `voiceId`（ElevenLabs）
- `model`（OpenAI TTS 模型或 ElevenLabs 模型 id）
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `applyTextNormalization`（`auto|on|off`）
- `languageCode`（ISO 639-1）
- `seed`

禁用所有模型覆盖：

```json5
{
  messages: {
    tts: {
      modelOverrides: {
        enabled: false
      }
    }
  }
}
```

可选 allowlist（保留标签但禁用部分覆盖）：

```json5
{
  messages: {
    tts: {
      modelOverrides: {
        enabled: true,
        allowProvider: false,
        allowSeed: false
      }
    }
  }
}
```

## 按用户偏好

Slash 命令会将本地覆盖写入 `prefsPath`（默认：
`~/.clawdbot/settings/tts.json`，可用 `CLAWDBOT_TTS_PREFS` 或
`messages.tts.prefsPath` 覆盖）。

保存字段：
- `enabled`
- `provider`
- `maxLength`（摘要阈值；默认 1500 字符）
- `summarize`（默认 `true`）

这些会覆盖该主机上的 `messages.tts.*`。

## 输出格式（固定）

- **Telegram**：Opus 语音消息（ElevenLabs `opus_48000_64`，OpenAI `opus`）。
  - 48kHz / 64kbps 是语音消息的良好折中，且是圆形气泡所需格式。
- **其他渠道**：MP3（ElevenLabs `mp3_44100_128`，OpenAI `mp3`）。
  - 44.1kHz / 128kbps 是清晰语音的默认平衡。
- **Edge TTS**：使用 `edge.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - `node-edge-tts` 接受 `outputFormat`，但 Edge 服务并非所有格式都可用。 citeturn2search0
  - 输出格式值遵循 Microsoft Speech 输出格式（包含 Ogg/WebM Opus）。 citeturn1search0
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；若需要稳定的 Opus 语音消息，请使用 OpenAI/ElevenLabs。 citeturn1search1
  - 若配置的 Edge 输出格式失败，Moltbot 会重试 MP3。

OpenAI/ElevenLabs 格式固定；Telegram 期望 Opus 以获得语音消息体验。

## 自动 TTS 行为

启用后，Moltbot 会：
- 若回复已包含媒体或 `MEDIA:` 指令则跳过 TTS。
- 跳过过短回复（< 10 字符）。
- 启用时对长回复做摘要（使用 `agents.defaults.model.primary` 或 `summaryModel`）。
- 将生成的音频附加到回复中。

若回复超过 `maxLength` 且摘要关闭（或摘要模型无 API key），
将跳过音频并发送普通文本回复。

## 流程图

```
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / MEDIA: / short?
          yes -> send text
          no  -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled?
                            no  -> send text
                            yes -> summarize (summaryModel or agents.defaults.model.primary)
                                      -> TTS -> attach audio
```

## Slash 命令用法

命令为单一 `/tts`。
启用细节见 [Slash commands](/tools/slash-commands)。

Discord 注意：`/tts` 是 Discord 内置命令，因此 Moltbot 在该平台注册
`/voice` 作为原生命令。文本 `/tts ...` 仍可用。

```
/tts off
/tts always
/tts inbound
/tts tagged
/tts status
/tts provider openai
/tts limit 2000
/tts summary off
/tts audio Hello from Moltbot
```

说明：
- 命令需授权发送者（allowlist/owner 规则仍生效）。
- 需启用 `commands.text` 或原生命令注册。
- `off|always|inbound|tagged` 为会话级开关（`/tts on` 是 `/tts always` 的别名）。
- `limit` 与 `summary` 存在本地偏好中，而非主配置。
- `/tts audio` 生成一次性音频回复（不会开启 TTS）。

## Agent 工具

`tts` 工具将文本转语音并返回 `MEDIA:` 路径。当结果兼容 Telegram 时，
工具会加入 `[[audio_as_voice]]`，以便 Telegram 发送语音气泡。

## Gateway RPC

Gateway 方法：
- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
