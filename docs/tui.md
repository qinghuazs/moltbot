---
summary: "终端 UI（TUI）：从任意机器连接 Gateway"
read_when:
  - 需要 TUI 的入门教程
  - 需要 TUI 功能、命令与快捷键的完整清单
---
# TUI（终端 UI）

## 快速开始
1) 启动 Gateway。
```bash
moltbot gateway
```
2) 打开 TUI。
```bash
moltbot tui
```
3) 输入消息并回车。

远程 Gateway：
```bash
moltbot tui --url ws://<host>:<port> --token <gateway-token>
```
若 Gateway 使用密码认证，请使用 `--password`。

## 你会看到什么
- Header：连接 URL、当前 agent、当前 session。
- 聊天记录：用户消息、助手回复、系统提示、工具卡片。
- 状态行：连接/运行状态（connecting、running、streaming、idle、error）。
- Footer：连接状态 + agent + session + model + think/verbose/reasoning + token 计数 + deliver。
- 输入：带自动补全的文本编辑器。

## 心智模型：agents + sessions
- Agents 是唯一标识（如 `main`、`research`）。Gateway 会暴露列表。
- Sessions 属于当前 agent。
- Session key 以 `agent:<agentId>:<sessionKey>` 形式存储。
  - 若输入 `/session main`，TUI 会展开为 `agent:<currentAgent>:main`。
  - 若输入 `/session agent:other:main`，会显式切换到该 agent 会话。
- Session scope：
  - `per-sender`（默认）：每个 agent 有多个 session。
  - `global`：TUI 始终使用 `global` session（选择器可能为空）。
- 当前 agent + session 始终显示在 footer。

## 发送与投递
- 消息会发送到 Gateway；对 provider 的投递默认关闭。
- 开启投递：
  - `/deliver on`
  - 或 Settings 面板
  - 或用 `moltbot tui --deliver` 启动

## 选择器与浮层
- Model picker：列出可用模型并设置会话覆盖。
- Agent picker：切换 agent。
- Session picker：仅显示当前 agent 的 sessions。
- Settings：切换投递、工具输出展开、thinking 可见性。

## 快捷键
- Enter：发送消息
- Esc：中断当前运行
- Ctrl+C：清空输入（按两次退出）
- Ctrl+D：退出
- Ctrl+L：模型选择器
- Ctrl+G：agent 选择器
- Ctrl+P：session 选择器
- Ctrl+O：切换工具输出展开
- Ctrl+T：切换 thinking 可见性（会重载历史）

## Slash 命令
核心：
- `/help`
- `/status`
- `/agent <id>`（或 `/agents`）
- `/session <key>`（或 `/sessions`）
- `/model <provider/model>`（或 `/models`）

会话控制：
- `/think <off|minimal|low|medium|high>`
- `/verbose <on|full|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>`（别名：`/elev`）
- `/activation <mention|always>`
- `/deliver <on|off>`

会话生命周期：
- `/new` 或 `/reset`（重置会话）
- `/abort`（中断运行）
- `/settings`
- `/exit`

其他 Gateway slash 命令（如 `/context`）会转发给 Gateway 并以系统输出显示。见 [Slash commands](/tools/slash-commands)。

## 本地 shell 命令
- 以 `!` 开头可在 TUI 主机本地执行 shell 命令。
- TUI 每个会话只会询问一次是否允许本地执行；拒绝后该会话中 `!` 将保持禁用。
- 命令在一个全新的非交互 shell 中运行（不持久化 `cd`/env）。
- 单独的 `!` 会作为普通消息发送；前导空格不会触发本地执行。

## 工具输出
- 工具调用显示为卡片，包含参数 + 结果。
- Ctrl+O 在折叠/展开间切换。
- 工具运行时，增量更新会流入同一张卡片。

## 历史与流式
- 连接时，TUI 会加载最新历史（默认 200 条）。
- 流式回复会原位更新直至完成。
- TUI 也会监听 agent 工具事件，渲染更丰富的工具卡片。

## 连接细节
- TUI 以 `mode: "tui"` 注册到 Gateway。
- 断线重连会显示系统消息；事件缺口会提示在日志中。

## 选项
- `--url <url>`：Gateway WebSocket URL（默认来自配置或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway token（如需）
- `--password <password>`：Gateway 密码（如需）
- `--session <key>`：session key（默认 `main`，global scope 时为 `global`）
- `--deliver`：将助手回复投递到 provider（默认关闭）
- `--thinking <level>`：发送时覆盖 thinking 级别
- `--timeout-ms <ms>`：agent 超时（默认 `agents.defaults.timeoutSeconds`）

## 故障排查

发送后无输出：
- 在 TUI 内运行 `/status` 确认 Gateway 已连接且空闲/忙。
- 查看 Gateway 日志：`moltbot logs --follow`。
- 确认 agent 可运行：`moltbot status` 与 `moltbot models status`。
- 若期望在聊天渠道中看到消息，开启投递（`/deliver on` 或 `--deliver`）。
- `--history-limit <n>`：加载的历史条数（默认 200）

## 故障排查
- `disconnected`：确认 Gateway 运行且 `--url/--token/--password` 正确。
- 选择器无 agents：检查 `moltbot agents list` 与路由配置。
- session 选择器为空：可能处于 global scope 或尚无会话。
