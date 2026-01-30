---
summary: "Moltbot CLI 参考，涵盖 `moltbot` 命令、子命令与选项"
read_when:
  - 添加或修改 CLI 命令或选项
  - 记录新的命令入口
---

# CLI 参考

此页面描述当前 CLI 行为。命令变更时请同步更新本文档。

## 命令页面

- [`setup`](/cli/setup)
- [`onboard`](/cli/onboard)
- [`configure`](/cli/configure)
- [`config`](/cli/config)
- [`doctor`](/cli/doctor)
- [`dashboard`](/cli/dashboard)
- [`reset`](/cli/reset)
- [`uninstall`](/cli/uninstall)
- [`update`](/cli/update)
- [`message`](/cli/message)
- [`agent`](/cli/agent)
- [`agents`](/cli/agents)
- [`acp`](/cli/acp)
- [`status`](/cli/status)
- [`health`](/cli/health)
- [`sessions`](/cli/sessions)
- [`gateway`](/cli/gateway)
- [`logs`](/cli/logs)
- [`system`](/cli/system)
- [`models`](/cli/models)
- [`memory`](/cli/memory)
- [`nodes`](/cli/nodes)
- [`devices`](/cli/devices)
- [`node`](/cli/node)
- [`approvals`](/cli/approvals)
- [`sandbox`](/cli/sandbox)
- [`tui`](/cli/tui)
- [`browser`](/cli/browser)
- [`cron`](/cli/cron)
- [`dns`](/cli/dns)
- [`docs`](/cli/docs)
- [`hooks`](/cli/hooks)
- [`webhooks`](/cli/webhooks)
- [`pairing`](/cli/pairing)
- [`plugins`](/cli/plugins)（插件命令）
- [`channels`](/cli/channels)
- [`security`](/cli/security)
- [`skills`](/cli/skills)
- [`voicecall`](/cli/voicecall)（插件，安装后可用）

## 全局标志

- `--dev`：将状态隔离到 `~/.clawdbot-dev` 并切换默认端口。
- `--profile <name>`：将状态隔离到 `~/.clawdbot-<name>`。
- `--no-color`：禁用 ANSI 颜色。
- `--update`：`moltbot update` 的快捷方式（仅源码安装）。
- `-V`, `--version`, `-v`：打印版本并退出。

## 输出样式

- ANSI 颜色与进度指示器只在 TTY 会话中渲染。
- 支持 OSC-8 的终端会显示可点击链接，否则回退为普通 URL。
- `--json`（以及支持的 `--plain`）会关闭样式以获得干净输出。
- `--no-color` 关闭 ANSI 样式；同时支持 `NO_COLOR=1`。
- 长时间运行的命令会显示进度指示器（支持时使用 OSC 9;4）。

## 颜色调色板

Moltbot CLI 使用龙虾色板。

