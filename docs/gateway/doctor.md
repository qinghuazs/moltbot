---
summary: "Doctor 命令：健康检查、配置迁移与修复步骤"
read_when:
  - 添加或修改 doctor 迁移
  - 引入破坏性配置变更
---
# Doctor

`moltbot doctor` 是 Moltbot 的修复 + 迁移工具。它修复陈旧配置/状态、检查健康状况，并提供可执行的修复步骤。

## 快速开始

```bash
moltbot doctor
```

### 无界面 / 自动化

```bash
moltbot doctor --yes
```

接受默认项（包含适用的重启/服务/沙箱修复步骤）。

```bash
moltbot doctor --repair
```

无提示地应用推荐修复（在安全时包含重启）。

```bash
moltbot doctor --repair --force
```

也应用更激进的修复（会覆盖自定义 supervisor 配置）。

```bash
moltbot doctor --non-interactive
```

无提示运行，仅应用安全迁移（配置规范化 + 磁盘状态移动）。跳过需要人工确认的重启/服务/沙箱操作。
检测到遗留状态迁移时会自动执行。

```bash
moltbot doctor --deep
```

扫描系统服务中是否存在额外网关安装（launchd/systemd/schtasks）。

如果想先查看改动再写入，请先打开配置文件：

```bash
cat ~/.clawdbot/moltbot.json
```

## 它会做什么（摘要）
- 可选的 git 安装预更新（仅交互）。
- UI 协议新鲜度检查（当协议 schema 更新时重建 Control UI）。
- 健康检查 + 重启提示。
- Skills 状态摘要（可用/缺失/被阻止）。
- 旧值形态的配置规范化。
- OpenCode Zen provider 覆盖警告（`models.providers.opencode`）。
- 遗留磁盘状态迁移（会话/agent 目录/WhatsApp 认证）。
- 状态完整性与权限检查（会话、转录、状态目录）。
- 本地运行时的配置文件权限检查（chmod 600）。
- 模型认证健康：检查 OAuth 过期，可刷新即将过期 token，并报告 auth-profile 冷却/禁用状态。
- 额外工作区目录检测（`~/moltbot`）。
- 沙箱镜像修复（启用沙箱时）。
- 遗留服务迁移与额外网关检测。
- 网关运行态检查（服务已安装但未运行；缓存的 launchd label）。
- 通道状态警告（从运行中的网关探测）。
- Supervisor 配置审计（launchd/systemd/schtasks）并可修复。
- 网关运行时最佳实践检查（Node vs Bun、版本管理器路径）。
- 网关端口冲突诊断（默认 `18789`）。
- 开放 DM 策略的安全警告。
- 本地模式未设置 `gateway.auth.token` 的安全警告（可生成 token）。
- Linux 下的 systemd linger 检查。
- 源码安装检查（pnpm workspace 不匹配、缺失 UI 资产、缺失 tsx 二进制）。
- 写入更新后的配置 + 向导元数据。

## 详细行为与说明

### 0）可选更新（git 安装）
若为 git checkout 且以交互方式运行，doctor 会在执行前提供更新（fetch/rebase/build）的选项。

### 1）配置规范化
若配置包含遗留值形态（例如 `messages.ackReaction` 没有按渠道覆盖），doctor 会将其规范化为当前 schema。

### 2）遗留配置键迁移
当配置包含弃用键时，其他命令会拒绝运行并提示你执行 `moltbot doctor`。

Doctor 会：
- 说明发现了哪些遗留键。
- 展示应用的迁移。
- 用更新后的 schema 重写 `~/.clawdbot/moltbot.json`。

当 Gateway 启动检测到遗留配置格式时，也会自动运行 doctor 迁移，因此无需手动介入就能修复陈旧配置。

当前迁移：
- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → 顶层 `bindings`
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*`（tools/elevated/exec/sandbox/subagents）
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`

### 2b）OpenCode Zen provider 覆盖
如果你手动添加了 `models.providers.opencode`（或 `opencode-zen`），它会覆盖 `@mariozechner/pi-ai` 内置的 OpenCode Zen 目录。
这会强制所有模型走单一 API 或清零成本。Doctor 会提醒你移除覆盖，以恢复按模型路由与成本。

### 3）遗留状态迁移（磁盘布局）
Doctor 可将旧磁盘布局迁移到当前结构：
- 会话存储 + 转录：
  - 从 `~/.clawdbot/sessions/` 到 `~/.clawdbot/agents/<agentId>/sessions/`
- Agent 目录：
  - 从 `~/.clawdbot/agent/` 到 `~/.clawdbot/agents/<agentId>/agent/`
- WhatsApp 认证状态（Baileys）：
  - 从遗留 `~/.clawdbot/credentials/*.json`（除 `oauth.json`）
  - 到 `~/.clawdbot/credentials/whatsapp/<accountId>/...`（默认 account id：`default`）

