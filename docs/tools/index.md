---
summary: "Moltbot 的 Agent 工具面（browser、canvas、nodes、message、cron），替代旧的 `moltbot-*` skills"
read_when:
  - 添加或修改 agent 工具
  - 退役或更改 `moltbot-*` skills
---

# 工具（Moltbot）

Moltbot 提供**一等 agent 工具**（browser、canvas、nodes、cron）。
这些替代了旧的 `moltbot-*` skills：工具是强类型、无需 shell，agent 应直接依赖它们。

## 禁用工具

可在 `moltbot.json` 中通过 `tools.allow` / `tools.deny` 全局允许/拒绝工具（deny 优先）。
这会阻止将被拒绝的工具发送给模型提供方。

```json5
{
  tools: { deny: ["browser"] }
}
```

说明：
- 匹配不区分大小写。
- 支持 `*` 通配符（`"*"` 表示所有工具）。
- 若 `tools.allow` 仅引用未知或未加载的插件工具名，Moltbot 会记录警告并忽略 allowlist，以保证核心工具可用。

## 工具配置文件（基础 allowlist）

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置**基础 allowlist**。
按 agent 覆盖：`agents.list[].tools.profile`。

Profiles：
- `minimal`：仅 `session_status`
- `coding`：`group:fs`、`group:runtime`、`group:sessions`、`group:memory`、`image`
- `messaging`：`group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`
- `full`：无约束（等同未设置）

示例（默认仅消息工具，同时允许 Slack + Discord 工具）：
```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"]
  }
}
```

示例（coding profile，但全局禁用 exec/process）：
```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"]
  }
}
```

示例（全局 coding profile，支持 agent 仅消息工具）：
```json5
{
  tools: { profile: "coding" },
  agents: {
    list: [
      {
        id: "support",
        tools: { profile: "messaging", allow: ["slack"] }
      }
    ]
  }
}
```

## Provider 级工具策略

使用 `tools.byProvider` 可**进一步限制**特定 provider
（或单一 `provider/model`）的工具集，而不改变全局默认值。
按 agent 覆盖：`agents.list[].tools.byProvider`。

此策略在基础 profile **之后**、allow/deny 列表 **之前**应用，
因此只能缩小工具集。
Provider key 可为 `provider`（如 `google-antigravity`）或
`provider/model`（如 `openai/gpt-5.2`）。

示例（全局 coding profile，但对 Google Antigravity 只允许 minimal）：
```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" }
    }
  }
}
```

示例（为问题模型设置更窄 allowlist）：
```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] }
    }
  }
}
```

示例（单个 provider 的 agent 覆盖）：
```json5
{
  agents: {
    list: [
      {
        id: "support",
        tools: {
          byProvider: {
            "google-antigravity": { allow: ["message", "sessions_list"] }
          }
        }
      }
    ]
  }
}
```

## 工具组（简写）

工具策略（全局、agent、sandbox）支持 `group:*` 条目扩展为多个工具。
可在 `tools.allow` / `tools.deny` 中使用。

可用组：
- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:web`：`web_search`、`web_fetch`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:moltbot`：所有内置 Moltbot 工具（不含 provider 插件）

示例（仅允许文件工具 + browser）：
```json5
{
  tools: {
    allow: ["group:fs", "browser"]
  }
}
```

## 插件 + 工具

插件可以注册**额外工具**（以及 CLI 命令），超出核心工具集。
安装与配置见 [插件](/plugin)，工具使用指导注入见 [Skills](/tools/skills)。
某些插件会同时提供技能与工具（如 voice-call 插件）。

可选插件工具：
- [Lobster](/tools/lobster)：强类型工作流运行时，支持可恢复审批（需要网关主机安装 Lobster CLI）。
- [LLM Task](/tools/llm-task)：JSON-only LLM 步骤，用于结构化工作流输出（可选 schema 校验）。

## 工具清单

### `apply_patch`
对一个或多个文件应用结构化补丁。用于多 hunk 编辑。
实验性：需启用 `tools.exec.applyPatch.enabled`（仅 OpenAI 模型）。

