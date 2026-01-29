---
summary: "Gateway 服务的运行手册、生命周期与运维"
read_when:
  - 运行或排查网关进程
---
# Gateway 服务运行手册

最后更新：2025-12-09

## 它是什么
- 常驻进程，持有唯一的 Baileys/Telegram 连接以及控制面/事件面。
- 替代遗留 `gateway` 命令。CLI 入口：`moltbot gateway`。
- 持续运行，遇到致命错误会以非零码退出，便于监督进程重启。

## 如何运行（本地）
```bash
moltbot gateway --port 18789
# 标准输出显示完整 debug/trace 日志：
moltbot gateway --port 18789 --verbose
# 端口被占用时，先终止监听再启动：
moltbot gateway --force
# 开发循环（TS 变更自动重载）：
pnpm gateway:watch
```
- 配置热重载会监视 `~/.clawdbot/moltbot.json`（或 `CLAWDBOT_CONFIG_PATH`）。
  - 默认模式：`gateway.reload.mode="hybrid"`（安全变更热应用，关键变更重启）。
  - 需要时通过 **SIGUSR1** 触发进程内重启。
  - 设为 `gateway.reload.mode="off"` 可禁用。
- WebSocket 控制面绑定到 `127.0.0.1:<port>`（默认 18789）。
- 同一端口也提供 HTTP（Control UI、hooks、A2UI）。单端口复用。
  - OpenAI Chat Completions（HTTP）：[`/v1/chat/completions`](/gateway/openai-http-api)。
  - OpenResponses（HTTP）：[`/v1/responses`](/gateway/openresponses-http-api)。
  - Tools Invoke（HTTP）：[`/tools/invoke`](/gateway/tools-invoke-http-api)。
- 默认启动 Canvas 文件服务，`canvasHost.port`（默认 `18793`），从 `~/clawd/canvas` 提供 `http://<gateway-host>:18793/__moltbot__/canvas/`。设 `canvasHost.enabled=false` 或 `CLAWDBOT_SKIP_CANVAS_HOST=1` 可关闭。
- 日志输出到 stdout；用 launchd/systemd 保活并轮转日志。
- 故障排查时可用 `--verbose` 将日志文件中的 debug 输出镜像到 stdout（握手、req/res、事件）。
- `--force` 会用 `lsof` 查找端口监听者，发送 SIGTERM，记录被杀进程后启动网关（缺少 `lsof` 时会快速失败）。
- 若在监督器下运行（launchd/systemd/mac app 子进程模式），停止/重启通常发送 **SIGTERM**；旧版本可能表现为 `pnpm` `ELIFECYCLE` 退出码 **143**（SIGTERM），这是正常退出，不是崩溃。
- **SIGUSR1** 在授权情况下触发进程内重启（gateway 工具/配置应用/更新，或启用 `commands.restart` 以手动重启）。
- 网关默认需要认证：设置 `gateway.auth.token`（或 `CLAWDBOT_GATEWAY_TOKEN`）或 `gateway.auth.password`。客户端必须在 `connect.params.auth.token/password` 中提供，除非使用 Tailscale Serve 身份。
- 向导默认会生成 token，即使在 loopback。
- 端口优先级：`--port` > `CLAWDBOT_GATEWAY_PORT` > `gateway.port` > 默认 `18789`。

## 远程访问
- 优先使用 Tailscale/VPN；否则用 SSH 隧道：
  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```
- 客户端随后通过隧道连接 `ws://127.0.0.1:18789`。
- 若配置了 token，即使走隧道也必须在 `connect.params.auth.token` 中携带。

## 多网关（同一主机）

通常不需要：单个 Gateway 可服务多个消息通道与 agent。只有在冗余或严格隔离（如救援机器人）时才启用多网关。

前提是隔离状态与配置，并使用不同端口。完整指南见 [Multiple gateways](/gateway/multiple-gateways)。

服务名称与 profile 相关：
- macOS：`bot.molt.<profile>`（遗留 `com.clawdbot.*` 可能仍存在）
- Linux：`moltbot-gateway-<profile>.service`
- Windows：`Moltbot Gateway (<profile>)`

安装元数据内嵌于服务配置：
- `CLAWDBOT_SERVICE_MARKER=moltbot`
- `CLAWDBOT_SERVICE_KIND=gateway`
- `CLAWDBOT_SERVICE_VERSION=<version>`

