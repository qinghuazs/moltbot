---
summary: "常见 Moltbot 故障的快速排查指南"
read_when:
  - 调查运行时问题或故障
---
# 故障排查 🔧

当 Moltbot 行为异常时，这里是修复路径。

如果只想快速分诊，先看 FAQ 的 [First 60 seconds](/help/faq#first-60-seconds-if-somethings-broken)。本页更深入讲运行时故障与诊断。

提供方快速入口：[/channels/troubleshooting](/channels/troubleshooting)

## 状态与诊断

快速排查命令（按顺序）：

| 命令 | 告诉你什么 | 何时使用 |
|---|---|---|
| `moltbot status` | 本地摘要：OS + 更新、网关可达性/模式、服务、agents/sessions、provider 配置状态 | 首次检查、快速概览 |
| `moltbot status --all` | 完整本地诊断（只读、可粘贴、相对安全）含日志尾 | 需要分享调试报告时 |
| `moltbot status --deep` | 运行网关健康检查（含 provider 探测；需网关可达） | “已配置”但“不工作” |
| `moltbot gateway probe` | 网关发现 + 可达性（本地 + 远程目标） | 怀疑探测错网关时 |
| `moltbot channels status --probe` | 向运行中的网关请求通道状态（可选探测） | 网关可达但通道异常 |
| `moltbot gateway status` | 监督器状态（launchd/systemd/schtasks）、运行时 PID/退出、最近网关错误 | 服务“看起来加载了”但无进程 |
| `moltbot logs --follow` | 实时日志（运行时问题最有信号） | 需要真实失败原因 |

**分享输出：** 优先 `moltbot status --all`（会脱敏 token）。若粘贴 `moltbot status`，可先设 `CLAWDBOT_SHOW_SECRETS=0`（隐藏 token 预览）。

另见：[Health checks](/gateway/health) 与 [Logging](/logging)。

## 常见问题

### 未找到提供方 "anthropic" 的 API key

意味着 **agent 的 auth store 为空** 或缺少 Anthropic 凭据。
认证 **按 agent** 存储，新 agent 不会继承主 agent 的 key。

修复方式：
- 重新运行 onboarding 并为该 agent 选择 **Anthropic**。
- 或在 **网关主机** 粘贴 setup-token：
  ```bash
  moltbot models auth setup-token --provider anthropic
  ```
- 或将主 agent 的 `auth-profiles.json` 复制到新 agent 目录。

验证：
```bash
moltbot models status
```

### OAuth token 刷新失败（Anthropic Claude 订阅）

表示保存的 Anthropic OAuth token 已过期且刷新失败。
如果你使用 Claude 订阅（无 API key），最可靠的修复是切换到 **Claude Code setup-token** 并在 **网关主机** 粘贴。

**推荐（setup-token）：**

```bash
# 在网关主机运行（粘贴 setup-token）
moltbot models auth setup-token --provider anthropic
moltbot models status
```

如果 token 在其他机器生成：

```bash
moltbot models auth paste-token --provider anthropic
moltbot models status
```

更多细节： [Anthropic](/providers/anthropic) 与 [OAuth](/concepts/oauth)。

### Control UI 在 HTTP 上失败（"device identity required" / "connect failed"）

若通过明文 HTTP 打开仪表盘（如 `http://<lan-ip>:18789/` 或
`http://<tailscale-ip>:18789/`），浏览器处于 **不安全上下文** 且会阻止 WebCrypto，导致无法生成设备身份。

**修复：**
- 优先使用 [Tailscale Serve](/gateway/tailscale) 的 HTTPS。
- 或在网关主机本地打开：`http://127.0.0.1:18789/`。
- 若必须使用 HTTP，启用 `gateway.controlUi.allowInsecureAuth: true` 并使用网关 token（仅 token 认证；无设备身份/配对）。见
  [Control UI](/web/control-ui#insecure-http)。

### CI Secrets 扫描失败

意味着 `detect-secrets` 找到了新候选项但尚未加入 baseline。
参见 [Secret scanning](/gateway/security#secret-scanning-detect-secrets)。

### 服务已安装但未运行

网关服务已安装但进程立即退出时，服务会“看起来已加载”但没有运行。

**检查：**
```bash
moltbot gateway status
moltbot doctor
```

Doctor/服务会展示运行态（PID/最近退出）与日志提示。

**日志：**
- 首选：`moltbot logs --follow`
- 文件日志（始终）：`/tmp/moltbot/moltbot-YYYY-MM-DD.log`（或 `logging.file`）
- macOS LaunchAgent（若已安装）：`$CLAWDBOT_STATE_DIR/logs/gateway.log` 与 `gateway.err.log`
- Linux systemd（若已安装）：`journalctl --user -u moltbot-gateway[-<profile>].service -n 200 --no-pager`
- Windows：`schtasks /Query /TN "Moltbot Gateway (<profile>)" /V /FO LIST`

**开启更多日志：**
- 提高文件日志细节（持久 JSONL）：
  ```json
  { "logging": { "level": "debug" } }
  ```
- 提高控制台可见度（仅 TTY 输出）：
  ```json
  { "logging": { "consoleLevel": "debug", "consoleStyle": "pretty" } }
  ```
- 小提示：`--verbose` 只影响 **控制台** 输出。文件日志仍由 `logging.level` 控制。

详见 [/logging](/logging) 获取格式、配置与访问说明。

### “Gateway start blocked: set gateway.mode=local”

表示配置存在但 `gateway.mode` 未设置（或不是 `local`），因此 Gateway 拒绝启动。

**修复（推荐）：**
- 运行向导并将网关运行模式设置为 **Local**：
  ```bash
  moltbot configure
  ```
- 或直接设置：
  ```bash
  moltbot config set gateway.mode local
  ```

**若你想运行远程 Gateway：**
- 设置远程 URL 并保持 `gateway.mode=remote`：
  ```bash
  moltbot config set gateway.mode remote
  moltbot config set gateway.remote.url "wss://gateway.example.com"
  ```

**仅临时/开发：** 传 `--allow-unconfigured` 在未设 `gateway.mode=local` 时启动网关。

**尚无配置文件？** 运行 `moltbot setup` 创建起步配置，再启动网关。

### 服务环境（PATH + runtime）

网关服务使用 **精简 PATH** 以避免 shell/管理器污染：
- macOS：`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
- Linux：`/usr/local/bin`、`/usr/bin`、`/bin`

这会刻意排除版本管理器（nvm/fnm/volta/asdf）与包管理器（pnpm/npm），因为服务不会加载你的 shell init。`DISPLAY` 等运行时变量应放在 `~/.clawdbot/.env`（由网关早期加载）。
当 exec 在 `host=gateway` 上运行时，会把登录 shell 的 `PATH` 合并进 exec 环境，因此缺工具通常是 shell init 未导出（或设置 `tools.exec.pathPrepend`）。见 [/tools/exec](/tools/exec)。

WhatsApp + Telegram 通道需要 **Node**；Bun 不支持。若服务使用 Bun 或版本管理 Node 路径安装，请运行 `moltbot doctor` 迁移到系统 Node。

### 沙箱中技能缺 API key

**症状：** 技能在宿主机正常，但在沙箱中提示缺 API key。

**原因：** 沙箱 exec 在 Docker 内运行，**不会** 继承宿主机 `process.env`。

**修复：**
- 设置 `agents.defaults.sandbox.docker.env`（或 per-agent `agents.list[].sandbox.docker.env`）
- 或把 key 烘焙到自定义沙箱镜像中
- 然后运行 `moltbot sandbox recreate --agent <id>`（或 `--all`）

### 服务运行但端口未监听

若服务显示 **running** 但网关端口无监听，说明 Gateway 可能拒绝绑定。

**这里的 “running” 是什么**
- `Runtime: running` 表示监督器（launchd/systemd/schtasks）认为进程存活。
- `RPC probe` 表示 CLI 连接网关 WebSocket 并调用 `status` 成功。
- 始终以 `Probe target:` + `Config (service):` 为准，确认“实际探测的是什么”。

**检查：**
- `gateway.mode` 必须是 `local` 才能运行 `moltbot gateway` 与服务。
- 若设置了 `gateway.mode=remote`，**CLI 默认** 会指向远程 URL。服务可能仍本地运行，但 CLI 在探测远程。用 `moltbot gateway status` 查看服务解析端口 + 探测目标（或传 `--url`）。
- `moltbot gateway status` 与 `moltbot doctor` 会在服务看似运行但端口关闭时展示 **最近网关错误**。
- 非 loopback 绑定（`lan`/`tailnet`/`custom`，或 loopback 不可用时的 `auto`）需要认证：
  `gateway.auth.token`（或 `CLAWDBOT_GATEWAY_TOKEN`）。
- `gateway.remote.token` 只用于远程 CLI 调用；**不会** 启用本地认证。
- `gateway.token` 被忽略；请用 `gateway.auth.token`。

**若 `moltbot gateway status` 显示配置不匹配**
- `Config (cli): ...` 与 `Config (service): ...` 通常应一致。
- 若不一致，几乎可以确定你在编辑一份配置，而服务在运行另一份。
- 修复：从你期望的 `--profile` / `CLAWDBOT_STATE_DIR` 运行 `moltbot gateway install --force`。

**若 `moltbot gateway status` 报告服务配置问题**
- supervisor 配置（launchd/systemd/schtasks）缺少当前默认值。
- 修复：运行 `moltbot doctor` 更新（或 `moltbot gateway install --force` 全量重写）。

**若 `Last gateway error:` 提到 “refusing to bind … without auth”**
- 你将 `gateway.bind` 设为非 loopback（`lan`/`tailnet`/`custom` 或 loopback 不可用时的 `auto`）但未配置认证。
- 修复：设置 `gateway.auth.mode` + `gateway.auth.token`（或导出 `CLAWDBOT_GATEWAY_TOKEN`）并重启服务。

**若 `moltbot gateway status` 显示 `bind=tailnet` 但未找到 tailnet 接口**
- 网关试图绑定 Tailscale IP（100.64.0.0/10），但主机未检测到。
- 修复：在该机器上启用 Tailscale（或将 `gateway.bind` 改为 `loopback`/`lan`）。

**若 `Probe note:` 显示探测使用 loopback**
- 对 `bind=lan` 而言正常：网关监听 `0.0.0.0`（所有网卡），本地 loopback 仍可连接。
- 对远程客户端，请使用实际 LAN IP（非 `0.0.0.0`）+ 端口，并确保配置认证。

### 地址已被占用（端口 18789）

表示网关端口已被占用。

**检查：**
```bash
moltbot gateway status
```

会显示监听者与可能原因（网关已运行、SSH 隧道）。必要时停止服务或换端口。

### 检测到额外工作区目录

若从旧版本升级，磁盘上可能仍有 `~/moltbot`。
多个工作区目录会导致认证/状态漂移，因为只有一个工作区是活动的。

**修复：** 保留单一活动工作区并归档/移除其他目录。见
[Agent workspace](/concepts/agent-workspace#extra-workspace-folders)。

### 主聊天运行在沙箱工作区

症状：`pwd` 或文件工具显示 `~/.clawdbot/sandboxes/...`，而你预期的是宿主机工作区。

**原因：** `agents.defaults.sandbox.mode: "non-main"` 以 `session.mainKey`（默认 `"main"`）为判断；群/通道会话使用自己的 key，因此被视为 non-main，进入沙箱。

**修复选项：**
- 若希望 agent 使用宿主机工作区：设置 `agents.list[].sandbox.mode: "off"`。
- 若希望在沙箱内访问宿主机工作区：为该 agent 设置 `workspaceAccess: "rw"`。

### “Agent was aborted”

agent 在回复过程中被中断。

**原因：**
- 用户发送了 `stop`、`abort`、`esc`、`wait` 或 `exit`
- 超时
- 进程崩溃

**修复：** 直接再发送一条消息，会话仍会继续。

### “Agent failed before reply: Unknown model: anthropic/claude-haiku-3-5”

Moltbot 会拒绝 **较旧/不安全模型**（更易被 prompt injection 影响）。出现该错误说明模型名不再受支持。

**修复：**
- 选择该 provider 的 **最新** 模型并更新配置或 model alias。
- 不确定可用模型时，运行 `moltbot models list` 或 `moltbot models scan` 选择支持的。
- 查看 gateway 日志以获取详细原因。

另见：[Models CLI](/cli/models) 与 [Model providers](/concepts/model-providers)。

### 消息未触发

**检查 1：** 发送者是否在 allowlist？
```bash
moltbot status
```
查看输出中的 `AllowFrom: ...`。

**检查 2：** 群聊是否要求提及？
```bash
# 消息必须匹配 mentionPatterns 或显式提及；默认值位于 channels 的 groups/guilds。
# 多 agent：`agents.list[].groupChat.mentionPatterns` 覆盖全局。
grep -n "agents\\|groupChat\\|mentionPatterns\\|channels\\.whatsapp\\.groups\\|channels\\.telegram\\.groups\\|channels\\.imessage\\.groups\\|channels\\.discord\\.guilds" \
  "${CLAWDBOT_CONFIG_PATH:-$HOME/.clawdbot/moltbot.json}"
```

**检查 3：** 看日志
```bash
moltbot logs --follow
# 或快速筛选：
tail -f "$(ls -t /tmp/moltbot/moltbot-*.log | head -1)" | grep "blocked\\|skip\\|unauthorized"
```

### 配对码未到达

若 `dmPolicy` 为 `pairing`，未知发送者应收到配对码，且消息会被忽略直至审批。

**检查 1：** 是否已有待处理请求？
```bash
moltbot pairing list <channel>
```

默认每个渠道待处理 DM 配对请求 **最多 3 个**。若列表已满，新请求不会生成配对码，直到有请求被批准或过期。

**检查 2：** 是否创建了请求但未发送回复？
```bash
moltbot logs --follow | grep "pairing request"
```

**检查 3：** 确认该渠道 `dmPolicy` 不是 `open`/`allowlist`。

### 图片 + 提及无效

已知问题：当只发送图片 + 提及（无其他文本）时，WhatsApp 有时不包含提及元数据。

**变通：** 在提及旁加文本：
- ❌ `@clawd` + 图片
- ✅ `@clawd check this` + 图片

### 会话未续接

**检查 1：** 会话文件是否存在？
```bash
ls -la ~/.clawdbot/agents/<agentId>/sessions/
```

**检查 2：** 重置窗口是否过短？
```json
{
  "session": {
    "reset": {
      "mode": "daily",
      "atHour": 4,
      "idleMinutes": 10080  // 7 days
    }
  }
}
```

**检查 3：** 是否有人发送 `/new`、`/reset` 或重置触发器？

### Agent 超时

默认超时 30 分钟。长任务：

```json
{
  "reply": {
    "timeoutSeconds": 3600  // 1 hour
  }
}
```

或使用 `process` 工具将长命令转后台。

### WhatsApp 断开

```bash
# 查看本地状态（creds、sessions、队列事件）
moltbot status
# 探测运行中的网关 + 通道（WA 连接 + Telegram + Discord APIs）
moltbot status --deep

# 查看最近连接事件
moltbot logs --limit 200 | grep "connection\\|disconnect\\|logout"
```

**修复：** Gateway 运行后通常会自动重连。若仍卡住，重启 Gateway 进程（按你的监督方式），或手动启动并开启 verbose：

```bash
moltbot gateway --verbose
```

若已登出 / 解绑：

```bash
moltbot channels logout
trash "${CLAWDBOT_STATE_DIR:-$HOME/.clawdbot}/credentials" # 若 logout 无法完全清理
moltbot channels login --verbose       # 重新扫码
```

### 媒体发送失败

**检查 1：** 文件路径是否正确？
```bash
ls -la /path/to/your/image.jpg
```

**检查 2：** 是否过大？
- 图片：最大 6MB
- 音频/视频：最大 16MB  
- 文档：最大 100MB

**检查 3：** 查看媒体日志
```bash
grep "media\\|fetch\\|download" "$(ls -t /tmp/moltbot/moltbot-*.log | head -1)" | tail -20
```

### 高内存占用

Moltbot 会把对话历史保存在内存中。

**修复：** 定期重启或设置会话限制：
```json
{
  "session": {
    "historyLimit": 100  // 保留的最大消息数
  }
}
```

## 常见排障

### “Gateway 无法启动 —— 配置无效”

当配置包含未知键、值格式错误或类型无效时，Moltbot 会拒绝启动。
这对安全来说是刻意的。

用 Doctor 修复：
```bash
moltbot doctor
moltbot doctor --fix
```

说明：
- `moltbot doctor` 会报告每个无效项。
- `moltbot doctor --fix` 会应用迁移/修复并重写配置。
- 即便配置无效，诊断命令如 `moltbot logs`、`moltbot health`、`moltbot status`、`moltbot gateway status`、`moltbot gateway probe` 仍可运行。

### “All models failed” —— 先检查什么？

- **凭据**：正在尝试的 provider 是否有凭据（auth profiles + env vars）。
- **模型路由**：确认 `agents.defaults.model.primary` 与 fallback 是你可访问的模型。
- **Gateway 日志**：`/tmp/moltbot/…` 中的 provider 错误原因。
- **模型状态**：使用 `/model status`（聊天）或 `moltbot models status`（CLI）。

### 我在个人 WhatsApp 号码上运行 —— 为什么自聊很奇怪？

启用自聊模式并 allowlist 自己的号码：

```json5
{
  channels: {
    whatsapp: {
      selfChatMode: true,
      dmPolicy: "allowlist",
      allowFrom: ["+15555550123"]
    }
  }
}
```

见 [WhatsApp setup](/channels/whatsapp)。

### WhatsApp 把我登出，如何重新认证？

重新执行登录并扫码：

```bash
moltbot channels login
```

### main 分支构建错误 —— 标准修复路径？

1) `git pull origin main && pnpm install`
2) `moltbot doctor`
3) 查看 GitHub issues 或 Discord
4) 临时方案：检出旧提交

### npm install 失败（allow-build-scripts / 缺 tar 或 yargs）怎么办？

若从源码运行，请使用仓库指定包管理器：**pnpm**（推荐）。
仓库声明 `packageManager: "pnpm@…"`。

典型恢复：
```bash
git status   # 确认在仓库根目录
pnpm install
pnpm build
moltbot doctor
moltbot gateway restart
```

原因：pnpm 是该仓库配置的包管理器。

### 如何在 git 安装与 npm 安装之间切换？

使用 **网站安装器**，通过 flag 选择安装方式。它会原地升级并重写 gateway 服务指向新的安装。

切换到 **git 安装**：
```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --install-method git --no-onboard
```

切换到 **npm 全局**：
```bash
curl -fsSL https://molt.bot/install.sh | bash
```

说明：
- git 流程仅在仓库干净时 rebase；请先 commit 或 stash 变更。
- 切换后运行：
  ```bash
  moltbot doctor
  moltbot gateway restart
  ```

### Telegram block streaming 没有在工具调用之间拆分文本，为什么？

Block streaming 只发送 **完成的文本块**。常见原因：
- `agents.defaults.blockStreamingDefault` 仍是 `"off"`。
- `channels.telegram.blockStreaming` 设为 `false`。
- `channels.telegram.streamMode` 为 `partial` 或 `block` **且草稿流式开启**（私聊 + topics）。此时草稿流式会禁用 block streaming。
- `minChars` / coalesce 设置过高，导致 chunk 合并。
- 模型只输出一个大的文本块（无中途 flush）。

修复清单：
1) 把 block streaming 设置放在 `agents.defaults` 下，而不是根级。
2) 若需要真正的多消息块回复，将 `channels.telegram.streamMode: "off"`。
3) 调试时使用更小的 chunk/coalesce 阈值。

见 [Streaming](/concepts/streaming)。

### Discord 在服务器中不回复，即便 `requireMention: false`，为什么？

`requireMention` 只控制 allowlist 通过后的提及门槛。
默认 `channels.discord.groupPolicy` 是 **allowlist**，因此必须显式允许 guild。
如果你设置了 `channels.discord.guilds.<guildId>.channels`，则仅允许列出的频道；省略则允许所有频道。

修复清单：
1) 设置 `channels.discord.groupPolicy: "open"` **或** 添加 guild allowlist 条目（可选 channel allowlist）。
2) 使用 **数字频道 ID** 填在 `channels.discord.guilds.<guildId>.channels`。
3) 将 `requireMention: false` 放在 `channels.discord.guilds` **下**（全局或按频道）。
   顶层 `channels.discord.requireMention` 并非支持键。
4) 确保 bot 拥有 **Message Content Intent** 与频道权限。
5) 运行 `moltbot channels status --probe` 获取审计提示。

文档： [Discord](/channels/discord)、[Channels troubleshooting](/channels/troubleshooting)。

### Cloud Code Assist API 报错：invalid tool schema (400)。怎么办？

这几乎都是 **工具 schema 兼容性** 问题。Cloud Code Assist 端点只接受 JSON Schema 的严格子集。Moltbot 在当前 `main` 中会清理/规范化工具 schema，但该修复尚未在最后一个版本中发布（截至 2026-01-13）。

修复清单：
1) **更新 Moltbot**：
   - 可从源码运行则拉取 `main` 并重启网关。
   - 否则等待下一个包含 schema scrubber 的版本。
2) 避免不支持的关键词，如 `anyOf/oneOf/allOf`、`patternProperties`、
   `additionalProperties`、`minLength`、`maxLength`、`format` 等。
3) 若定义自定义工具，顶层 schema 保持 `type: "object"`，包含 `properties` 与简单 enum。

见 [Tools](/tools) 与 [TypeBox schemas](/concepts/typebox)。

## macOS 特定问题

### 授权权限（语音/麦克风）时崩溃

当点击隐私弹窗 “允许” 时应用退出或显示 “Abort trap 6”：

**修复 1：重置 TCC 缓存**
```bash
tccutil reset All bot.molt.mac.debug
```

**修复 2：强制新 Bundle ID**
若重置无效，修改 [`scripts/package-mac-app.sh`](https://github.com/moltbot/moltbot/blob/main/scripts/package-mac-app.sh) 中的 `BUNDLE_ID`（如追加 `.test` 后缀）并重新构建。这样 macOS 会将其视为新应用。

### Gateway 卡在 “Starting...”

应用连接本地 18789 端口的网关。若一直卡住：

**修复 1：停止监督器（推荐）**
若网关由 launchd 监督，杀掉 PID 会被自动重启。先停止监督器：
```bash
moltbot gateway status
moltbot gateway stop
# 或：launchctl bootout gui/$UID/bot.molt.gateway（替换为 bot.molt.<profile>；遗留 com.clawdbot.* 仍可用）
```

**修复 2：端口被占用（找监听）**
```bash
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

若为非监督进程，先尝试优雅停止再升级：
```bash
kill -TERM <PID>
sleep 1
kill -9 <PID> # 最后手段
```

**修复 3：检查 CLI 安装**
确保全局 `moltbot` CLI 已安装且版本与应用匹配：
```bash
moltbot --version
npm install -g moltbot@<version>
```

## 调试模式

开启详细日志：

```bash
# 在配置中开启 trace：
#   ${CLAWDBOT_CONFIG_PATH:-$HOME/.clawdbot/moltbot.json} -> { logging: { level: "trace" } }
#
# 然后用 verbose 命令将 debug 输出镜像到 stdout：
moltbot gateway --verbose
moltbot channels login --verbose
```

## 日志位置

| 日志 | 位置 |
|-----|----------|
| Gateway 文件日志（结构化） | `/tmp/moltbot/moltbot-YYYY-MM-DD.log`（或 `logging.file`） |
| Gateway 服务日志（监督器） | macOS：`$CLAWDBOT_STATE_DIR/logs/gateway.log` + `gateway.err.log`（默认：`~/.clawdbot/logs/...`；profile 使用 `~/.clawdbot-<profile>/logs/...`）<br />Linux：`journalctl --user -u moltbot-gateway[-<profile>].service -n 200 --no-pager`<br />Windows：`schtasks /Query /TN "Moltbot Gateway (<profile>)" /V /FO LIST` |
| 会话文件 | `$CLAWDBOT_STATE_DIR/agents/<agentId>/sessions/` |
| 媒体缓存 | `$CLAWDBOT_STATE_DIR/media/` |
| 凭据 | `$CLAWDBOT_STATE_DIR/credentials/` |

## 健康检查

```bash
# 监督器 + 探测目标 + 配置路径
moltbot gateway status
# 包含系统级扫描（遗留/额外服务、端口监听）
moltbot gateway status --deep

# 网关可达吗？
moltbot health --json
# 若失败，带连接细节重试：
moltbot health --verbose

# 默认端口是否有监听？
lsof -nP -iTCP:18789 -sTCP:LISTEN

# 最近活动（RPC 日志尾）
moltbot logs --follow
# 若 RPC 不通，使用兜底
tail -20 /tmp/moltbot/moltbot-*.log
```

## 重置一切

核弹方案：

```bash
moltbot gateway stop
# 如果安装了服务并希望干净卸载：
# moltbot gateway uninstall

trash "${CLAWDBOT_STATE_DIR:-$HOME/.clawdbot}"
moltbot channels login         # 重新配对 WhatsApp
moltbot gateway restart           # 或：moltbot gateway
```

⚠️ 这会丢失所有会话，并需要重新配对 WhatsApp。

## 获取帮助

1. 先看日志：`/tmp/moltbot/`（默认：`moltbot-YYYY-MM-DD.log`，或配置的 `logging.file`）
2. 在 GitHub 搜索已有 issues
3. 创建新 issue，包含：
   - Moltbot 版本
   - 相关日志片段
   - 复现步骤
   - 你的配置（脱敏机密！）

---

*“Have you tried turning it off and on again?”* — 每一位 IT 从业者

🦞🔧

### 浏览器无法启动（Linux）

若看到 "Failed to start Chrome CDP on port 18800"：

**最可能原因：** Ubuntu 的 Snap 版 Chromium。

**快速修复：** 改装 Google Chrome：
```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
```

然后在配置中设置：
```json
{
  "browser": {
    "executablePath": "/usr/bin/google-chrome-stable"
  }
}
```

**完整指南：** 见 [browser-linux-troubleshooting](/tools/browser-linux-troubleshooting)
