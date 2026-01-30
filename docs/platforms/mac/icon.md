---
summary: "macOS 上 Moltbot 菜单栏图标的状态与动画"
read_when:
  - 修改菜单栏图标行为
---
# 菜单栏图标状态

作者：steipete · 更新：2025-12-06 · 范围：macOS 应用（`apps/macos`）

- **Idle：** 正常图标动画（眨眼、偶尔摇摆）。
- **Paused：** 状态项使用 `appearsDisabled`；不播放动画。
- **语音触发（大耳朵）：** 语音唤醒检测在听到唤醒词时调用 `AppState.triggerVoiceEars(ttl: nil)`，在捕获语音期间保持 `earBoostActive=true`。耳朵放大（1.9x），为可读性增加圆形耳洞，然后在 1 秒静默后通过 `stopVoiceEars()` 恢复。仅由应用内语音管线触发。
- **工作中（agent 运行）：** `AppState.isWorking=true` 驱动“尾巴/腿部疾跑”微动画：腿部摆动更快并略微偏移，表示任务进行中。当前仅在 WebChat agent 运行时切换；在接入其他长任务时也应设置。

连接点
- 语音唤醒：runtime/tester 在触发时调用 `AppState.triggerVoiceEars(ttl: nil)`，在 1 秒静默后调用 `stopVoiceEars()`，与捕获窗口一致。
- Agent 活动：在工作区间调用 `AppStateStore.shared.setWorking(true/false)`（WebChat agent 调用已设置）。保持区间短，并在 `defer` 块中恢复以避免动画卡住。

形状与尺寸
- 基础图标由 `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)` 绘制。
- 耳朵缩放默认 `1.0`；语音增强时设 `earScale=1.9` 并切换 `earHoles=true`，整体帧不变（18×18 pt 模板图渲染到 36×36 px Retina backing store）。
- 疾跑使用腿部摆动最高约 1.0 并叠加小幅水平抖动；该动画会叠加在 Idle 摆动之上。

行为说明
- 不提供外部 CLI 或 broker 开关控制耳朵/工作状态；保持只由应用内部信号驱动，避免误触发。
- TTL 保持短（&lt;10s），避免任务挂住时图标长时间停留在非基线状态。
