---
summary: "模型认证：OAuth、API 密钥和 setup-token"
read_when:
  - 排查模型认证或 OAuth 过期问题
  - 编写认证或凭据存储相关文档
---
# 认证

Moltbot 支持模型提供方的 OAuth 和 API 密钥。对于 Anthropic
账户，我们建议使用 **API 密钥**。如果使用 Claude 订阅访问，
请使用 `claude setup-token` 创建的长期令牌。

完整的 OAuth 流程与存储布局请见：[/concepts/oauth](/concepts/oauth)。

## 推荐的 Anthropic 配置（API 密钥）

如果你直接使用 Anthropic，请使用 API 密钥。

1) 在 Anthropic Console 中创建一个 API 密钥。
2) 将其放在 **网关主机**（运行 `moltbot gateway` 的机器）上。

```bash
export ANTHROPIC_API_KEY="..."
moltbot models status
```

3) 如果 Gateway 运行在 systemd/launchd 下，建议把密钥放在
`~/.clawdbot/.env` 中，方便守护进程读取：

```bash
cat >> ~/.clawdbot/.env <<'EOF'
ANTHROPIC_API_KEY=...
EOF
```

然后重启守护进程（或重启你的 Gateway 进程）并重新检查：

```bash
moltbot models status
moltbot doctor
```

如果你不想手动管理环境变量，也可以使用引导向导存储
可供守护进程使用的 API 密钥：`moltbot onboard`。

关于环境变量继承（`env.shellEnv`、`~/.clawdbot/.env`、systemd/launchd）的细节，
请参见 [Help](/help)。

## Anthropic：setup-token（订阅认证）

对 Anthropic 而言，推荐路径仍是 **API 密钥**。如果你使用 Claude
订阅，也支持 setup-token 流程。请在 **网关主机** 上运行：

```bash
claude setup-token
```

然后粘贴到 Moltbot：

```bash
moltbot models auth setup-token --provider anthropic
```

如果令牌是在另一台机器上创建的，请手动粘贴：

```bash
moltbot models auth paste-token --provider anthropic
```

如果你看到类似这样的 Anthropic 报错：

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

…请改用 Anthropic API 密钥。

手动录入令牌（任意提供方；写入 `auth-profiles.json` 并更新配置）：

```bash
moltbot models auth paste-token --provider anthropic
moltbot models auth paste-token --provider openrouter
```

适合自动化的检测方式（过期或缺失退出码为 `1`，即将过期为 `2`）：

```bash
moltbot models status --check
```

可选的运维脚本（systemd/Termux）文档见：
[/automation/auth-monitoring](/automation/auth-monitoring)

> `claude setup-token` 需要交互式 TTY。

## 检查模型认证状态

```bash
moltbot models status
moltbot doctor
```

## 控制使用哪条凭据

### 按会话（聊天命令）

使用 `/model <alias-or-id>@<profileId>` 将当前会话固定到某个提供方凭据
（示例 profile id：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`）打开精简选择器；使用 `/model status`
查看完整视图（候选项 + 下一条认证配置，且在配置时会显示提供方端点细节）。

### 按代理（CLI 覆盖）

为某个代理设置显式的认证配置顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

```bash
moltbot models auth order get --provider anthropic
moltbot models auth order set --provider anthropic anthropic:default
moltbot models auth order clear --provider anthropic
```

使用 `--agent <id>` 指定某个代理；省略则使用配置的默认代理。

## 故障排查

### “No credentials found”

如果缺少 Anthropic 令牌配置，请在 **网关主机** 上运行
`claude setup-token`，然后重新检查：

```bash
moltbot models status
```

### 令牌即将过期或已过期

运行 `moltbot models status` 确认即将过期的是哪条配置。如果配置缺失，
请重新运行 `claude setup-token` 并再次粘贴令牌。

## 要求

- Claude Max 或 Pro 订阅（用于 `claude setup-token`）
- 已安装 Claude Code CLI（`claude` 命令可用）