### `exec`
在工作区运行 shell 命令。

核心参数：
- `command`（必填）
- `yieldMs`（超时后自动后台化，默认 10000）
- `background`（立即后台化）
- `timeout`（秒；超时杀进程，默认 1800）
- `elevated`（bool；若启用/允许，在沙箱下运行于宿主；仅在沙箱时生效）
- `host`（`sandbox | gateway | node`）
- `security`（`deny | allowlist | full`）
- `ask`（`off | on-miss | always`）
- `node`（用于 `host=node` 的节点 id/名称）
- 需要真实 TTY？设置 `pty: true`。

说明：
- 后台时返回 `status: "running"` 与 `sessionId`。
- 使用 `process` 轮询/日志/写入/终止/清理后台会话。
- 若 `process` 被禁用，`exec` 将同步运行并忽略 `yieldMs`/`background`。
- `elevated` 受 `tools.elevated` 与 `agents.list[].tools.elevated` 双重门控（均允许才可），
  且等价于 `host=gateway` + `security=full`。
- `elevated` 仅在 agent 处于沙箱时改变行为（否则无效）。
- `host=node` 可指向 macOS companion app 或无头节点主机（`moltbot node run`）。
- gateway/node 的审批与 allowlist 见 [Exec approvals](/tools/exec-approvals)。

### `process`
管理后台 exec 会话。

核心动作：
- `list`、`poll`、`log`、`write`、`kill`、`clear`、`remove`

说明：
- `poll` 在完成时返回新的输出与退出状态。
- `log` 支持按行 `offset`/`limit`（省略 `offset` 即抓取最后 N 行）。
- `process` 按 agent 作用域隔离；其他 agent 的会话不可见。

### `web_search`
使用 Brave Search API 搜索网页。

核心参数：
- `query`（必填）
- `count`（1–10；默认来自 `tools.web.search.maxResults`）

说明：
- 需要 Brave API key（推荐：`moltbot configure --section web`，或设置 `BRAVE_API_KEY`）。
- 通过 `tools.web.search.enabled` 启用。
- 响应有缓存（默认 15 分钟）。
- 设置见 [Web 工具](/tools/web)。

### `web_fetch`
抓取并提取 URL 可读内容（HTML → markdown/text）。

核心参数：
- `url`（必填）
- `extractMode`（`markdown` | `text`）
- `maxChars`（截断长页面）

说明：
- 通过 `tools.web.fetch.enabled` 启用。
- 响应有缓存（默认 15 分钟）。
- 对 JS 重的站点，优先使用 browser 工具。
- 设置见 [Web 工具](/tools/web)。
- 可选反爬备用：见 [Firecrawl](/tools/firecrawl)。

### `browser`
控制专用 clawd 浏览器。

核心动作：
- `status`、`start`、`stop`、`tabs`、`open`、`focus`、`close`
- `snapshot`（aria/ai）
- `screenshot`（返回 image block + `MEDIA:<path>`）
- `act`（UI 动作：click/type/press/hover/drag/select/fill/resize/wait/evaluate）
- `navigate`、`console`、`pdf`、`upload`、`dialog`

配置管理：
- `profiles` — 列出所有浏览器 profile 与状态
- `create-profile` — 创建新 profile（自动分配端口或 `cdpUrl`）
- `delete-profile` — 停止浏览器、删除用户数据、移除配置（仅本地）
- `reset-profile` — 清理 profile 端口上的孤儿进程（仅本地）

