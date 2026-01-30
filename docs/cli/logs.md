---
summary: "`moltbot logs` 的 CLI 参考（通过 RPC 跟随 gateway 日志）"
read_when:
  - 需要远程跟随 Gateway 日志（无需 SSH）
  - 想获取用于工具的 JSON 日志行
---

# `moltbot logs`

通过 RPC 跟随 Gateway 文件日志（支持远程模式）。

相关：
- 日志概览：[Logging](/logging)

## 示例

```bash
moltbot logs
moltbot logs --follow
moltbot logs --json
moltbot logs --limit 500
```
