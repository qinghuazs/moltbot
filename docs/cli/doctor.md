---
summary: "`moltbot doctor` 的 CLI 参考（健康检查与引导修复）"
read_when:
  - 遇到连接或认证问题并希望得到引导修复
  - 更新后想做一次健康检查
---

# `moltbot doctor`

对 gateway 与渠道进行健康检查与快速修复。

相关：
- 故障排查：[Troubleshooting](/gateway/troubleshooting)
- 安全审计：[Security](/gateway/security)

## 示例

```bash
moltbot doctor
moltbot doctor --repair
moltbot doctor --deep
```

说明：
- 交互式提示（如钥匙串或 OAuth 修复）仅在 stdin 为 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）会跳过提示。
- `--fix`（`--repair` 的别名）会备份 `~/.clawdbot/moltbot.json.bak` 并删除未知配置键，且逐项列出删除内容。

## macOS：`launchctl` 环境覆盖

如果你曾运行 `launchctl setenv CLAWDBOT_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值会覆盖配置文件，导致持续的“未授权”错误。

```bash
launchctl getenv CLAWDBOT_GATEWAY_TOKEN
launchctl getenv CLAWDBOT_GATEWAY_PASSWORD

launchctl unsetenv CLAWDBOT_GATEWAY_TOKEN
launchctl unsetenv CLAWDBOT_GATEWAY_PASSWORD
```
