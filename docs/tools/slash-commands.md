---
summary: "斜杠命令：文本 vs 原生、配置与支持的命令"
read_when:
  - 使用或配置聊天命令
  - 排查命令路由或权限
---
# 斜杠命令

命令由 Gateway 处理。大多数命令必须作为**独立**消息发送，并以 `/` 开头。
仅主机 bash 聊天命令使用 `! <cmd>`（`/bash <cmd>` 为别名）。

有两套相关系统：

- **Commands**：独立的 `/...` 消息。
- **Directives**：`/think`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - Directives 会在模型看到消息前被剥离。
  - 在普通聊天消息（非仅指令）中，它们作为“内联提示”处理，**不**持久化会话设置。
  - 在仅指令消息中，它们会持久化到会话，并返回确认消息。
  - Directives 仅对**授权发送者**生效（渠道 allowlist/配对 + `commands.useAccessGroups`）。
    未授权发送者会把它们当普通文本。

还有少量**内联快捷指令**（仅 allowlist/授权发送者）：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
它们会立即执行，在模型看到消息前被剥离，剩余文本继续正常流程。

## 配置

```json5
{
  commands: {
    native: "auto",
    nativeSkills: "auto",
    text: true,
    bash: false,
    bashForegroundMs: 2000,
    config: false,
    debug: false,
    restart: false,
    useAccessGroups: true
  }
}
```

- `commands.text`（默认 `true`）启用聊天消息中的 `/...` 解析。
  - 对于不支持原生命令的渠道（WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams），即便设置为 `false`，文本命令仍可使用。
- `commands.native`（默认 `"auto"`）注册原生命令。
  - Auto：Discord/Telegram 开启；Slack 关闭（除非你添加 slash commands）；对不支持原生的 provider 忽略。
  - 使用 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 按 provider 覆盖（bool 或 `"auto"`）。
  - `false` 会在启动时清除 Discord/Telegram 已注册命令。Slack 命令由 Slack 应用管理，不会自动移除。
- `commands.nativeSkills`（默认 `"auto"`）在支持的渠道注册**技能**命令。
  - Auto：Discord/Telegram 开启；Slack 关闭（Slack 每个技能需要单独创建一个 slash command）。
  - 使用 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 覆盖（bool 或 `"auto"`）。
- `commands.bash`（默认 `false`）启用 `! <cmd>` 执行宿主 shell 命令（`/bash <cmd>` 为别名；需要 `tools.elevated` allowlist）。
- `commands.bashForegroundMs`（默认 `2000`）控制 bash 多久后切换为后台（`0` 立即后台）。
- `commands.config`（默认 `false`）启用 `/config`（读取/写入 `moltbot.json`）。
- `commands.debug`（默认 `false`）启用 `/debug`（仅运行时覆盖）。
- `commands.useAccessGroups`（默认 `true`）对命令强制执行 allowlist/策略。

## 命令列表

文本 + 原生（启用时）：
- `/help`
- `/commands`
- `/skill <name> [input]`（按名称运行技能）
- `/status`（显示当前状态；含当前模型提供方用量/配额，如可用）
- `/allowlist`（列出/添加/移除 allowlist 条目）
- `/approve <id> allow-once|allow-always|deny`（处理 exec 审批请求）
- `/context [list|detail|json]`（解释“上下文”；`detail` 显示每文件/每工具/每技能/系统提示大小）
- `/whoami`（显示你的 sender id；别名 `/id`）
- `/subagents list|stop|log|info|send`（查看、停止、日志或发送子代理运行）
- `/config show|get|set|unset`（持久化配置到磁盘，仅 owner；需要 `commands.config: true`）
- `/debug show|set|unset|reset`（运行时覆盖，仅 owner；需要 `commands.debug: true`）
- `/usage off|tokens|full|cost`（每条回复用量尾注或本地成本汇总）
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio`（控制 TTS；见 [/tts](/tts)）
  - Discord：原生命令为 `/voice`（Discord 保留 `/tts`）；文本 `/tts` 仍可用。
- `/stop`
- `/restart`
- `/dock-telegram`（别名 `/dock_telegram`）（切换回复到 Telegram）
- `/dock-discord`（别名 `/dock_discord`）（切换回复到 Discord）
- `/dock-slack`（别名 `/dock_slack`）（切换回复到 Slack）
- `/activation mention|always`（仅群聊）
- `/send on|off|inherit`（仅 owner）
- `/reset` 或 `/new [model]`（可选模型提示；剩余文本会继续传递）
- `/think <off|minimal|low|medium|high|xhigh>`（按模型/provider 动态；别名 `/thinking`、`/t`）
- `/verbose on|full|off`（别名 `/v`）
- `/reasoning on|off|stream`（别名 `/reason`；开启时单独发送 `Reasoning:` 消息；`stream` = Telegram 草稿）
- `/elevated on|off|ask|full`（别名 `/elev`；`full` 跳过 exec 审批）
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`（发送 `/exec` 可查看当前设置）
- `/model <name>`（别名 `/models`；或 `/<alias>` 来自 `agents.defaults.models.*.alias`）
- `/queue <mode>`（可带 `debounce:2s cap:25 drop:summarize` 等；发送 `/queue` 查看当前）
- `/bash <command>`（仅宿主；`! <command>` 别名；需 `commands.bash: true` + `tools.elevated` allowlist）