这些迁移尽力而为且幂等；doctor 在保留旧目录作为备份时会发出警告。Gateway/CLI 也会在启动时自动迁移遗留会话 + agent 目录，使历史/认证/模型落在 per-agent 路径，无需手动 doctor。WhatsApp 认证仅通过 `moltbot doctor` 迁移。

### 4）状态完整性检查（会话持久化、路由与安全）
状态目录是运行的“脑干”。一旦消失，会丢失会话、凭据、日志与配置（除非有外部备份）。

Doctor 检查：
- **状态目录缺失**：提示严重状态丢失，提示重建目录，并提醒无法恢复缺失数据。
- **状态目录权限**：检查可写性；可修复权限（当检测到 owner/group 不匹配时给出 `chown` 提示）。
- **会话目录缺失**：`sessions/` 与会话存储目录是持久化历史、避免 `ENOENT` 崩溃的必需项。
- **转录不匹配**：当最近会话条目缺少转录文件时警告。
- **主会话“单行 JSONL”**：当主转录仅一行时告警（历史未累积）。
- **多个状态目录**：当多个 `~/.clawdbot` 目录存在或 `CLAWDBOT_STATE_DIR` 指向其他位置时告警（历史可能分裂）。
- **远程模式提示**：若 `gateway.mode=remote`，doctor 会提醒在远端主机运行（状态在远端）。
- **配置文件权限**：若 `~/.clawdbot/moltbot.json` 具备组/全局可读，发出警告并提示收紧到 `600`。

### 5）模型认证健康（OAuth 过期）
Doctor 会检查 auth store 中的 OAuth 配置，提示即将过期/已过期，并在安全时可刷新。若 Anthropic Claude Code 配置已过期，会建议运行 `claude setup-token`（或粘贴 setup-token）。刷新提示仅在交互（TTY）时出现；`--non-interactive` 会跳过刷新。

Doctor 也会报告临时不可用的 auth profile：
- 短暂冷却（限流/超时/认证失败）
- 较长禁用（计费/额度失败）

### 6）Hooks 模型校验
若设置了 `hooks.gmail.model`，doctor 会针对目录与 allowlist 校验模型引用，无法解析或被禁止时发出警告。

### 7）沙箱镜像修复
启用沙箱时，doctor 会检查 Docker 镜像，并在缺失时提示构建或切换为旧名称。

### 8）Gateway 服务迁移与清理提示
Doctor 会检测遗留网关服务（launchd/systemd/schtasks），并提示移除并使用当前网关端口安装 Moltbot 服务。它还会扫描额外的 gateway 类服务并给出清理提示。带 profile 名的 Moltbot gateway 服务被视为一等公民，不会标为“额外”。

### 9）安全警告
当某 provider 允许 DM 但未设置 allowlist，或策略配置危险时，doctor 会提示警告。

### 10）systemd linger（Linux）
若以 systemd user service 运行，doctor 确保启用 lingering，使 gateway 在注销后仍存活。

### 11）Skills 状态
Doctor 会打印当前工作区可用/缺失/被阻止技能的简要摘要。

### 12）Gateway 认证检查（本地 token）
若本地 gateway 缺失 `gateway.auth`，doctor 会提示并可生成 token。自动化场景用 `moltbot doctor --generate-gateway-token` 强制创建 token。

### 13）Gateway 健康检查 + 重启
Doctor 会运行健康检查，若看起来不健康则提示重启。

### 14）通道状态警告
若 gateway 健康，doctor 会运行通道状态探测并给出修复建议。

### 15）Supervisor 配置审计 + 修复
Doctor 会检查已安装的 supervisor 配置（launchd/systemd/schtasks）是否缺失或过期（如 systemd 的 network-online 依赖与重启延迟）。
发现不匹配时，会建议更新并可重写服务文件/任务为当前默认值。

说明：
- `moltbot doctor` 在重写 supervisor 配置前会提示。
- `moltbot doctor --yes` 接受默认修复提示。
- `moltbot doctor --repair` 无提示应用推荐修复。
- `moltbot doctor --repair --force` 会覆盖自定义 supervisor 配置。
- 你也可用 `moltbot gateway install --force` 强制重写。

### 16）Gateway 运行态 + 端口诊断
Doctor 会检查服务运行态（PID、最近退出状态），当服务已安装但未运行时警告。也会检查网关端口（默认 `18789`）冲突并报告可能原因（网关已在运行、SSH 隧道）。

### 17）Gateway 运行时最佳实践
当网关服务运行在 Bun 或版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）时，doctor 会警告。WhatsApp + Telegram 通道需要 Node，版本管理器路径在升级后可能失效，因为服务不会加载 shell init。若系统存在，可提示迁移到系统 Node 安装（Homebrew/apt/choco）。

### 18）配置写入 + 向导元数据
Doctor 会持久化配置变更，并写入向导元数据以记录本次 doctor 运行。

### 19）工作区提示（备份 + 记忆系统）
若缺少工作区记忆系统，doctor 会提出建议；若工作区未在 git 中，还会提示备份。

完整工作区结构与 git 备份指南见 [/concepts/agent-workspace](/concepts/agent-workspace)。
