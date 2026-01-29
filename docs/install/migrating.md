---
summary: "将 Moltbot 从一台机器迁移到另一台机器"
read_when:
  - 你要把 Moltbot 迁移到新电脑或服务器
  - 你想保留会话、认证和渠道登录（如 WhatsApp）
---
# 将 Moltbot 迁移到新机器

本指南把 Moltbot Gateway 从一台机器迁移到另一台机器，**无需重新引导**。

迁移逻辑很简单：

- 复制**状态目录**（`$CLAWDBOT_STATE_DIR`，默认：`~/.clawdbot/`）——包含配置、认证、会话与渠道状态。
- 复制你的**工作区**（默认 `~/clawd/`）——包含 agent 文件（记忆、提示词等）。

但常见的坑在于**profile**、**权限**与**不完整拷贝**。

## 开始前准备（你要迁移什么）

### 1) 确认状态目录

大多数安装使用默认路径：

- **状态目录：** `~/.clawdbot/`

但如果你使用了：

- `--profile <name>`（通常变为 `~/.clawdbot-<profile>/`）
- `CLAWDBOT_STATE_DIR=/some/path`

如果不确定，在**旧**机器上运行：

```bash
moltbot status
```

查看输出中 `CLAWDBOT_STATE_DIR` / profile 的提示。如果运行多个 gateway，请对每个 profile 重复。

### 2) 确认工作区

常见默认：

- `~/clawd/`（推荐工作区）
- 你自定义的目录

工作区里包含 `MEMORY.md`、`USER.md`、`memory/*.md` 等文件。

### 3) 理解你将保留的内容

如果同时复制**状态目录**和**工作区**，你将保留：

- Gateway 配置（`moltbot.json`）
- 认证档案 / API key / OAuth token
- 会话历史与 agent 状态
- 渠道状态（例如 WhatsApp 登录会话）
- 工作区文件（记忆、技能笔记等）

如果只复制**工作区**（例如通过 Git），你**不会**保留：

- 会话
- 凭据
- 渠道登录

这些都在 `$CLAWDBOT_STATE_DIR` 下。

## 迁移步骤（推荐）

### 第 0 步 备份（旧机器）

在**旧**机器上先停止 gateway，避免拷贝过程中内容变化：

```bash
moltbot gateway stop
```

（可选但推荐）归档状态目录与工作区：

```bash
# 如果使用了 profile 或自定义位置，请调整路径
cd ~
tar -czf moltbot-state.tgz .clawdbot

tar -czf clawd-workspace.tgz clawd
```

如果你有多个 profile 或状态目录（如 `~/.clawdbot-main`、`~/.clawdbot-work`），请分别归档。

### 第 1 步 在新机器上安装 Moltbot

在**新**机器上安装 CLI（必要时安装 Node）：

- 参见：[Install](/install)

此时即便引导流程创建了新的 `~/.clawdbot/` 也没关系，下一步会覆盖。

### 第 2 步 复制状态目录和工作区到新机器

复制**两者**：

- `$CLAWDBOT_STATE_DIR`（默认 `~/.clawdbot/`）
- 你的工作区（默认 `~/clawd/`）

常见方式：

- `scp` 传 tar 包并解压
- `rsync -a` 通过 SSH 同步
- 外接硬盘

复制后确保：

- 隐藏目录被包含（例如 `.clawdbot/`）
- 文件所有权属于运行 gateway 的用户

### 第 3 步 运行 Doctor（迁移与服务修复）

在**新**机器上：

```bash
moltbot doctor
```

Doctor 是“安全但无聊”的命令，用于修复服务、应用配置迁移并提示不匹配项。

然后：

```bash
moltbot gateway restart
moltbot status
```

## 常见坑与规避方式

### 坑：profile 或状态目录不一致

如果旧 gateway 使用了 profile（或 `CLAWDBOT_STATE_DIR`），新 gateway 用了不同的 profile，会出现：

- 配置改动不生效
- 渠道缺失或掉线
- 会话历史为空

修复：使用**相同**的 profile 或状态目录运行 gateway 和服务，然后再执行：

```bash
moltbot doctor
```

### 坑：只复制 `moltbot.json`

仅有 `moltbot.json` 远远不够。很多提供方的状态在：

- `$CLAWDBOT_STATE_DIR/credentials/`
- `$CLAWDBOT_STATE_DIR/agents/<agentId>/...`

务必迁移整个 `$CLAWDBOT_STATE_DIR` 目录。

### 坑：权限与所有权

如果你用 root 拷贝或更换了用户，gateway 可能无法读取凭据或会话。

修复：确保状态目录与工作区归运行 gateway 的用户所有。

### 坑：在远程与本地模式之间迁移

- 如果你的 UI（WebUI/TUI）指向**远程** gateway，远程主机拥有会话存储和工作区。
- 迁移本地机器不会移动远程 gateway 的状态。

如果你处于远程模式，请迁移**gateway 主机**。

### 坑：备份中包含密钥

`$CLAWDBOT_STATE_DIR` 包含敏感信息（API keys、OAuth tokens、WhatsApp 凭据）。请像对待生产密钥一样对待备份：

- 加密存储
- 避免通过不安全通道分享
- 若怀疑泄露，及时轮换密钥

## 验证清单

在新机器上确认：

- `moltbot status` 显示 gateway 正在运行
- 渠道仍保持连接（例如 WhatsApp 不需要重新配对）
- 仪表盘能打开并显示现有会话
- 工作区文件（记忆、配置等）已存在

## 相关内容

- [Doctor](/gateway/doctor)
- [Gateway troubleshooting](/gateway/troubleshooting)
- [Where does Moltbot store its data?](/help/faq#where-does-moltbot-store-its-data)