仅文本：
- `/compact [instructions]`（见 [/concepts/compaction](/concepts/compaction)）
- `! <command>`（仅宿主；一次一个；长任务用 `!poll` + `!stop`）
- `!poll`（检查输出/状态；可选 `sessionId`；`/bash poll` 同样可用）
- `!stop`（停止 bash 任务；可选 `sessionId`；`/bash stop` 同样可用）

说明：
- 命令可在命令与参数间加可选 `:`（如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 可接受模型别名、`provider/model` 或 provider 名称（模糊匹配）；若未匹配，文本会作为消息正文。
- 完整 provider 用量详见 `moltbot status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 且遵循渠道 `configWrites`。
- `/usage` 控制每条回复用量尾注；`/usage cost` 输出 Moltbot 会话日志的本地成本汇总。
- `/restart` 默认禁用；设置 `commands.restart: true` 启用。
- `/verbose` 用于调试与可见性；正常使用应保持 **off**。
- `/reasoning`（及 `/verbose`）在群聊中风险较高：可能泄露内部推理或工具输出。群聊建议关闭。
- **快速路径：** allowlist 发送者的纯命令消息会立即处理（绕过队列 + 模型）。
- **群聊提及门控：** allowlist 发送者的纯命令消息会绕过提及要求。
- **内联快捷指令（仅 allowlist 发送者）：** 部分命令可内联在普通消息中并在模型前被剥离。
  - 示例：`hey /status` 会触发状态回复，剩余文本继续正常流程。
- 当前支持：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未授权的纯命令消息会被静默忽略；内联 `/...` token 视为普通文本。
- **技能命令：** `user-invocable` 技能会暴露为斜杠命令。名称会清理为 `a-z0-9_`（最长 32）；冲突会添加数字后缀（如 `_2`）。
  - `/skill <name> [input]` 按名称运行技能（当原生命令配额不足时很有用）。
  - 默认会把技能命令作为普通请求转给模型。
  - 技能可声明 `command-dispatch: tool`，将命令直接路由到工具（确定性，无模型）。
  - 示例：`/prose`（OpenProse 插件）— 见 [OpenProse](/prose)。
- **原生命令参数：** Discord 对动态选项有自动补全（缺少必填参数时提供按钮菜单）。Telegram 与 Slack 在命令支持选项时，会在缺少参数时显示按钮菜单。

## 使用场景展示（在哪显示什么）

- **Provider 用量/配额**（如 “Claude 80% left”）会在启用用量跟踪时显示在 `/status`（针对当前模型提供方）。
- **每条回复 tokens/cost** 由 `/usage off|tokens|full` 控制（追加到正常回复）。
- `/model status` 关注 **models/auth/endpoints**，不是用量。

## 模型选择（`/model`）

`/model` 以指令实现。

示例：

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model opus@anthropic:default
/model status
```

说明：
- `/model` 与 `/model list` 显示紧凑编号选择器（模型家族 + 可用 provider）。
- `/model <#>` 从选择器中选择（尽可能优先当前 provider）。
- `/model status` 显示详细视图，包括 provider endpoint（`baseUrl`）与 API 模式（`api`）等信息。

## Debug 覆盖

`/debug` 可设置**仅运行时**配置覆盖（内存态，不写盘）。仅 owner。默认禁用，需 `commands.debug: true`。

示例：

```
/debug show
/debug set messages.responsePrefix="[moltbot]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

说明：
- 覆盖会立即生效，但**不会**写入 `moltbot.json`。
- 使用 `/debug reset` 清除所有覆盖，回退到磁盘配置。

## 配置更新

`/config` 会写入磁盘配置（`moltbot.json`）。仅 owner。默认禁用，需 `commands.config: true`。

示例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[moltbot]"
/config unset messages.responsePrefix
```

说明：
- 写入前会验证配置；无效变更会被拒绝。
- `/config` 更新在重启后仍有效。

## 渠道说明

- **文本命令** 在正常聊天会话中执行（私聊共享 `main`，群聊有独立会话）。
- **原生命令** 使用隔离会话：
  - Discord：`agent:<agentId>:discord:slash:<userId>`
  - Slack：`agent:<agentId>:slack:slash:<userId>`（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）
  - Telegram：`telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 目标到聊天会话）
- **`/stop`** 针对当前聊天会话，用于中止当前运行。
- **Slack：** `channels.slack.slashCommand` 仍支持单个 `/clawd` 风格命令。若启用 `commands.native`，需在 Slack 应用中为每个内置命令创建一个 slash command（名称与 `/help` 列表一致）。Slack 的命令参数菜单以 ephemeral Block Kit 按钮提供。
