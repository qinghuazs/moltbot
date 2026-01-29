---
summary: "设置指南：保持 Moltbot 可定制并持续更新"
read_when:
  - 设置新机器
  - 你想获得“最新 最强”且不破坏个人配置
---

# 设置

最后更新：2026-01-01

## 简要说明
- **定制内容在仓库外：** `~/clawd`（工作区）+ `~/.clawdbot/moltbot.json`（配置）。
- **稳定工作流：** 安装 macOS 应用；让它运行内置 Gateway。
- **前沿工作流：** 自己用 `pnpm gateway:watch` 运行 Gateway，再让 macOS 应用以本地模式连接。

## 先决条件（从源码）
- Node `>=22`
- `pnpm`
- Docker（可选；仅用于容器化和 e2e。见 [Docker](/install/docker)）

## 定制策略（避免更新伤到你）

如果你要“100% 为我定制”且方便更新，把你的自定义放在：

- **配置：** `~/.clawdbot/moltbot.json`（JSON/JSON5 风格）
- **工作区：** `~/clawd`（技能 提示词 记忆。建议做成私有 git 仓库）

首次初始化：

```bash
moltbot setup
```

在本仓库中也使用同一 CLI 入口：

```bash
moltbot setup
```

如果你还没有全局安装，使用 `pnpm moltbot setup`。

## 稳定工作流（macOS 应用优先）

1) 安装并启动 **Moltbot.app**（菜单栏）。
2) 完成引导与权限清单（TCC 提示）。
3) 确保 Gateway 为**本地**并在运行（由应用管理）。
4) 连接聊天入口（示例：WhatsApp）：

```bash
moltbot channels login
```

5) 健康检查：

```bash
moltbot health
```

如果你的构建没有引导流程：
- 运行 `moltbot setup`，然后 `moltbot channels login`，再手动启动 Gateway（`moltbot gateway`）。

## 前沿工作流（终端运行 Gateway）

目标：开发 TypeScript Gateway，获得热重载，同时保持 macOS 应用 UI 连接。

### 0)（可选）从源码运行 macOS 应用

如果你也希望 macOS 应用处于前沿版本：

```bash
./scripts/restart-mac.sh
```

### 1) 启动开发版 Gateway

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` 以 watch 模式运行 gateway，并在 TypeScript 变更时重载。

### 2) 让 macOS 应用指向正在运行的 Gateway

在 **Moltbot.app** 中：

- Connection Mode：**Local**
应用会连接到配置端口上的 Gateway。

### 3) 验证

- 应用内 Gateway 状态应显示 **“Using existing gateway …”**
- 或使用 CLI：

```bash
moltbot health
```

### 常见坑
- **端口错误：** Gateway WS 默认 `ws://127.0.0.1:18789`；确保应用与 CLI 使用同一端口。
- **状态目录位置：**
  - 凭据：`~/.clawdbot/credentials/`
  - 会话：`~/.clawdbot/agents/<agentId>/sessions/`
  - 日志：`/tmp/moltbot/`

## 凭据存储表

调试认证或决定备份内容时使用：

- **WhatsApp**：`~/.clawdbot/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：config/env 或 `channels.telegram.tokenFile`
- **Discord bot token**：config/env（暂不支持 token 文件）
- **Slack tokens**：config/env（`channels.slack.*`）
- **配对 allowlists**：`~/.clawdbot/credentials/<channel>-allowFrom.json`
- **模型认证配置**：`~/.clawdbot/agents/<agentId>/agent/auth-profiles.json`
- **旧版 OAuth 导入**：`~/.clawdbot/credentials/oauth.json`
更多细节：[Security](/gateway/security#credential-storage-map)。

## 更新（不破坏你的设置）

- 把 `~/clawd` 与 `~/.clawdbot/` 当作“你的内容”；不要把个人提示词或配置放在 `moltbot` 仓库中。
- 更新源码：`git pull` + `pnpm install`（当 lockfile 变更时）+ 继续使用 `pnpm gateway:watch`。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户**服务。默认情况下 systemd 会在登出或空闲时停止用户服务，从而终止 Gateway。引导会尝试为你启用 lingering（可能提示 sudo）。如果仍未启用，运行：

```bash
sudo loginctl enable-linger $USER
```

对于常驻或多用户服务器，考虑使用 **system** 服务而非用户服务（无需 lingering）。systemd 说明见 [Gateway runbook](/gateway)。

## 相关文档

- [Gateway runbook](/gateway)（参数 监督 端口）
- [Gateway configuration](/gateway/configuration)（配置 schema + 示例）
- [Discord](/channels/discord) 与 [Telegram](/channels/telegram)（reply tags 与 replyToMode 设置）
- [Moltbot assistant setup](/start/clawd)
- [macOS app](/platforms/macos)（gateway 生命周期）