常见参数：
- `profile`（可选；默认 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可选；指定节点 id/名称）
说明：
- 需 `browser.enabled=true`（默认 `true`；设 `false` 禁用）。
- 所有动作都支持 `profile` 参数用于多实例。
- 省略 `profile` 时使用 `browser.defaultProfile`（默认 "chrome"）。
- Profile 名称：仅小写字母数字 + 连字符（最长 64）。
- 端口范围：18800-18899（最多约 100 个 profile）。
- 远程 profile 仅支持 attach（无 start/stop/reset）。
- 若已连接浏览器节点，工具可能自动路由（除非固定 `target`）。
- Playwright 安装时 `snapshot` 默认 `ai`；使用 `aria` 可获取无障碍树。
- `snapshot` 支持 role-snapshot 选项（`interactive`、`compact`、`depth`、`selector`），返回 `e12` 等 ref。
- `act` 需要 `snapshot` 的 `ref`（AI snapshot 为数字 `12`，role snapshot 为 `e12`）；CSS 选择器仅在少数场景用 `evaluate`。
- 默认不要用 `act` → `wait`，仅在无可靠 UI 状态可等待时使用。
- `upload` 可附带 `ref` 自动点击后上传。
- `upload` 支持 `inputRef`（aria ref）或 `element`（CSS selector）直接设置 `<input type="file">`。

### `canvas`
驱动 node Canvas（present、eval、snapshot、A2UI）。

核心动作：
- `present`、`hide`、`navigate`、`eval`
- `snapshot`（返回 image block + `MEDIA:<path>`）
- `a2ui_push`、`a2ui_reset`

说明：
- 底层使用 gateway `node.invoke`。
- 若未指定 `node`，工具会选择默认节点（单一已连接节点或本地 mac 节点）。
- A2UI 仅支持 v0.8（无 `createSurface`）；CLI 会拒绝 v0.9 JSONL。
- 快速检查：`moltbot nodes canvas a2ui push --node <id> --text "Hello from A2UI"`。

### `nodes`
发现/定位已配对节点；发送通知；采集摄像头/屏幕。

核心动作：
- `status`、`describe`
- `pending`、`approve`、`reject`（配对）
- `notify`（macOS `system.notify`）
- `run`（macOS `system.run`）
- `camera_snap`、`camera_clip`、`screen_record`
- `location_get`

说明：
- 摄像头/屏幕命令需要节点应用在前台。
- 图片返回 image block + `MEDIA:<path>`。
- 视频返回 `FILE:<path>`（mp4）。
- 位置返回 JSON（lat/lon/accuracy/timestamp）。
- `run` 参数：`command` argv 数组；可选 `cwd`、`env`（`KEY=VAL`）、`commandTimeoutMs`、`invokeTimeoutMs`、`needsScreenRecording`。

示例（`run`）：
```json
{
  "action": "run",
  "node": "office-mac",
  "command": ["echo", "Hello"],
  "env": ["FOO=bar"],
  "commandTimeoutMs": 12000,
  "invokeTimeoutMs": 45000,
  "needsScreenRecording": false
}
```

### `image`
使用配置的图像模型分析图片。

核心参数：
- `image`（必填路径或 URL）
- `prompt`（可选；默认 "Describe the image."）
- `model`（可选覆盖）
- `maxBytesMb`（可选大小上限）

说明：
- 仅当 `agents.defaults.imageModel` 已配置（主或回退），或能从默认模型 + 认证推断图像模型时可用（尽力而为）。
- 直接使用图像模型（与主对话模型独立）。

### `message`
跨 Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams 发送消息与渠道动作。

核心动作：
- `send`（文本 + 可选媒体；MS Teams 还支持 `card`）
- `poll`（WhatsApp/Discord/MS Teams 投票）
- `react` / `reactions` / `read` / `edit` / `delete`
- `pin` / `unpin` / `list-pins`
- `permissions`
- `thread-create` / `thread-list` / `thread-reply`
- `search`
- `sticker`
- `member-info` / `role-info`
- `emoji-list` / `emoji-upload` / `sticker-upload`
- `role-add` / `role-remove`
- `channel-info` / `channel-list`
- `voice-status`
- `event-list` / `event-create`
- `timeout` / `kick` / `ban`

说明：
- `send` 的 WhatsApp 通过 Gateway 发送；其他渠道直连。
- `poll` 中 WhatsApp 与 MS Teams 走 Gateway；Discord 直接调用。
- 当 message 工具绑定到当前聊天会话时，发送会被限制在该会话目标上，避免跨上下文泄露。

### `cron`
管理 Gateway cron 任务与唤醒。

核心动作：
- `status`、`list`
- `add`、`update`、`remove`、`run`、`runs`
- `wake`（入队系统事件 + 可选立即心跳）

