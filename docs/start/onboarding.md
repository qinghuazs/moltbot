---
summary: "Moltbot 首次运行引导流程（macOS 应用）"
read_when:
  - 设计 macOS 引导助手
  - 实现认证或身份设置
---
# 引导（macOS 应用）

本文描述**当前**的首次引导流程。目标是顺畅的“第 0 天”体验：选择 Gateway 运行位置、连接认证、运行向导，并让 agent 完成自举。

## 页面顺序（当前）

1) 欢迎页 + 安全提示
2) **Gateway 选择**（本地 / 远程 / 稍后配置）
3) **认证（Anthropic OAuth）** 仅本地
4) **设置向导**（Gateway 驱动）
5) **权限**（TCC 提示）
6) **CLI**（可选）
7) **引导聊天**（专用会话）
8) 完成

## 1) 本地或远程

**Gateway** 在哪里运行？

- **本地（这台 Mac）：** 引导可执行 OAuth 流并在本地写入凭据。
- **远程（SSH 或 Tailnet）：** 引导**不会**在本地执行 OAuth；凭据必须存在于 gateway 主机。
- **稍后配置：** 跳过设置并保持应用未配置。

Gateway 认证提示：
- 向导现在即便在 loopback 也会生成 **token**，本地 WS 客户端必须认证。
- 如果你关闭认证，本机任何进程都可连接；仅在完全可信的机器上使用。
- 多机器访问或非 loopback 绑定应使用 **token**。

## 2) 仅本地认证（Anthropic OAuth）

macOS 应用支持 Anthropic OAuth（Claude Pro/Max）。流程：

- 打开浏览器进行 OAuth（PKCE）
- 提示用户粘贴 `code#state` 值
- 将凭据写入 `~/.clawdbot/credentials/oauth.json`

其他提供方（OpenAI、自定义 API）暂通过环境变量或配置文件设置。

## 3) 设置向导（Gateway 驱动）

应用可运行与 CLI 相同的设置向导。这保证引导与 Gateway 侧行为一致，避免在 SwiftUI 中重复实现逻辑。

## 4) 权限

引导会请求以下 TCC 权限：

- 通知
- 辅助功能
- 屏幕录制
- 麦克风 语音识别
- 自动化（AppleScript）

## 5) CLI（可选）

应用可通过 npm/pnpm 安装全局 `moltbot` CLI，让终端工作流与 launchd 任务开箱即用。

## 6) 引导聊天（专用会话）

设置完成后，应用会打开一个专用的引导聊天会话，让 agent 介绍自身并引导下一步。这让首次引导与正常对话分离。

## Agent 自举仪式

第一次运行 agent 时，Moltbot 会初始化工作区（默认 `~/clawd`）：

- 写入 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`
- 进行简短的一问一答仪式（每次一个问题）
- 将身份与偏好写入 `IDENTITY.md`、`USER.md`、`SOUL.md`
- 完成后删除 `BOOTSTRAP.md`，保证只执行一次

## 可选：Gmail hooks（手动）

Gmail Pub/Sub 当前仍为手动步骤。使用：

```bash
moltbot webhooks gmail setup --account you@gmail.com
```

详见 [/automation/gmail-pubsub](/automation/gmail-pubsub)。

## 远程模式说明

当 Gateway 在另一台机器上运行时，凭据与工作区文件都位于**该主机**。
如果你在远程模式下需要 OAuth，请在 gateway 主机上创建：

- `~/.clawdbot/credentials/oauth.json`
- `~/.clawdbot/agents/<agentId>/agent/auth-profiles.json`
