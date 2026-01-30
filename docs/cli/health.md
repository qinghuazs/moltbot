---
summary: "`moltbot health` 的 CLI 参考（通过 RPC 获取 gateway 健康）"
read_when:
  - 想快速检查运行中的 Gateway 健康情况
---

# `moltbot health`

从运行中的 Gateway 获取健康信息。

```bash
moltbot health
moltbot health --json
moltbot health --verbose
```

说明：
- `--verbose` 会执行实时探测，并在配置多个账号时打印每个账号的耗时。
- 当配置多个代理时，输出包含每个代理的会话存储。
