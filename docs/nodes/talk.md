---
summary: "Talk 模式：使用 ElevenLabs TTS 的持续语音对话"
read_when:
  - 实现 macOS/iOS/Android 的 Talk 模式
  - 修改语音/TTS/打断行为
---
# Talk 模式

Talk 模式是一种持续的语音对话循环：
1) 监听语音
2) 将转写发送给模型（主会话，chat.send）
3) 等待回复
4) 通过 ElevenLabs 播放语音（流式）

## 行为（macOS）
- Talk 模式开启时显示**常驻叠层**。
- **Listening → Thinking → Speaking** 阶段切换。
- 在**短暂停顿**（静默窗口）后发送当前转写。
- 回复**写入 WebChat**（与打字一致）。
- **说话时可打断**（默认开启）：当用户在助手说话时开始讲话，会停止播放并记录打断时间戳供下一次提示使用。

## 回复中的语音指令

助手可在回复开头加一行**单行 JSON** 控制语音：

```json
{"voice":"<voice-id>","once":true}
```

规则：
- 仅第一行非空内容生效。
- 未知键会被忽略。
- `once: true` 只对当前回复生效。
- 不带 `once` 时，该 voice 成为 Talk 模式的新默认。
- 该 JSON 行会在 TTS 播放前被移除。

支持键：
- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`、`rate`（WPM）、`stability`、`similarity`、`style`、`speakerBoost`
- `seed`、`normalize`、`lang`、`output_format`、`latency_tier`
- `once`

## 配置（`~/.clawdbot/moltbot.json`）
```json5
{
  "talk": {
    "voiceId": "elevenlabs_voice_id",
    "modelId": "eleven_v3",
    "outputFormat": "mp3_44100_128",
    "apiKey": "elevenlabs_api_key",
    "interruptOnSpeech": true
  }
}
```

默认值：
- `interruptOnSpeech`：true
- `voiceId`：回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或在 API key 可用时使用第一个 ElevenLabs voice）
- `modelId`：未设置时默认 `eleven_v3`
- `apiKey`：回退到 `ELEVENLABS_API_KEY`（或可用的 gateway shell profile）
- `outputFormat`：macOS/iOS 默认 `pcm_44100`，Android 默认 `pcm_24000`（设置 `mp3_*` 可强制 MP3 流式）

## macOS UI
- 菜单栏开关：**Talk**
- 配置页：**Talk Mode** 分组（voice id + 打断开关）
- 叠层：
  - **Listening**：云朵随麦克风电平脉动
  - **Thinking**：下沉动画
  - **Speaking**：放射环
  - 点击云朵：停止说话
  - 点击 X：退出 Talk 模式

## 说明
- 需要语音与麦克风权限。
- 使用 `chat.send` 作用于 `main` 会话键。
- TTS 使用 ElevenLabs 流式 API（`ELEVENLABS_API_KEY`）并在 macOS/iOS/Android 上进行增量播放以降低延迟。
- `eleven_v3` 的 `stability` 仅接受 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- `latency_tier` 在设置时校验 `0..4`。
- Android 支持 `pcm_16000`、`pcm_22050`、`pcm_24000`、`pcm_44100` 输出格式以实现低延迟 AudioTrack 流式。
