---
summary: "唤醒词与按住说话重叠时的语音浮层生命周期"
read_when:
  - 调整语音浮层行为
---
# Voice Overlay 生命周期（macOS）

受众：macOS 应用贡献者。目标：在唤醒词与按住说话重叠时保持语音浮层可预测。

### 当前意图
- 当浮层因唤醒词已显示时，用户按下热键，热键会话会*继承*现有文本而不是重置。浮层在按住期间保持显示。松开时：如果有去空格文本则发送，否则关闭。
- 唤醒词仍按静默自动发送；按住说话在松开时立即发送。

### 已实现（2025-12-09）
- 浮层会话为每次采集（唤醒词或按住说话）携带一个 token。当 token 不匹配时，partial/final/send/dismiss/level 更新会被丢弃，避免陈旧回调。
- 按住说话会把可见浮层文本作为前缀（按下热键时若唤醒浮层已在，保留文本并追加新语音）。它最多等待 1.5 秒获取最终转写，超时则回退为当前文本。
- 在 `voicewake.overlay`、`voicewake.ptt`、`voicewake.chime` 分类下以 `info` 级别记录音效与浮层日志（会话开始、partial、final、send、dismiss、chime 原因）。

### 下一步
1. **VoiceSessionCoordinator（actor）**
   - 同一时间只拥有一个 `VoiceSession`。
   - API（基于 token）：`beginWakeCapture`、`beginPushToTalk`、`updatePartial`、`endCapture`、`cancel`、`applyCooldown`。
   - 丢弃携带过期 token 的回调（防止旧识别器重新打开浮层）。
2. **VoiceSession（模型）**
   - 字段：`token`、`source`（wakeWord|pushToTalk）、已提交或临时文本、chime 标记、计时器（自动发送、空闲）、`overlayMode`（display|editing|sending）、冷却截止时间。
3. **Overlay 绑定**
   - `VoiceSessionPublisher`（`ObservableObject`）将活跃会话镜像到 SwiftUI。
   - `VoiceWakeOverlayView` 仅通过 publisher 渲染；不会直接修改全局单例。
   - 浮层用户动作（`sendNow`、`dismiss`、`edit`）回调到 coordinator 并携带会话 token。
4. **统一发送路径**
   - `endCapture`：若去空格文本为空 -> dismiss，否则 `performSend(session:)`（播放一次发送提示音、转发、关闭）。
   - 按住说话：无延迟；唤醒词：可选延迟自动发送。
   - 按住说话结束后对唤醒运行时施加短暂冷却，避免立即再次触发。
5. **日志**
   - Coordinator 在子系统 `bot.molt` 的 `voicewake.overlay` 与 `voicewake.chime` 分类下输出 `.info`。
   - 关键事件：`session_started`、`adopted_by_push_to_talk`、`partial`、`finalized`、`send`、`dismiss`、`cancel`、`cooldown`。

### 调试清单
- 复现粘住的浮层时流式查看日志：

  ```bash
  sudo log stream --predicate 'subsystem == "bot.molt" AND category CONTAINS "voicewake"' --level info --style compact
  ```
- 确认只有一个活跃会话 token；过期回调应由 coordinator 丢弃。
- 确保按住说话释放时总调用 `endCapture` 且携带活跃 token；如果文本为空，应直接 `dismiss` 且无提示音或发送。

### 迁移步骤（建议）
1. 添加 `VoiceSessionCoordinator`、`VoiceSession` 与 `VoiceSessionPublisher`。
2. 重构 `VoiceWakeRuntime`，通过创建或更新会话而非直接操作 `VoiceWakeOverlayController`。
3. 重构 `VoicePushToTalk`，继承现有会话并在释放时调用 `endCapture`，同时设置运行时冷却。
4. 将 `VoiceWakeOverlayController` 绑定到 publisher；移除来自 runtime/PTT 的直接调用。
5. 添加会话继承、冷却与空文本关闭的集成测试。