救援机器人模式：保持第二个 Gateway 隔离，使用独立 profile、状态目录、工作区与基础端口间隔。完整指南见 [Rescue-bot guide](/gateway/multiple-gateways#rescue-bot-guide)。

### Dev profile（`--dev`）

快捷路径：运行一个完全隔离的 dev 实例（配置/状态/工作区），不影响主配置。

```bash
moltbot --dev setup
moltbot --dev gateway --allow-unconfigured
# 然后指向 dev 实例：
moltbot --dev status
moltbot --dev health
```

默认值（可通过 env/flags/config 覆盖）：
- `CLAWDBOT_STATE_DIR=~/.clawdbot-dev`
- `CLAWDBOT_CONFIG_PATH=~/.clawdbot-dev/moltbot.json`
- `CLAWDBOT_GATEWAY_PORT=19001`（Gateway WS + HTTP）
- 浏览器控制服务端口 = `19003`（推导：`gateway.port+2`，仅 loopback）
- `canvasHost.port=19005`（推导：`gateway.port+4`）
- 在 `--dev` 下运行 `setup`/`onboard` 时，`agents.defaults.workspace` 默认变为 `~/clawd-dev`。

派生端口（经验规则）：
- 基础端口 = `gateway.port`（或 `CLAWDBOT_GATEWAY_PORT` / `--port`）
- 浏览器控制服务端口 = 基础 + 2（仅 loopback）
- `canvasHost.port = 基础 + 4`（或 `CLAWDBOT_CANVAS_HOST_PORT` / 配置覆盖）
- 浏览器 profile 的 CDP 端口会从 `browser.controlPort + 9 .. + 108` 自动分配（按 profile 持久化）。

每个实例的检查清单：
- 唯一的 `gateway.port`
- 唯一的 `CLAWDBOT_CONFIG_PATH`
- 唯一的 `CLAWDBOT_STATE_DIR`
- 唯一的 `agents.defaults.workspace`
- 独立 WhatsApp 号码（若使用 WA）

按 profile 安装服务：
```bash
moltbot --profile main gateway install
moltbot --profile rescue gateway install
```

示例：
```bash
CLAWDBOT_CONFIG_PATH=~/.clawdbot/a.json CLAWDBOT_STATE_DIR=~/.clawdbot-a moltbot gateway --port 19001
CLAWDBOT_CONFIG_PATH=~/.clawdbot/b.json CLAWDBOT_STATE_DIR=~/.clawdbot-b moltbot gateway --port 19002
```

## 协议（operator 视角）
- 全量文档：[Gateway protocol](/gateway/protocol) 与 [Bridge protocol（遗留）](/gateway/bridge-protocol)。
- 客户端首帧必须是：`req {type:"req", id, method:"connect", params:{minProtocol,maxProtocol,client:{id,displayName?,version,platform,deviceFamily?,modelIdentifier?,mode,instanceId?}, caps, auth?, locale?, userAgent? } }`。
- Gateway 返回 `res {type:"res", id, ok:true, payload:hello-ok }`（或 `ok:false` 错误后关闭）。
- 握手后：
  - 请求：`{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - 事件：`{type:"event", event, payload, seq?, stateVersion?}`
- 结构化 presence 条目：`{host, ip, version, platform?, deviceFamily?, modelIdentifier?, mode, lastInputSeconds?, ts, reason?, tags?[], instanceId? }`（对 WS 客户端，`instanceId` 来自 `connect.client.instanceId`）。
- `agent` 响应为两阶段：先返回 `res` ack `{runId,status:"accepted"}`，执行结束后再返回最终 `res` `{runId,status:"ok"|"error",summary}`；流式输出以 `event:"agent"` 发送。

## 方法（初始集合）
- `health` — 完整健康快照（与 `moltbot health --json` 同形）。
- `status` — 简短摘要。
- `system-presence` — 当前 presence 列表。
- `system-event` — 发布 presence/系统备注（结构化）。
- `send` — 通过活动通道发送消息。
- `agent` — 运行一次 agent（在同一连接上回传事件）。
- `node.list` — 列出已配对与当前连接的节点（含 `caps`、`deviceFamily`、`modelIdentifier`、`paired`、`connected` 与声明的 `commands`）。
- `node.describe` — 描述某节点（能力 + 支持的 `node.invoke` 命令；适用于已配对或当前连接的未配对节点）。
- `node.invoke` — 调用节点命令（例如 `canvas.*`、`camera.*`）。
- `node.pair.*` — 配对生命周期（`request`、`list`、`approve`、`reject`、`verify`）。

另见 [Presence](/concepts/presence)，了解 presence 生成与去重，以及稳定 `client.instanceId` 的重要性。

## 事件
- `agent` — agent 运行产生的工具/输出事件（带序号）。
- `presence` — presence 更新（带 stateVersion 的增量），推送给所有连接客户端。
- `tick` — 定时保活/无操作事件，用于确认存活。
- `shutdown` — Gateway 正在退出；payload 包含 `reason` 和可选 `restartExpectedMs`。客户端应重连。

## WebChat 集成
- WebChat 是原生 SwiftUI UI，直接连接 Gateway WebSocket，用于历史记录、发送、终止和事件。
- 远程使用走同一 SSH/Tailscale 隧道；若配置了 gateway token，客户端会在 `connect` 时携带。
- macOS 应用通过单一 WS 连接（共享连接）接入；它从初始快照补全 presence，并监听 `presence` 事件更新 UI。

## 类型与校验
- 服务器用 AJV 对每个入站帧按协议定义生成的 JSON Schema 进行校验。
- 客户端（TS/Swift）使用生成类型（TS 直接使用，Swift 通过仓库生成器）。
- 协议定义是唯一真相；可通过以下命令重新生成 schema/模型：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`

## 连接快照
- `hello-ok` 包含 `snapshot`（`presence`、`health`、`stateVersion`、`uptimeMs` 以及 `policy {maxPayload,maxBufferedBytes,tickIntervalMs}`），客户端无需额外请求即可渲染。
- `health`/`system-presence` 仍可用于手动刷新，但不是连接必需。

## 错误码（res.error 形状）
- 错误使用 `{ code, message, details?, retryable?, retryAfterMs? }`。
- 标准代码：
  - `NOT_LINKED` — WhatsApp 未认证。
  - `AGENT_TIMEOUT` — agent 在配置期限内未响应。
  - `INVALID_REQUEST` — schema/参数校验失败。
  - `UNAVAILABLE` — Gateway 正在关闭或依赖不可用。

## 保活行为
- `tick` 事件（或 WS ping/pong）会定期发出，确保在无流量时客户端也能判断网关存活。
- send/agent 的确认仍是独立响应；不要用 tick 替代发送确认。

## 重放与缺口
- 事件不会重放。客户端检测到 seq 缺口时应刷新（`health` + `system-presence`）。WebChat 与 macOS 客户端已在缺口时自动刷新。

## 监督（macOS 示例）
- 使用 launchd 保活服务：
  - Program：`moltbot` 路径
  - Arguments：`gateway`
  - KeepAlive：true
  - StandardOut/Err：文件路径或 `syslog`
- 失败时 launchd 会重启；致命配置错误应持续退出以便运维注意。
- LaunchAgent 为每用户，需要已登录会话；无头场景使用自定义 LaunchDaemon（未内置）。
  - `moltbot gateway install` 写入 `~/Library/LaunchAgents/bot.molt.gateway.plist`
    （或 `bot.molt.<profile>.plist`；遗留 `com.clawdbot.*` 会清理）。
  - `moltbot doctor` 会审计 LaunchAgent 配置并可更新为最新默认值。

## Gateway 服务管理（CLI）

使用 Gateway CLI 安装/启动/停止/重启/状态：

```bash
moltbot gateway status
moltbot gateway install
moltbot gateway stop
moltbot gateway restart
moltbot logs --follow
```

注意：
- `gateway status` 默认使用服务解析出的端口/配置探测 Gateway RPC（可用 `--url` 覆盖）。
- `gateway status --deep` 追加系统级扫描（LaunchDaemons/system units）。
- `gateway status --no-probe` 跳过 RPC 探测（网络异常时有用）。
- `gateway status --json` 可用于脚本。
- `gateway status` 分别报告 **监督器运行态**（launchd/systemd 是否运行）与 **RPC 可达性**（WS 连接 + status RPC）。
- `gateway status` 会打印配置路径与探测目标，避免 “localhost vs LAN bind” 混淆与 profile 错配。
- `gateway status` 在服务看似运行但端口关闭时会打印最近的网关错误行。
- `logs` 通过 RPC 直接尾随网关文件日志（无需手动 `tail`/`grep`）。
- 若检测到其他类似 gateway 的服务，CLI 会警告，除非它们是 Moltbot profile 服务。
  对多数场景仍建议 **每台机器一个 gateway**；如需冗余或救援机器人，请用隔离 profile/端口。见 [Multiple gateways](/gateway/multiple-gateways)。
  - 清理：`moltbot gateway uninstall`（当前服务）与 `moltbot doctor`（遗留迁移）。
- `gateway install` 在已安装时为 no-op；可用 `moltbot gateway install --force` 重新安装（profile/env/path 变更）。

Bundled mac app：
- Moltbot.app 可捆绑基于 Node 的网关 relay，并安装按用户的 LaunchAgent，标签为
  `bot.molt.gateway`（或 `bot.molt.<profile>`；遗留 `com.clawdbot.*` 仍可卸载）。
- 停止：使用 `moltbot gateway stop`（或 `launchctl bootout gui/$UID/bot.molt.gateway`）。
- 重启：使用 `moltbot gateway restart`（或 `launchctl kickstart -k gui/$UID/bot.molt.gateway`）。
  - `launchctl` 仅在 LaunchAgent 已安装时可用；否则先 `moltbot gateway install`。
  - 运行具名 profile 时，将标签替换为 `bot.molt.<profile>`。

## 监督（systemd 用户单元）
Moltbot 在 Linux/WSL2 默认安装 **systemd user service**。单用户机器推荐 user service（环境简单、按用户配置）。
多用户或常驻服务器推荐 **system service**（无需 lingering，共享监督）。

`moltbot gateway install` 写入 user unit。`moltbot doctor` 会审计并更新到当前推荐默认值。

创建 `~/.config/systemd/user/moltbot-gateway[-<profile>].service`：
```
[Unit]
Description=Moltbot Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/moltbot gateway --port 18789
Restart=always
RestartSec=5
Environment=CLAWDBOT_GATEWAY_TOKEN=
WorkingDirectory=/home/youruser

[Install]
WantedBy=default.target
```
启用 lingering（保证用户服务在退出/空闲后仍存活）：
```
sudo loginctl enable-linger youruser
```
Linux/WSL2 的引导流程会执行此步骤（可能要求 sudo；写入 `/var/lib/systemd/linger`）。
然后启用服务：
```
systemctl --user enable --now moltbot-gateway[-<profile>].service
```

**替代方案（system service）**：常驻或多用户服务器可安装 systemd **system** unit（无需 lingering）。
创建 `/etc/systemd/system/moltbot-gateway[-<profile>].service`（复制上方 unit，
将 `WantedBy=multi-user.target`，并设置 `User=` + `WorkingDirectory=`），然后：
```
sudo systemctl daemon-reload
sudo systemctl enable --now moltbot-gateway[-<profile>].service
```

## Windows（WSL2）

Windows 安装请使用 **WSL2** 并遵循上方 Linux systemd 部分。

## 运维检查
- 存活性：打开 WS 并发送 `req:connect` → 期望 `res` 返回 `payload.type="hello-ok"`（含 snapshot）。
- 就绪性：调用 `health` → 期望 `ok: true` 且 `linkChannel` 已绑定（适用时）。
- 调试：订阅 `tick` 与 `presence` 事件；确保 `status` 显示绑定/认证年龄；presence 条目包含 Gateway 主机与已连接客户端。

## 安全保证
- 默认每主机一个 Gateway；若运行多个 profile，请隔离端口/状态并指向正确实例。
- 不回退到直接 Baileys 连接；Gateway 挂掉时发送会快速失败。
- 非 connect 首帧或非法 JSON 会被拒绝并关闭 socket。
- 优雅关闭：关闭前发送 `shutdown` 事件；客户端必须处理关闭与重连。

## CLI 辅助命令
- `moltbot gateway health|status` — 通过 Gateway WS 请求 health/status。
- `moltbot message send --target <num> --message "hi" [--media ...]` — 通过 Gateway 发送（对 WhatsApp 幂等）。
- `moltbot agent --message "hi" --to <num>` — 运行一次 agent（默认等待最终结果）。
- `moltbot gateway call <method> --params '{"k":"v"}'` — 原始方法调用，便于调试。
- `moltbot gateway stop|restart` — 停止/重启受监督的网关服务（launchd/systemd）。
- Gateway 子命令默认假设 `--url` 目标已有运行中的 gateway；不再自动启动。

## 迁移指引
- 停用 `moltbot gateway` 与遗留 TCP 控制端口的用法。
- 更新客户端以使用 WS 协议，强制 connect，并使用结构化 presence。
