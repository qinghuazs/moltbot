---
name: sag
description: 具有 mac 风格 say UX 的 ElevenLabs 文本转语音。
homepage: https://sag.sh
metadata: {"moltbot":{"emoji":"🗣️","requires":{"bins":["sag"],"env":["ELEVENLABS_API_KEY"]},"primaryEnv":"ELEVENLABS_API_KEY","install":[{"id":"brew","kind":"brew","formula":"steipete/tap/sag","bins":["sag"],"label":"Install sag (brew)"}]}}
---

# sag

使用 `sag` 进行 ElevenLabs TTS 和本地播放。

API 密钥（必需）
- `ELEVENLABS_API_KEY`（首选）
- CLI 也支持 `SAG_API_KEY`

快速开始
- `sag "Hello there"`
- `sag speak -v "Roger" "Hello"`
- `sag voices`
- `sag prompting`（模型特定提示）

模型说明
- 默认：`eleven_v3`（富有表现力）
- 稳定：`eleven_multilingual_v2`
- 快速：`eleven_flash_v2_5`

发音 + 投递规则
- 首先修复：重新拼写（例如 "key-note"），添加连字符，调整大小写。
- 数字/单位/URL：`--normalize auto`（如果损害名称则用 `off`）。
- 语言偏向：`--lang en|de|fr|...` 指导规范化。
- v3：不支持 SSML `<break>`；使用 `[pause]`、`[short pause]`、`[long pause]`。
- v2/v2.5：支持 SSML `<break time="1.5s" />`；`<phoneme>` 在 `sag` 中未暴露。

v3 音频标签（放在行首）
- `[whispers]`、`[shouts]`、`[sings]`
- `[laughs]`、`[starts laughing]`、`[sighs]`、`[exhales]`
- `[sarcastic]`、`[curious]`、`[excited]`、`[crying]`、`[mischievously]`
- 示例：`sag "[whispers] keep this quiet. [short pause] ok?"`

语音默认值
- `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`

长输出前确认语音 + 说话者。

## 聊天语音回复

当 Peter 要求"语音"回复（例如"疯狂科学家声音"、"用语音解释"）时，生成音频并发送：

```bash
# 生成音频文件
sag -v Clawd -o /tmp/voice-reply.mp3 "Your message here"

# 然后在回复中包含：
# MEDIA:/tmp/voice-reply.mp3
```

语音角色提示：
- 疯狂科学家：使用 `[excited]` 标签，戏剧性停顿 `[short pause]`，变化强度
- 平静：使用 `[whispers]` 或较慢节奏
- 戏剧性：谨慎使用 `[sings]` 或 `[shouts]`

Clawd 的默认语音：`lj2rcrvANS3gaWWnczSX`（或直接 `-v Clawd`）
