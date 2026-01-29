---
summary: "监控模型提供方的 OAuth 过期"
read_when:
  - 设置认证过期监控或告警
  - 自动化检查 Claude Code / Codex OAuth 刷新
---
# 认证监控

Moltbot 通过 `moltbot models status` 暴露 OAuth 过期健康状态。用于自动化与告警；脚本仅作为手机流程的可选补充。

## 首选：CLI 检查（可移植）

```bash
moltbot models status --check
```

退出码：
- `0`：OK
- `1`：凭据过期或缺失
- `2`：即将过期（24 小时内）

该命令可用于 cron/systemd，无需额外脚本。

## 可选脚本（运维 / 手机流程）

脚本位于 `scripts/`，**可选**。假设你能 SSH 到 gateway 主机，且针对 systemd + Termux 调优。

- `scripts/claude-auth-status.sh` 现在以 `moltbot models status --json` 为权威来源（若 CLI 不可用则回退到直接读取文件），因此定时器需保证 `moltbot` 在 `PATH` 中。
- `scripts/auth-monitor.sh`：cron/systemd 定时器目标；发送告警（ntfy 或手机）。
- `scripts/systemd/moltbot-auth-monitor.{service,timer}`：systemd 用户定时器。
- `scripts/claude-auth-status.sh`：Claude Code + Moltbot 认证检查（full/json/simple）。
- `scripts/mobile-reauth.sh`：通过 SSH 引导重新认证流程。
- `scripts/termux-quick-auth.sh`：一键小组件状态 + 打开认证 URL。
- `scripts/termux-auth-widget.sh`：完整引导小组件流程。
- `scripts/termux-sync-widget.sh`：同步 Claude Code 凭据 → Moltbot。

若不需要手机自动化或 systemd 定时器，可跳过这些脚本。
