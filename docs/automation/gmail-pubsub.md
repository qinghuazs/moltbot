---
summary: "通过 gogcli 将 Gmail Pub/Sub 推送接入 Moltbot webhook"
read_when:
  - 将 Gmail 收件箱触发接入 Moltbot
  - 设置 Pub/Sub push 用于唤醒 agent
---

# Gmail Pub/Sub -> Moltbot

目标：Gmail watch → Pub/Sub push → `gog gmail watch serve` → Moltbot webhook。

## 前置条件

- 安装并登录 `gcloud`（[安装指南](https://docs.cloud.google.com/sdk/docs/install-sdk)）。
- 安装并授权 `gog`（gogcli）用于 Gmail 账号（[gogcli.sh](https://gogcli.sh/)）。
- 启用 Moltbot hooks（见 [Webhooks](/automation/webhook)）。
- 登录 `tailscale`（[tailscale.com](https://tailscale.com/)）。推荐使用 Tailscale Funnel 作为公网 HTTPS 入口。
  其他隧道服务也可用，但需手动配置（不提供支持）。目前仅支持 Tailscale。

示例 hooks 配置（启用 Gmail 预设映射）：

```json5
{
  hooks: {
    enabled: true,
    token: "CLAWDBOT_HOOK_TOKEN",
    path: "/hooks",
    presets: ["gmail"]
  }
}
```

若要将 Gmail 摘要投递到聊天渠道，请用 mapping 覆盖 preset，设置 `deliver` + 可选 `channel`/`to`：

```json5
{
  hooks: {
    enabled: true,
    token: "CLAWDBOT_HOOK_TOKEN",
    presets: ["gmail"],
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate:
          "New email from {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}\n{{messages[0].body}}",
        model: "openai/gpt-5.2-mini",
        deliver: true,
        channel: "last"
        // to: "+15551234567"
      }
    ]
  }
}
```

若要固定渠道，设置 `channel` + `to`。否则 `channel: "last"` 使用最后一次投递路由（回退到 WhatsApp）。

如需为 Gmail 运行强制使用更便宜的模型，在 mapping 中设置 `model`
（`provider/model` 或别名）。若启用 `agents.defaults.models` 限制，需将该模型加入 allowlist。

如需为 Gmail hook 设置默认模型与思考级别，在配置中添加
`hooks.gmail.model` / `hooks.gmail.thinking`：

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off"
    }
  }
}
```

说明：
- mapping 中的 `model`/`thinking` 仍会覆盖这些默认值。
- 回退顺序：`hooks.gmail.model` → `agents.defaults.model.fallbacks` → primary（auth/限流/超时）。
- 若设置 `agents.defaults.models`，Gmail 模型必须在 allowlist 中。
- Gmail hook 内容默认包裹外部内容安全边界。
  若需禁用（危险），设置 `hooks.gmail.allowUnsafeExternalContent: true`。

如需进一步自定义 payload 处理，可添加 `hooks.mappings` 或在 `hooks.transformsDir`
中放置 JS/TS transform 模块（见 [Webhooks](/automation/webhook)）。

## 向导（推荐）

使用 Moltbot 助手一键打通（macOS 会通过 brew 安装依赖）：

```bash
moltbot webhooks gmail setup \
  --account moltbot@gmail.com
```

默认行为：
- 使用 Tailscale Funnel 作为公网 push 入口。
- 写入 `hooks.gmail` 配置供 `moltbot webhooks gmail run` 使用。
- 启用 Gmail hook 预设（`hooks.presets: ["gmail"]`）。

路径说明：当启用 `tailscale.mode` 时，Moltbot 自动设置
`hooks.gmail.serve.path` 为 `/`，并将公网路径保持为
`hooks.gmail.tailscale.path`（默认 `/gmail-pubsub`），因为 Tailscale
在转发前会剥离 set-path 前缀。
若需要后端收到带前缀路径，请设置
`hooks.gmail.tailscale.target`（或 `--tailscale-target`）为完整 URL，例如
`http://127.0.0.1:8788/gmail-pubsub`，并匹配 `hooks.gmail.serve.path`。

