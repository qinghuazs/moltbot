---
summary: "通道连通性的健康检查步骤"
read_when:
  - 诊断 WhatsApp 通道健康状况
---
# 健康检查（CLI）

一份无需猜测即可验证通道连通性的简明指南。

## 快速检查
- `moltbot status` — 本地摘要：网关可达性/模式、更新提示、已绑定通道认证年龄、会话与近期活动。
- `moltbot status --all` — 完整的本地诊断（只读、带颜色、安全可直接贴给排障）。
- `moltbot status --deep` — 还会探测正在运行的 Gateway（支持时执行按通道探测）。
- `moltbot health --json` — 向运行中的 Gateway 请求完整健康快照（仅 WS；不直接连 Baileys socket）。
- 在 WhatsApp/WebChat 中单独发送 `/status` 可获得状态回复且不触发 agent。
- 日志：`tail /tmp/moltbot/moltbot-*.log` 并筛选 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度诊断
- 磁盘凭据：`ls -l ~/.clawdbot/credentials/whatsapp/<accountId>/creds.json`（mtime 应较新）。
- 会话存储：`ls -l ~/.clawdbot/agents/<agentId>/sessions/sessions.json`（路径可在配置中覆盖）。`status` 会展示数量与近期收件人。
- 重新关联：当日志出现状态码 409–515 或 `loggedOut` 时，执行 `moltbot channels logout && moltbot channels login --verbose`。（注意：QR 登录流程在配对后对 515 会自动重启一次。）

## 失败时处理
- `logged out` 或状态 409–515 → 先 `moltbot channels logout`，再 `moltbot channels login` 重新关联。
- Gateway 不可达 → 启动它：`moltbot gateway --port 18789`（端口占用时可加 `--force`）。
- 无入站消息 → 确认已绑定手机在线且发送者被允许（`channels.whatsapp.allowFrom`）；群聊需确保允许列表与提及规则匹配（`channels.whatsapp.groups`、`agents.list[].groupChat.mentionPatterns`）。

## 专用 health 命令

`moltbot health --json` 向运行中的 Gateway 请求健康快照（CLI 不直接连接通道 socket）。它会在可用时报告已绑定凭据/认证年龄、按通道探测摘要、会话存储摘要及探测耗时。若 Gateway 不可达或探测失败/超时，会以非零码退出。可用 `--timeout <ms>` 覆盖默认 10 秒。
