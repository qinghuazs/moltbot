---
summary: "语音通话插件：通过 Twilio/Telnyx/Plivo 进行呼出与呼入（安装 配置 CLI）"
read_when:
  - 你想用 Moltbot 发起语音外呼
  - 你在配置或开发 voice-call 插件
---

# 语音通话（插件）

通过插件为 Moltbot 提供语音通话。支持外呼通知与带入站策略的多轮对话。

当前提供方：
- `twilio`（Programmable Voice + Media Streams）
- `telnyx`（Call Control v2）
- `plivo`（Voice API + XML 转发 + GetInput 语音）
- `mock`（开发/无网络）

快速心智模型：
- 安装插件
- 重启 Gateway
- 在 `plugins.entries.voice-call.config` 配置
- 使用 `moltbot voicecall ...` 或 `voice_call` 工具

## 运行位置（本地与远程）

语音通话插件运行在 **Gateway 进程内**。

如果使用远程 Gateway，请在**运行 Gateway 的机器**上安装与配置插件，然后重启 Gateway 以加载它。

## 安装

### 方式 A：从 npm 安装（推荐）

```bash
moltbot plugins install @moltbot/voice-call
```

随后重启 Gateway。

### 方式 B：从本地目录安装（开发 无复制）

```bash
moltbot plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
```

随后重启 Gateway。

## 配置

在 `plugins.entries.voice-call.config` 下设置：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // or "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234",
          toNumber: "+15550005678",

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "..."
          },

          plivo: {
            authId: "MAxxxxxxxxxxxxxxxxxxxx",
            authToken: "..."
          },

          // Webhook server
          serve: {
            port: 3334,
            path: "/voice/webhook"
          },

          // Public exposure (pick one)
          // publicUrl: "https://example.ngrok.app/voice/webhook",
          // tunnel: { provider: "ngrok" },
          // tailscale: { mode: "funnel", path: "/voice/webhook" }

          outbound: {
            defaultMode: "notify" // notify | conversation
          },

          streaming: {
            enabled: true,
            streamPath: "/voice/stream"
          }
        }
      }
    }
  }
}
```

说明：
- Twilio/Telnyx 需要**公网可达**的 webhook URL。
- Plivo 需要**公网可达**的 webhook URL。
- `mock` 为本地开发提供方（无网络调用）。
- `skipSignatureVerification` 仅用于本地测试。
- 若使用 ngrok 免费版，将 `publicUrl` 设置为精确的 ngrok URL；签名校验始终启用。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 仅在 `tunnel.provider="ngrok"` 且 `serve.bind` 为 loopback（ngrok 本地代理）时允许**无效签名**的 Twilio webhook。仅用于本地开发。
- ngrok 免费版 URL 可能变动或出现中间页；若 `publicUrl` 漂移，Twilio 签名会失败。生产环境请使用稳定域名或 Tailscale funnel。

## 通话 TTS

语音通话使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）进行通话流式语音。你可以在插件配置下使用**相同结构**覆盖，并与 `messages.tts` 深度合并。

```json5
{
  tts: {
    provider: "elevenlabs",
    elevenlabs: {
      voiceId: "pMsXgVXv3BLzUgSXRplE",
      modelId: "eleven_multilingual_v2"
    }
  }
}
```

说明：
- **语音通话忽略 Edge TTS**（电话音频需要 PCM；Edge 输出不稳定）。
- 当启用 Twilio 媒体流时使用核心 TTS；否则通话回退到提供方原生语音。

### 更多示例

仅使用核心 TTS（不覆盖）：

```json5
{
  messages: {
    tts: {
      provider: "openai",
      openai: { voice: "alloy" }
    }
  }
}
```

仅对通话覆盖为 ElevenLabs（其他场景保持核心默认）：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            provider: "elevenlabs",
            elevenlabs: {
              apiKey: "elevenlabs_key",
              voiceId: "pMsXgVXv3BLzUgSXRplE",
              modelId: "eleven_multilingual_v2"
            }
          }
        }
      }
    }
  }
}
```

仅对通话覆盖 OpenAI 模型（深度合并示例）：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            openai: {
              model: "gpt-4o-mini-tts",
              voice: "marin"
            }
          }
        }
      }
    }
  }
}
```

## 入站电话

入站策略默认 `disabled`。要启用入站电话，设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?"
}
```

自动回复使用 agent 系统。可通过以下项调优：
- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

## CLI

```bash
moltbot voicecall call --to "+15555550123" --message "Hello from Moltbot"
moltbot voicecall continue --call-id <id> --message "Any questions?"
moltbot voicecall speak --call-id <id> --message "One moment"
moltbot voicecall end --call-id <id>
moltbot voicecall status --call-id <id>
moltbot voicecall tail
moltbot voicecall expose --mode funnel
```

## Agent 工具

工具名：`voice_call`

动作：
- `initiate_call`（message, to?, mode?）
- `continue_call`（callId, message）
- `speak_to_user`（callId, message）
- `end_call`（callId）
- `get_status`（callId）

仓库内提供匹配的技能文档：`skills/voice-call/SKILL.md`。

## Gateway RPC

- `voicecall.initiate`（`to?`、`message`、`mode?`）
- `voicecall.continue`（`callId`、`message`）
- `voicecall.speak`（`callId`、`message`）
- `voicecall.end`（`callId`）
- `voicecall.status`（`callId`）
