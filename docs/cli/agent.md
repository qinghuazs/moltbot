---
summary: "`moltbot agent` 的 CLI 参考（通过 Gateway 发送一次代理轮次）"
read_when:
  - 想从脚本运行一次代理轮次（可选投递回复）
---

# `moltbot agent`

通过 Gateway 运行一次代理轮次（`--local` 使用内嵌模式）。
使用 `--agent <id>` 可直接指定已配置的代理。

相关：
- Agent send 工具：[Agent send](/tools/agent-send)

## 示例

```bash
moltbot agent --to +15555550123 --message "status update" --deliver
moltbot agent --agent ops --message "Summarize logs"
moltbot agent --session-id 1234 --message "Summarize inbox" --thinking medium
moltbot agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```