- `accent` (#FF5A2D)：标题、标签、主高亮。
- `accentBright` (#FF7A3D)：命令名、强调。
- `accentDim` (#D14A22)：次级高亮文本。
- `info` (#FF8A5B)：信息值。
- `success` (#2FBF71)：成功状态。
- `warn` (#FFB020)：警告、回退、提醒。
- `error` (#E23D2D)：错误、失败。
- `muted` (#8B7F77)：弱化、元数据。

调色板真值来源：`src/terminal/palette.ts`（也称为“lobster seam”）。

## 命令树

```
moltbot [--dev] [--profile <name>] <command>
  setup
  onboard
  configure
  config
    get
    set
    unset
  doctor
  security
    audit
  reset
  uninstall
  update
  channels
    list
    status
    logs
    add
    remove
    login
    logout
  skills
    list
    info
    check
  plugins
    list
    info
    install
    enable
    disable
    doctor
  memory
    status
    index
    search
  message
  agent
  agents
    list
    add
    delete
  acp
  status
  health
  sessions
  gateway
    call
    health
    status
    probe
    discover
    install
    uninstall
    start
    stop
    restart
    run
  logs
  system
    event
    heartbeat last|enable|disable
    presence
  models
    list
    status
    set
    set-image
    aliases list|add|remove
    fallbacks list|add|remove|clear
    image-fallbacks list|add|remove|clear
    scan
    auth add|setup-token|paste-token
    auth order get|set|clear
  sandbox
    list
    recreate
    explain
  cron
    status
    list
    add
    edit
    rm
    enable
    disable
    runs
    run
  nodes
  devices
  node
    run
    status
    install
    uninstall
    start
    stop
    restart
  approvals
    get
    set
    allowlist add|remove
  browser
    status
    start
    stop
    reset-profile
    tabs
    open
    focus
    close
    profiles
    create-profile
    delete-profile
    screenshot
    snapshot
    navigate
    resize
    click
    type
    press
    hover
    drag
    select
    upload
    fill
    dialog
    wait
    evaluate
    console
    pdf
  hooks
    list
    info
    check
    enable
    disable
    install
    update
  webhooks
    gmail setup|run
  pairing
    list
    approve
  docs
  dns
    setup
  tui
```

注意：插件可以添加额外的顶层命令（例如 `moltbot voicecall`）。

## 安全

- `moltbot security audit` — 审计配置与本地状态中的常见安全隐患。
- `moltbot security audit --deep` — 尽力进行实时 Gateway 探测。
- `moltbot security audit --fix` — 收紧安全默认值并为状态与配置执行 chmod。

## 插件

管理扩展及其配置：

- `moltbot plugins list` — 发现插件（使用 `--json` 获得机器输出）。
- `moltbot plugins info <id>` — 显示插件详情。
- `moltbot plugins install <path|.tgz|npm-spec>` — 安装插件（或把插件路径写入 `plugins.load.paths`）。
- `moltbot plugins enable <id>` / `disable <id>` — 切换 `plugins.entries.<id>.enabled`。
- `moltbot plugins doctor` — 报告插件加载错误。

多数插件变更需要重启 gateway。见 [/plugin](/plugin)。

## 记忆

对 `MEMORY.md` 与 `memory/*.md` 做向量搜索：

- `moltbot memory status` — 显示索引统计。
- `moltbot memory index` — 重新索引记忆文件。
- `moltbot memory search "<query>"` — 对记忆进行语义搜索。

## 聊天斜杠命令

聊天消息支持 `/...` 命令（文本与原生命令）。见 [/tools/slash-commands](/tools/slash-commands)。

要点：
- `/status` 快速诊断。
- `/config` 持久化配置变更。
- `/debug` 仅运行时覆盖配置（内存不落盘；需要 `commands.debug: true`）。

## 设置与引导

### `setup`
初始化配置与工作区。

选项：
- `--workspace <dir>`：代理工作区路径（默认 `~/clawd`）。
- `--wizard`：运行引导向导。
- `--non-interactive`：无提示运行向导。
- `--mode <local|remote>`：向导模式。
- `--remote-url <url>`：远程 Gateway URL。
- `--remote-token <token>`：远程 Gateway 令牌。

当存在任何向导标志（`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`）时自动运行向导。

### `onboard`
交互式向导，用于设置 gateway、工作区与技能。

选项：
- `--workspace <dir>`
- `--reset`（在向导前重置配置、凭据、会话与工作区）
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>`（manual 是 advanced 的别名）
- `--auth-choice <setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ai-gateway-api-key|moonshot-api-key|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|skip>`
- `--token-provider <id>`（非交互；配合 `--auth-choice token`）
- `--token <token>`（非交互；配合 `--auth-choice token`）
- `--token-profile-id <id>`（非交互；默认：`<provider>:manual`）
- `--token-expires-in <duration>`（非交互；例如 `365d`、`12h`）
- `--anthropic-api-key <key>`
- `--openai-api-key <key>`
- `--openrouter-api-key <key>`
- `--ai-gateway-api-key <key>`
- `--moonshot-api-key <key>`
- `--kimi-code-api-key <key>`
- `--gemini-api-key <key>`
- `--zai-api-key <key>`
- `--minimax-api-key <key>`
- `--opencode-zen-api-key <key>`
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-password <password>`
- `--remote-url <url>`
- `--remote-token <token>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--install-daemon`
- `--no-install-daemon`（别名：`--skip-daemon`）
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-health`
- `--skip-ui`
- `--node-manager <npm|pnpm|bun>`（推荐 pnpm；bun 不建议用作 Gateway 运行时）
- `--json`

### `configure`
交互式配置向导（模型、渠道、技能、gateway）。

### `config`
非交互配置辅助（get/set/unset）。单独运行 `moltbot config`（不带子命令）会启动向导。

子命令：
- `config get <path>`：打印配置值（点路径或括号路径）。
- `config set <path> <value>`：设置配置值（JSON5 或原始字符串）。
- `config unset <path>`：移除配置项。

### `doctor`
健康检查与快速修复（配置 + gateway + 旧服务）。

选项：
- `--no-workspace-suggestions`：禁用工作区记忆提示。
- `--yes`：无提示接受默认值（无头模式）。
- `--non-interactive`：跳过提示，仅应用安全迁移。
- `--deep`：扫描系统服务中的额外 gateway 安装。

## 渠道助手

### `channels`
管理聊天渠道账号（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/MS Teams）。

子命令：
- `channels list`：显示配置的渠道与认证配置。
- `channels status`：检查 gateway 可达性与渠道健康（`--probe` 执行更多检查；gateway 健康探测请用 `moltbot health` 或 `moltbot status --deep`）。
- 提示：当可检测到常见配置错误时，`channels status` 会输出建议修复方案并指向 `moltbot doctor`。
- `channels logs`：从 gateway 日志文件读取最近的渠道日志。
- `channels add`：不带标志时为向导式；加标志切换为非交互模式。
- `channels remove`：默认仅禁用；传 `--delete` 才会无提示移除配置。
- `channels login`：交互式渠道登录（仅 WhatsApp Web）。
- `channels logout`：登出渠道会话（若支持）。

常用选项：
- `--channel <name>`：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`：渠道账号 id（默认 `default`）
- `--name <label>`：账号显示名称

`channels login` 选项：
- `--channel <channel>`（默认 `whatsapp`；支持 `whatsapp`/`web`）
- `--account <id>`
- `--verbose`

`channels logout` 选项：
- `--channel <channel>`（默认 `whatsapp`）
- `--account <id>`

`channels list` 选项：
- `--no-usage`：跳过模型提供商的用量与配额快照（仅 OAuth/API 认证）。
- `--json`：输出 JSON（除非设置 `--no-usage`，否则包含用量）。

`channels logs` 选项：
- `--channel <name|all>`（默认 `all`）
- `--lines <n>`（默认 `200`）
- `--json`

更多细节：[/concepts/oauth](/concepts/oauth)

示例：
```bash
moltbot channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
moltbot channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
moltbot channels remove --channel discord --account work --delete
moltbot channels status --probe
moltbot status --deep
```

### `skills`
列出并检查可用技能及其就绪状态。

子命令：
- `skills list`：列出技能（不带子命令时的默认行为）。
- `skills info <name>`：显示某个技能的详细信息。
- `skills check`：汇总就绪与缺失项。

选项：
- `--eligible`：仅显示可用技能。
- `--json`：输出 JSON（无样式）。
- `-v`, `--verbose`：包含缺失要求的细节。

提示：使用 `npx clawdhub` 搜索、安装与同步技能。

### `pairing`
审批跨渠道 DM 配对请求。

子命令：
- `pairing list <channel> [--json]`
- `pairing approve <channel> <code> [--notify]`

### `webhooks gmail`
Gmail Pub/Sub Hook 配置与运行。见 [/automation/gmail-pubsub](/automation/gmail-pubsub)。

子命令：
- `webhooks gmail setup`（需要 `--account <email>`；支持 `--project`、`--topic`、`--subscription`、`--label`、`--hook-url`、`--hook-token`、`--push-token`、`--bind`、`--port`、`--path`、`--include-body`、`--max-bytes`、`--renew-minutes`、`--tailscale`、`--tailscale-path`、`--tailscale-target`、`--push-endpoint`、`--json`）
- `webhooks gmail run`（相同标志的运行时覆盖）

### `dns setup`
广域发现 DNS 辅助（CoreDNS + Tailscale）。见 [/gateway/discovery](/gateway/discovery)。

选项：
- `--apply`：安装或更新 CoreDNS 配置（需要 sudo，仅 macOS）。

## 消息与代理

### `message`
统一的外发消息与渠道操作。

参见：[/cli/message](/cli/message)

子命令：
- `message send|poll|react|reactions|read|edit|delete|pin|unpin|pins|permissions|search|timeout|kick|ban`
- `message thread <create|list|reply>`
- `message emoji <list|upload>`
- `message sticker <send|upload>`
- `message role <info|add|remove>`
- `message channel <info|list>`
- `message member info`
- `message voice status`
- `message event <list|create>`

示例：
- `moltbot message send --target +15555550123 --message "Hi"`
- `moltbot message poll --channel discord --target channel:123 --poll-question "Snack?" --poll-option Pizza --poll-option Sushi`

### `agent`
通过 Gateway 运行一次代理轮次（或 `--local` 嵌入）。

必需：
- `--message <text>`

选项：
- `--to <dest>`（用于会话 key 与可选投递）
- `--session-id <id>`
- `--thinking <off|minimal|low|medium|high|xhigh>`（仅 GPT-5.2 与 Codex 模型）
- `--verbose <on|full|off>`
- `--channel <whatsapp|telegram|discord|slack|mattermost|signal|imessage|msteams>`
- `--local`
- `--deliver`
- `--json`
- `--timeout <seconds>`

### `agents`
管理隔离代理（工作区 + 认证 + 路由）。

#### `agents list`
列出已配置代理。

选项：
- `--json`
- `--bindings`

#### `agents add [name]`
新增隔离代理。若未传标志（或 `--non-interactive`），则运行引导向导；非交互模式需要 `--workspace`。

选项：
- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>`（可重复）
- `--non-interactive`
- `--json`

绑定规格为 `channel[:accountId]`。未填写 `accountId` 时，WhatsApp 使用默认账号 id。

#### `agents delete <id>`
删除代理并裁剪其工作区与状态。

选项：
- `--force`
- `--json`

### `acp`
运行 ACP 桥接以连接 IDE 与 Gateway。

详见 [`acp`](/cli/acp) 的完整选项与示例。

### `status`
显示已关联会话的健康状态与最近接收者。

选项：
- `--json`
- `--all`（完整诊断；只读，可粘贴）
- `--deep`（探测渠道）
- `--usage`（显示模型提供商用量与配额）
- `--timeout <ms>`
- `--verbose`
- `--debug`（`--verbose` 的别名）

说明：
- 概览在可用时包含 Gateway 与节点主机服务状态。

### 用量追踪
Moltbot 可在具备 OAuth/API 凭据时展示提供商用量与配额。

入口：
- `/status`（可用时追加一行用量摘要）
- `moltbot status --usage`（打印完整提供商明细）
- macOS 菜单栏（Context 下的 Usage 区域）

说明：
- 数据直接来自提供商用量端点（非估算）。
- 提供商：Anthropic、GitHub Copilot、OpenAI Codex OAuth，以及在启用时的 Gemini CLI 与 Antigravity。
- 若无匹配凭据，用量信息会隐藏。
- 详情：见 [Usage tracking](/concepts/usage-tracking)。

### `health`
从运行中的 Gateway 获取健康信息。

选项：
- `--json`
- `--timeout <ms>`
- `--verbose`

### `sessions`
列出存储的对话会话。

选项：
- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`

## 重置与卸载

### `reset`
重置本地配置与状态（CLI 仍保留）。

选项：
- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

说明：
- `--non-interactive` 需要 `--scope` 与 `--yes`。

### `uninstall`
卸载 gateway 服务与本地数据（CLI 保留）。

选项：
- `--service`
- `--state`
- `--workspace`
- `--app`
- `--all`
- `--yes`
- `--non-interactive`
- `--dry-run`

说明：
- `--non-interactive` 需要 `--yes` 且显式指定范围（或 `--all`）。

## Gateway

### `gateway`
运行 WebSocket Gateway。

选项：
- `--port <port>`
- `--bind <loopback|tailnet|lan|auto|custom>`
- `--token <token>`
- `--auth <token|password>`
- `--password <password>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--allow-unconfigured`
- `--dev`
- `--reset`（重置 dev 配置、凭据、会话与工作区）
- `--force`（杀掉已占用端口的监听器）
- `--verbose`
- `--claude-cli-logs`
- `--ws-log <auto|full|compact>`
- `--compact`（`--ws-log compact` 的别名）
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`
管理 Gateway 服务（launchd/systemd/schtasks）。

子命令：
- `gateway status`（默认探测 Gateway RPC）
- `gateway install`（安装服务）
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

说明：
- `gateway status` 默认用服务解析出的端口与配置探测 Gateway RPC（可用 `--url/--token/--password` 覆盖）。
- `gateway status` 支持 `--no-probe`、`--deep` 与 `--json` 用于脚本。
- `gateway status` 在可检测时会提示遗留或额外的 gateway 服务（`--deep` 会加入系统级扫描）。带 profile 的 Moltbot 服务是一级服务，不会被标记为“额外”。
- `gateway status` 会打印 CLI 使用的配置路径与服务可能使用的配置路径（服务 env），并显示探测目标 URL。
- `gateway install|uninstall|start|stop|restart` 支持 `--json` 以便脚本化（默认输出仍偏向人类）。
- `gateway install` 默认使用 Node 运行时；不推荐 bun（WhatsApp/Telegram 有 bug）。
- `gateway install` 选项：`--port`、`--runtime`、`--token`、`--force`、`--json`。

### `logs`
通过 RPC 跟随 Gateway 文件日志。

说明：
- TTY 会话会渲染带颜色的结构化视图；非 TTY 回退为纯文本。
- `--json` 以逐行 JSON 输出（每行一个日志事件）。

示例：
```bash
moltbot logs --follow
moltbot logs --limit 200
moltbot logs --plain
moltbot logs --json
moltbot logs --no-color
```

### `gateway <subcommand>`
Gateway CLI 辅助命令（RPC 子命令可用 `--url`、`--token`、`--password`、`--timeout`、`--expect-final`）。

子命令：
- `gateway call <method> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

常用 RPC：
- `config.apply`（校验 + 写入配置 + 重启 + 唤醒）
- `config.patch`（合并局部更新 + 重启 + 唤醒）
- `update.run`（执行更新 + 重启 + 唤醒）

提示：直接调用 `config.set`/`config.apply`/`config.patch` 时，如已有配置请传 `config.get` 返回的 `baseHash`。

## 模型

回退行为与扫描策略见 [/concepts/models](/concepts/models)。

推荐的 Anthropic 认证方式（setup-token）：

```bash
claude setup-token
moltbot models auth setup-token --provider anthropic
moltbot models status
```

### `models`（根命令）
`moltbot models` 是 `models status` 的别名。

根选项：
- `--status-json`（`models status --json` 的别名）
- `--status-plain`（`models status --plain` 的别名）

### `models list`
选项：
- `--all`
- `--local`
- `--provider <name>`
- `--json`
- `--plain`

### `models status`
选项：
- `--json`
- `--plain`
- `--check`（退出码：1=过期或缺失，2=即将过期）
- `--probe`（对已配置的认证配置执行实时探测）
- `--probe-provider <name>`
- `--probe-profile <id>`（可重复或逗号分隔）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

总是包含认证概览与认证存储中的 OAuth 过期状态。
`--probe` 会发起实时请求（可能消耗 token 并触发限流）。

### `models set <model>`
设置 `agents.defaults.model.primary`。

### `models set-image <model>`
设置 `agents.defaults.imageModel.primary`。

### `models aliases list|add|remove`
选项：
- `list`：`--json`、`--plain`
- `add <alias> <model>`
- `remove <alias>`

### `models fallbacks list|add|remove|clear`
选项：
- `list`：`--json`、`--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models image-fallbacks list|add|remove|clear`
选项：
- `list`：`--json`、`--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models scan`
选项：
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`
- `--concurrency <n>`
- `--no-probe`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

### `models auth add|setup-token|paste-token`
选项：
- `add`：交互式认证辅助
- `setup-token`：`--provider <name>`（默认 `anthropic`）、`--yes`
- `paste-token`：`--provider <name>`、`--profile-id <id>`、`--expires-in <duration>`

### `models auth order get|set|clear`
选项：
- `get`：`--provider <name>`、`--agent <id>`、`--json`
- `set`：`--provider <name>`、`--agent <id>`、`<profileIds...>`
- `clear`：`--provider <name>`、`--agent <id>`

## 系统

### `system event`
入队系统事件并可选触发心跳（Gateway RPC）。

必需：
- `--text <text>`

选项：
- `--mode <now|next-heartbeat>`
- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

### `system heartbeat last|enable|disable`
心跳控制（Gateway RPC）。

选项：
- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

### `system presence`
列出系统存在项（Gateway RPC）。

选项：
- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

## 定时任务

通过 Gateway RPC 管理定时任务。见 [/automation/cron-jobs](/automation/cron-jobs)。

子命令：
- `cron status [--json]`
- `cron list [--all] [--json]`（默认表格输出；`--json` 输出原始数据）
- `cron add`（别名：`create`；需要 `--name` 且在 `--at` | `--every` | `--cron` 中且只允许一个，同时在 `--system-event` | `--message` 中且只允许一个）
- `cron edit <id>`（补丁字段）
- `cron rm <id>`（别名：`remove`、`delete`）
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

所有 `cron` 命令都接受 `--url`、`--token`、`--timeout`、`--expect-final`。

## 节点主机

`node` 运行 **无界面节点主机** 或以后台服务方式管理。见
[`moltbot node`](/cli/node)。

子命令：
- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

## 节点

`nodes` 通过 Gateway 操作已配对节点。见 [/nodes](/nodes)。

常用选项：
- `--url`、`--token`、`--timeout`、`--json`

子命令：
- `nodes status [--connected] [--last-connected <duration>]`
- `nodes describe --node <id|name|ip>`
- `nodes list [--connected] [--last-connected <duration>]`
- `nodes pending`
- `nodes approve <requestId>`
- `nodes reject <requestId>`
- `nodes rename --node <id|name|ip> --name <displayName>`
- `nodes invoke --node <id|name|ip> --command <command> [--params <json>] [--invoke-timeout <ms>] [--idempotency-key <key>]`
- `nodes run --node <id|name|ip> [--cwd <path>] [--env KEY=VAL] [--command-timeout <ms>] [--needs-screen-recording] [--invoke-timeout <ms>] <command...>`（mac 节点或无界面节点主机）
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]`（仅 mac）

相机：
- `nodes camera list --node <id|name|ip>`
- `nodes camera snap --node <id|name|ip> [--facing front|back|both] [--device-id <id>] [--max-width <px>] [--quality <0-1>] [--delay-ms <ms>] [--invoke-timeout <ms>]`
- `nodes camera clip --node <id|name|ip> [--facing front|back] [--device-id <id>] [--duration <ms|10s|1m>] [--no-audio] [--invoke-timeout <ms>]`

画布与屏幕：
- `nodes canvas snapshot --node <id|name|ip> [--format png|jpg|jpeg] [--max-width <px>] [--quality <0-1>] [--invoke-timeout <ms>]`
- `nodes canvas present --node <id|name|ip> [--target <urlOrPath>] [--x <px>] [--y <px>] [--width <px>] [--height <px>] [--invoke-timeout <ms>]`
- `nodes canvas hide --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas navigate <url> --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas eval [<js>] --node <id|name|ip> [--js <code>] [--invoke-timeout <ms>]`
- `nodes canvas a2ui push --node <id|name|ip> (--jsonl <path> | --text <text>) [--invoke-timeout <ms>]`
- `nodes canvas a2ui reset --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes screen record --node <id|name|ip> [--screen <index>] [--duration <ms|10s>] [--fps <n>] [--no-audio] [--out <path>] [--invoke-timeout <ms>]`

位置：
- `nodes location get --node <id|name|ip> [--max-age <ms>] [--accuracy <coarse|balanced|precise>] [--location-timeout <ms>] [--invoke-timeout <ms>]`

## 浏览器

浏览器控制 CLI（专用 Chrome/Brave/Edge/Chromium）。见 [`moltbot browser`](/cli/browser) 与 [Browser 工具](/tools/browser)。

常用选项：
- `--url`、`--token`、`--timeout`、`--json`
- `--browser-profile <name>`

管理：
- `browser status`
- `browser start`
- `browser stop`
- `browser reset-profile`
- `browser tabs`
- `browser open <url>`
- `browser focus <targetId>`
- `browser close [targetId]`
- `browser profiles`
- `browser create-profile --name <name> [--color <hex>] [--cdp-url <url>]`
- `browser delete-profile --name <name>`

检查：
- `browser screenshot [targetId] [--full-page] [--ref <ref>] [--element <selector>] [--type png|jpeg]`
- `browser snapshot [--format aria|ai] [--target-id <id>] [--limit <n>] [--interactive] [--compact] [--depth <n>] [--selector <sel>] [--out <path>]`

动作：
- `browser navigate <url> [--target-id <id>]`
- `browser resize <width> <height> [--target-id <id>]`
- `browser click <ref> [--double] [--button <left|right|middle>] [--modifiers <csv>] [--target-id <id>]`
- `browser type <ref> <text> [--submit] [--slowly] [--target-id <id>]`
- `browser press <key> [--target-id <id>]`
- `browser hover <ref> [--target-id <id>]`
- `browser drag <startRef> <endRef> [--target-id <id>]`
- `browser select <ref> <values...> [--target-id <id>]`
- `browser upload <paths...> [--ref <ref>] [--input-ref <ref>] [--element <selector>] [--target-id <id>] [--timeout-ms <ms>]`
- `browser fill [--fields <json>] [--fields-file <path>] [--target-id <id>]`
- `browser dialog --accept|--dismiss [--prompt <text>] [--target-id <id>] [--timeout-ms <ms>]`
- `browser wait [--time <ms>] [--text <value>] [--text-gone <value>] [--target-id <id>]`
- `browser evaluate --fn <code> [--ref <ref>] [--target-id <id>]`
- `browser console [--level <error|warn|info>] [--target-id <id>]`
- `browser pdf [--target-id <id>]`

## 文档搜索

### `docs [query...]`
搜索在线文档索引。

## TUI

### `tui`
打开连接到 Gateway 的终端 UI。

选项：
- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--session <key>`
- `--deliver`
- `--thinking <level>`
- `--message <text>`
- `--timeout-ms <ms>`（默认 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`