需要自定义端点？用 `--push-endpoint <url>` 或 `--tailscale off`。

平台说明：macOS 上向导会通过 Homebrew 安装 `gcloud`、`gogcli` 与 `tailscale`；
Linux 上需先手动安装。

Gateway 自动启动（推荐）：
- 当 `hooks.enabled=true` 且设置了 `hooks.gmail.account`，Gateway 会在启动时运行
  `gog gmail watch serve` 并自动续期。
- 设置 `CLAWDBOT_SKIP_GMAIL_WATCHER=1` 可选择退出（当你自行运行守护进程时有用）。
- 不要同时运行手动守护进程，否则会出现
  `listen tcp 127.0.0.1:8788: bind: address already in use`。

手动守护进程（启动 `gog gmail watch serve` + 自动续期）：

```bash
moltbot webhooks gmail run
```

## 一次性设置

1) 选择**拥有 OAuth 客户端**的 GCP 项目：

```bash
gcloud auth login
gcloud config set project <project-id>
```

注意：Gmail watch 要求 Pub/Sub 主题与 OAuth 客户端在同一项目中。

2) 启用 API：

```bash
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

3) 创建 topic：

```bash
gcloud pubsub topics create gog-gmail-watch
```

4) 允许 Gmail push 发布：

```bash
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

## 启动 watch

```bash
gog gmail watch start \
  --account moltbot@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

记录输出中的 `history_id`（用于排障）。

## 运行 push 处理器

本地示例（共享 token 认证）：

```bash
gog gmail watch serve \
  --account moltbot@gmail.com \
  --bind 127.0.0.1 \
  --port 8788 \
  --path /gmail-pubsub \
  --token <shared> \
  --hook-url http://127.0.0.1:18789/hooks/gmail \
  --hook-token CLAWDBOT_HOOK_TOKEN \
  --include-body \
  --max-bytes 20000
```

说明：
- `--token` 保护 push 端点（`x-gog-token` 或 `?token=`）。
- `--hook-url` 指向 Moltbot `/hooks/gmail`（映射；隔离运行 + 主会话摘要）。
- `--include-body` 与 `--max-bytes` 控制发送给 Moltbot 的正文片段。

推荐使用 `moltbot webhooks gmail run`，它封装同样流程并自动续期。

## 暴露处理器（高级，不支持）

若需要非 Tailscale 隧道，请手动配置并在 push 订阅中使用公网 URL
（不提供支持，无防护）：

```bash
cloudflared tunnel --url http://127.0.0.1:8788 --no-autoupdate
```

使用生成的 URL 作为 push endpoint：

```bash
gcloud pubsub subscriptions create gog-gmail-watch-push \
  --topic gog-gmail-watch \
  --push-endpoint "https://<public-url>/gmail-pubsub?token=<shared>"
```

生产环境：使用稳定 HTTPS 端点并配置 Pub/Sub OIDC JWT，然后运行：

```bash
gog gmail watch serve --verify-oidc --oidc-email <svc@...>
```

## 测试

向被监控的收件箱发送一封邮件：

```bash
gog gmail send \
  --account moltbot@gmail.com \
  --to moltbot@gmail.com \
  --subject "watch test" \
  --body "ping"
```

检查 watch 状态与历史：

```bash
gog gmail watch status --account moltbot@gmail.com
gog gmail history --account moltbot@gmail.com --since <historyId>
```

## 故障排查

- `Invalid topicName`：项目不匹配（topic 不在 OAuth 客户端项目内）。
- `User not authorized`：topic 缺少 `roles/pubsub.publisher`。
- 空消息：Gmail push 仅提供 `historyId`，需通过 `gog gmail history` 拉取。

## 清理

```bash
gog gmail watch stop --account moltbot@gmail.com
gcloud pubsub subscriptions delete gog-gmail-watch-push
gcloud pubsub topics delete gog-gmail-watch
```
