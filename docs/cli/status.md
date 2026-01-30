---
summary: "`moltbot status` 的 CLI 参考（诊断、探测、用量快照）"
read_when:
  - 想快速诊断渠道健康与最近会话接收者
  - 想要可粘贴的“全量”状态用于排查
---

# `moltbot status`

渠道与会话诊断。

```bash
moltbot status
moltbot status --all
moltbot status --deep
moltbot status --usage
```

说明：
- `--deep` 会执行实时探测（WhatsApp Web、Telegram、Discord、Google Chat、Slack、Signal）。
- 当配置多个代理时，输出包含每个代理的会话存储。
- 概览在可用时包含 Gateway 与节点主机服务的安装和运行状态。
- 概览包含更新渠道与 git SHA（仅源码检出）。
- 更新信息显示在概览中；如有更新可用，状态会提示运行 `moltbot update`（见 [Updating](/install/updating)）。
