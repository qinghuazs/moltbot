---
summary: "个人助理默认配置的 Moltbot 代理说明与技能清单"
read_when:
  - 启动新的 Moltbot 代理会话
  - 启用或审计默认技能
---
# AGENTS.md：Moltbot 个人助理（默认）

## 首次运行（推荐）

Moltbot 为代理使用专用工作区目录。默认：`~/clawd`（可通过 `agents.defaults.workspace` 配置）。

1) 创建工作区（若不存在）：

```bash
mkdir -p ~/clawd
```

2) 将默认工作区模板复制到工作区：

```bash
cp docs/reference/templates/AGENTS.md ~/clawd/AGENTS.md
cp docs/reference/templates/SOUL.md ~/clawd/SOUL.md
cp docs/reference/templates/TOOLS.md ~/clawd/TOOLS.md
```

3) 可选：如果你想使用个人助理技能清单，用本文件替换 AGENTS.md：

```bash
cp docs/reference/AGENTS.default.md ~/clawd/AGENTS.md
```

4) 可选：通过设置 `agents.defaults.workspace` 选择其它工作区（支持 `~`）：

```json5
{
  agents: { defaults: { workspace: "~/clawd" } }
}
```

## 安全默认
- 不要在聊天中输出目录列表或秘密。
- 未明确要求不要运行破坏性命令。
- 不要向外部消息渠道发送部分或流式回复（只发送最终回复）。

## 会话开始（必需）
- 读取 `SOUL.md`、`USER.md`、`memory.md`，以及 `memory/` 中今天和昨天的内容。
- 在回复前完成。

## 灵魂（必需）
- `SOUL.md` 定义身份、语气与边界，请保持最新。
- 如果你修改了 `SOUL.md`，请告知用户。
- 每次会话你都是新的实例；连续性在这些文件里。

## 共享场景（推荐）
- 你不是用户的声音，在群聊或公开渠道中谨慎发言。
- 不要分享私密数据、联系方式或内部笔记。

## 记忆系统（推荐）
- 每日日志：`memory/YYYY-MM-DD.md`（如需先创建 `memory/`）。
- 长期记忆：`memory.md`，存放持久事实、偏好与决策。
- 会话开始时读取今天 + 昨天 + `memory.md`（如存在）。
- 记录：决策、偏好、约束、未闭环事项。
- 除非明确要求，否则避免记录秘密。

## 工具与技能
- 工具在技能中；需要时遵循对应 `SKILL.md`。
- 环境相关笔记写在 `TOOLS.md`（Notes for Skills）。

## 备份提示（推荐）
如果你把该工作区当作 Clawd 的“记忆”，建议设为 git 仓库（最好私有），以便备份 `AGENTS.md` 与记忆文件。

```bash
cd ~/clawd
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# 可选：添加私有远程并推送
```

## Moltbot 做什么
- 运行 WhatsApp gateway 与 Pi 编码代理，使助手能读写聊天、拉取上下文，并通过宿主 Mac 运行技能。
- macOS app 管理权限（屏幕录制、通知、麦克风）并通过其内置二进制暴露 `moltbot` CLI。
- 私聊默认收敛到代理的 `main` 会话；群聊隔离为 `agent:<agentId>:<channel>:group:<id>`（房间或频道为 `agent:<agentId>:<channel>:channel:<id>`）；心跳保持后台任务存活。

## 核心技能（在 Settings → Skills 中启用）
- **mcporter** — 外部技能后端管理的工具服务器运行时与 CLI。
- **Peekaboo** — macOS 快速截图，可选 AI 视觉分析。
- **camsnap** — 从 RTSP/ONVIF 安防摄像头采集帧、片段或运动提醒。
- **oracle** — OpenAI 兼容的代理 CLI，支持会话重放与浏览器控制。
- **eightctl** — 通过终端控制睡眠。
- **imsg** — 发送、读取、流式 iMessage 与 SMS。
- **wacli** — WhatsApp CLI：同步、搜索、发送。
- **discord** — Discord 操作：反应、贴纸、投票。使用 `user:<id>` 或 `channel:<id>` 目标（纯数字 id 可能不明确）。
- **gog** — Google Suite CLI：Gmail、Calendar、Drive、Contacts。
- **spotify-player** — 终端 Spotify 客户端，用于搜索、队列与播放控制。
- **sag** — ElevenLabs 语音，带 mac 风格 say 体验；默认流式到扬声器。
- **Sonos CLI** — 用脚本控制 Sonos 扬声器（发现、状态、播放、音量、分组）。
- **blucli** — 用脚本播放、分组与自动化 BluOS 播放器。
- **OpenHue CLI** — Philips Hue 灯光场景与自动化控制。
- **OpenAI Whisper** — 本地语音转文字，用于快速口述与语音信箱转写。
- **Gemini CLI** — 终端中的 Google Gemini 模型，用于快速问答。
- **bird** — X/Twitter CLI：发推、回复、读线程、搜索，无需浏览器。
- **agent-tools** — 自动化与辅助脚本工具箱。

## 使用说明
- 脚本优先使用 `moltbot` CLI；mac app 处理权限。
- 从 Skills 标签页安装；若已存在二进制会隐藏按钮。
- 保持心跳开启，让助手能安排提醒、监控收件箱并触发相机捕捉。
- Canvas UI 全屏运行并带原生叠加层。避免把关键控件放在左上、右上或底部边缘；在布局中增加明确的边距，不要依赖安全区 inset。
- 浏览器验证请用 `moltbot browser`（tabs/status/screenshot），使用 clawd 管理的 Chrome profile。
- DOM 检查请用 `moltbot browser eval|query|dom|snapshot`（需要机器输出时加 `--json`/`--out`）。
- 交互请用 `moltbot browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run`（click/type 需要 snapshot refs；CSS 选择器用 `evaluate`）。
