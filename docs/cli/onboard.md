---
summary: "`moltbot onboard` 的 CLI 参考（交互式引导向导）"
read_when:
  - 需要引导式配置 gateway、工作区、认证、渠道与技能
---

# `moltbot onboard`

交互式引导向导（本地或远程 Gateway 设置）。

相关：
- 向导指南：[Onboarding](/start/onboarding)

## 示例

```bash
moltbot onboard
moltbot onboard --flow quickstart
moltbot onboard --flow manual
moltbot onboard --mode remote --remote-url ws://gateway-host:18789
```

流程说明：
- `quickstart`：最少提示，自动生成 gateway 令牌。
- `manual`：端口、绑定、认证的完整提示（`advanced` 的别名）。
- 最快第一条聊天：`moltbot dashboard`（控制台 UI，无需设置渠道）。