说明：
- `add` 需要完整的 cron 任务对象（同 `cron.add` RPC schema）。
- `update` 使用 `{ id, patch }`。

### `gateway`
重启或原地更新运行中的 Gateway 进程。

核心动作：
- `restart`（授权 + 发送 `SIGUSR1` 原地重启；`moltbot gateway` 重启）
- `config.get` / `config.schema`
- `config.apply`（校验 + 写入配置 + 重启 + 唤醒）
- `config.patch`（合并部分更新 + 重启 + 唤醒）
- `update.run`（执行更新 + 重启 + 唤醒）

说明：
- 使用 `delayMs`（默认 2000）避免中断进行中的回复。
- `restart` 默认禁用；需设置 `commands.restart: true`。

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`
列出会话、查看历史或向其他会话发送。

核心参数：
- `sessions_list`：`kinds?`、`limit?`、`activeMinutes?`、`messageLimit?`（0 = 无）
- `sessions_history`：`sessionKey`（或 `sessionId`）、`limit?`、`includeTools?`
- `sessions_send`：`sessionKey`（或 `sessionId`）、`message`、`timeoutSeconds?`（0 = fire-and-forget）
- `sessions_spawn`：`task`、`label?`、`agentId?`、`model?`、`runTimeoutSeconds?`、`cleanup?`
- `session_status`：`sessionKey?`（默认当前；可用 `sessionId`）、`model?`（`default` 清除覆盖）

说明：
- `main` 是标准直聊 key；global/unknown 会话隐藏。
- `messageLimit > 0` 会抓取每个会话最近 N 条消息（过滤工具消息）。
- `sessions_send` 在 `timeoutSeconds > 0` 时会等待完整完成。
- 投递/公告在完成后执行并尽力而为；`status: "ok"` 表示 agent 回合完成，不保证公告已投递。
- `sessions_spawn` 启动子代理并在请求方聊天中发布一条 announce 回复。
- `sessions_spawn` 为非阻塞，立即返回 `status: "accepted"`。
- `sessions_send` 会进行回复式 ping‑pong（回复 `REPLY_SKIP` 可停止；最大回合数由 `session.agentToAgent.maxPingPongTurns` 控制，0–5）。
- Ping‑pong 结束后，目标 agent 会执行**announce 步骤**；回复 `ANNOUNCE_SKIP` 可抑制公告。

### `agents_list`
列出当前会话可用于 `sessions_spawn` 的 agent id。

说明：
- 结果受每个 agent allowlist 限制（`agents.list[].subagents.allowAgents`）。
- 若配置 ` ["*"]`，工具会包含全部已配置 agent，并标记 `allowAny: true`。

## 通用参数

Gateway 后端工具（`canvas`、`nodes`、`cron`）：
- `gatewayUrl`（默认 `ws://127.0.0.1:18789`）
- `gatewayToken`（若启用鉴权）
- `timeoutMs`

Browser 工具：
- `profile`（可选；默认 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可选；指定节点 id/名称）

## 推荐的 agent 流程

浏览器自动化：
1) `browser` → `status` / `start`
2) `snapshot`（ai 或 aria）
3) `act`（click/type/press）
4) 需要视觉确认时使用 `screenshot`

Canvas 渲染：
1) `canvas` → `present`
2) `a2ui_push`（可选）
3) `snapshot`

节点定位：
1) `nodes` → `status`
2) 对目标节点 `describe`
3) `notify` / `run` / `camera_snap` / `screen_record`

## 安全

- 避免直接调用 `system.run`；仅在用户明确同意下使用 `nodes` → `run`。
- 摄像头/屏幕采集需要用户许可。
- 在调用媒体命令前使用 `status/describe` 确认权限。

## 工具如何呈现给 agent

工具通过两条并行通道暴露：

1) **系统提示文本**：可读的工具列表 + 使用指导。
2) **工具 schema**：发送给模型 API 的结构化函数定义。

因此 agent 同时看到“有哪些工具”与“如何调用”。如果某工具既不在系统提示也不在 schema 中，模型无法调用它。
