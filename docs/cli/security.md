---
summary: "`moltbot security` CLI 参考（审计和修复常见安全问题）"
read_when:
  - 您想对配置/状态运行快速安全审计
  - 您想应用安全的"修复"建议（chmod、收紧默认值）
---

# `moltbot security`

安全工具（审计 + 可选修复）。

相关：
- 安全指南：[安全](/gateway/security)

## 审计

```bash
moltbot security audit
moltbot security audit --deep
moltbot security audit --fix
```

当多个私聊发送者共享主会话时，审计会发出警告，并建议对共享收件箱使用 `session.dmScope="per-channel-peer"`（或对多账户频道使用 `per-account-channel-peer`）。
当使用小型模型（`<=300B`）且未启用沙盒并启用了 web/browser 工具时，它也会发出警告。
