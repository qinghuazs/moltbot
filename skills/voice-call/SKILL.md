---
name: voice-call
description: 通过 Moltbot voice-call 插件发起语音通话。
metadata: {"moltbot":{"emoji":"📞","skillKey":"voice-call","requires":{"config":["plugins.entries.voice-call.enabled"]}}}
---

# 语音通话

使用 voice-call 插件发起或检查通话（Twilio、Telnyx、Plivo 或 mock）。

## CLI

```bash
moltbot voicecall call --to "+15555550123" --message "Hello from Moltbot"
moltbot voicecall status --call-id <id>
```

## 工具

使用 `voice_call` 进行代理发起的通话。

操作：
- `initiate_call`（message、to?、mode?）
- `continue_call`（callId、message）
- `speak_to_user`（callId、message）
- `end_call`（callId）
- `get_status`（callId）

注意：
- 需要启用 voice-call 插件。
- 插件配置位于 `plugins.entries.voice-call.config`。
- Twilio 配置：`provider: "twilio"` + `twilio.accountSid/authToken` + `fromNumber`。
- Telnyx 配置：`provider: "telnyx"` + `telnyx.apiKey/connectionId` + `fromNumber`。
- Plivo 配置：`provider: "plivo"` + `plivo.authId/authToken` + `fromNumber`。
- 开发回退：`provider: "mock"`（无网络）。
