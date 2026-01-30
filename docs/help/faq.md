---
summary: "关于 Moltbot 安装、配置与使用的常见问题"
---
# 常见问题

这里提供快速解答，以及面向真实环境的深入排查（本地开发、VPS、多 agent、OAuth/API key、模型故障切换）。运行时诊断请看 [Troubleshooting](/gateway/troubleshooting)。完整配置参考请看 [Configuration](/gateway/configuration)。

## 目录

- [快速开始与首次运行设置](#快速开始与首次运行设置)
  - [我卡住了最快怎么脱困](#我卡住了最快怎么脱困)
  - [安装和设置 Moltbot 的推荐方式是什么](#安装和设置-moltbot-的推荐方式是什么)
  - [完成 onboarding 后怎么打开仪表板](#完成-onboarding-后怎么打开仪表板)
  - [本地与远程如何认证仪表板 token](#本地与远程如何认证仪表板-token)
  - [需要什么运行时](#需要什么运行时)
  - [可以在树莓派上运行吗](#可以在树莓派上运行吗)
  - [树莓派安装有什么建议](#树莓派安装有什么建议)
  - [卡在 wake-up-my-friend 或 onboarding 不出壳怎么办](#卡在-wake-up-my-friend-或-onboarding-不出壳怎么办)
  - [能否把配置迁移到新机器 Mac mini 而不重新 onboarding](#能否把配置迁移到新机器-mac-mini-而不重新-onboarding)
  - [最新版本有哪些新内容](#最新版本有哪些新内容)
  - [无法访问 docs.molt.bot SSL 错误怎么办](#无法访问-docsmoltbot-ssl-错误怎么办)
  - [stable 与 beta 有什么区别](#stable-与-beta-有什么区别)
- [如何安装 beta 版本以及 beta 与 dev 的区别是什么](#如何安装-beta-版本以及-beta-与-dev-的区别是什么)
  - [如何体验最新版本](#如何体验最新版本)
  - [安装与 onboarding 通常需要多久](#安装与-onboarding-通常需要多久)
  - [安装器卡住了怎么获得更多反馈](#安装器卡住了怎么获得更多反馈)
  - [Windows 安装提示 git 未找到或无法识别 moltbot](#windows-安装提示-git-未找到或无法识别-moltbot)
  - [文档没回答我的问题如何得到更好的答案](#文档没回答我的问题如何得到更好的答案)
  - [如何在 Linux 上安装 Moltbot](#如何在-linux-上安装-moltbot)
  - [如何在 VPS 上安装 Moltbot](#如何在-vps-上安装-moltbot)
  - [云端与 VPS 安装指南在哪里](#云端与-vps-安装指南在哪里)
  - [可以让 Clawd 自己更新吗](#可以让-clawd-自己更新吗)
  - [onboarding 向导实际做什么](#onboarding-向导实际做什么)
  - [运行需要 Claude 或 OpenAI 订阅吗](#运行需要-claude-或-openai-订阅吗)
  - [没有 API key 可以用 Claude Max 订阅吗](#没有-api-key-可以用-claude-max-订阅吗)
  - [Anthropic setup-token 认证如何工作](#anthropic-setup-token-认证如何工作)
  - [在哪里找到 Anthropic setup-token](#在哪里找到-anthropic-setup-token)
  - [是否支持 Claude 订阅认证 Claude Code OAuth](#是否支持-claude-订阅认证-claude-code-oauth)
  - [为什么我看到来自 Anthropic 的 HTTP 429 rate_limit_error](#为什么我看到来自-anthropic-的-http-429-rate_limit_error)
  - [是否支持 AWS Bedrock](#是否支持-aws-bedrock)
  - [Codex 认证如何工作](#codex-认证如何工作)
  - [是否支持 OpenAI 订阅认证 Codex OAuth](#是否支持-openai-订阅认证-codex-oauth)
  - [如何设置 Gemini CLI OAuth](#如何设置-gemini-cli-oauth)
  - [本地模型适合日常聊天吗](#本地模型适合日常聊天吗)
  - [如何把托管模型流量限制在特定区域](#如何把托管模型流量限制在特定区域)
  - [安装是否必须买 Mac Mini](#安装是否必须买-mac-mini)
  - [iMessage 支持需要 Mac mini 吗](#imessage-支持需要-mac-mini-吗)
  - [买 Mac mini 跑 Moltbot 后能否连接到 MacBook Pro](#买-mac-mini-跑-moltbot-后能否连接到-macbook-pro)
  - [可以用 Bun 吗](#可以用-bun-吗)
  - [Telegram 的 allowFrom 里填什么](#telegram-的-allowfrom-里填什么)
  - [多个人能否用同一个 WhatsApp 号码配不同 Moltbots](#多个人能否用同一个-whatsapp-号码配不同-moltbots)
  - [能否同时运行快速聊天 agent 和用于编码的 Opus agent](#能否同时运行快速聊天-agent-和用于编码的-opus-agent)
  - [Homebrew 能在 Linux 上工作吗](#homebrew-能在-linux-上工作吗)
  - [可黑客化 git 安装与 npm 安装有何区别](#可黑客化-git-安装与-npm-安装有何区别)
  - [之后能在 npm 与 git 安装之间切换吗](#之后能在-npm-与-git-安装之间切换吗)
  - [Gateway 应该跑在笔记本还是 VPS](#gateway-应该跑在笔记本还是-vps)
  - [在专用机器上运行 Moltbot 有多重要](#在专用机器上运行-moltbot-有多重要)
  - [VPS 最低配置与推荐系统是什么](#vps-最低配置与推荐系统是什么)
  - [能否在 VM 里运行 Moltbot 以及要求是什么](#能否在-vm-里运行-moltbot-以及要求是什么)
- [什么是 Moltbot](#什么是-moltbot)
  - [用一段话介绍 Moltbot](#用一段话介绍-moltbot)
  - [价值主张是什么](#价值主张是什么)
  - [刚装好后应该做什么](#刚装好后应该做什么)
  - [Moltbot 的五个日常用例](#moltbot-的五个日常用例)
  - [Moltbot 能帮助 SaaS 做获客外联广告和博客吗](#moltbot-能帮助-saas-做获客外联广告和博客吗)
  - [相比 Claude Code 的 Web 开发优势是什么](#相比-claude-code-的-web-开发优势是什么)
- [技能与自动化](#技能与自动化)
  - [如何自定义技能而不弄脏仓库](#如何自定义技能而不弄脏仓库)
  - [能否从自定义文件夹加载技能](#能否从自定义文件夹加载技能)
  - [如何为不同任务使用不同模型](#如何为不同任务使用不同模型)
  - [机器人在重活时卡住了怎么卸载负载](#机器人在重活时卡住了怎么卸载负载)
  - [Cron 或提醒不触发检查什么](#cron-或提醒不触发检查什么)
  - [如何在 Linux 上安装技能](#如何在-linux-上安装技能)
  - [Moltbot 能否定时或持续在后台运行任务](#moltbot-能否定时或持续在后台运行任务)
  - [能否在 Linux 上运行仅限 Apple 或 macOS 的技能](#能否在-linux-上运行仅限-apple-或-macos-的技能)
  - [是否有 Notion 或 HeyGen 集成](#是否有-notion-或-heygen-集成)
  - [如何安装浏览器接管的 Chrome 扩展](#如何安装浏览器接管的-chrome-扩展)
- [沙箱与记忆](#沙箱与记忆)
  - [有专门的沙箱文档吗](#有专门的沙箱文档吗)
  - [如何把宿主机文件夹绑定到沙箱](#如何把宿主机文件夹绑定到沙箱)
  - [记忆如何工作](#记忆如何工作)
  - [记忆总忘事怎么让它记住](#记忆总忘事怎么让它记住)
  - [记忆会永久保存吗有什么限制](#记忆会永久保存吗有什么限制)
  - [语义记忆检索需要 OpenAI API key 吗](#语义记忆检索需要-openai-api-key-吗)
- [磁盘上的位置](#磁盘上的位置)
  - [Moltbot 的数据是否全部保存在本地](#moltbot-的数据是否全部保存在本地)
  - [Moltbot 把数据存在哪里](#moltbot-把数据存在哪里)
  - [AGENTS.md SOUL.md USER.md MEMORY.md 应该放在哪里](#agentsmd-soulmd-usermd-memorymd-应该放在哪里)
  - [推荐的备份策略](#推荐的备份策略)
  - [如何彻底卸载 Moltbot](#如何彻底卸载-moltbot)
  - [agent 能在工作区之外工作吗](#agent-能在工作区之外工作吗)
  - [远程模式下会话存储在哪里](#远程模式下会话存储在哪里)
- [配置基础](#配置基础)
  - [配置是什么格式在哪里](#配置是什么格式在哪里)
  - [我设置 gateway.bind lan 或 tailnet 后没有监听或 UI 显示未授权](#我设置-gatewaybind-lan-或-tailnet-后没有监听或-ui-显示未授权)
  - [为什么现在 localhost 也需要 token](#为什么现在-localhost-也需要-token)
  - [修改配置后需要重启吗](#修改配置后需要重启吗)
  - [如何启用 web search 以及 web fetch](#如何启用-web-search-以及-web-fetch)
  - [config.apply 清空了我的配置如何恢复并避免](#configapply-清空了我的配置如何恢复并避免)
  - [如何运行一个中心 Gateway 并在多设备上用专用 worker](#如何运行一个中心-gateway-并在多设备上用专用-worker)
  - [Moltbot 浏览器能无头运行吗](#moltbot-浏览器能无头运行吗)
  - [如何用 Brave 控制浏览器](#如何用-brave-控制浏览器)
- [远程 Gateway 与节点](#远程-gateway-与节点)
  - [Telegram gateway 与节点之间的命令如何传播](#telegram-gateway-与节点之间的命令如何传播)
  - [Gateway 远程托管时 agent 如何访问我的电脑](#gateway-远程托管时-agent-如何访问我的电脑)
  - [Tailscale 已连接但没回复怎么办](#tailscale-已连接但没回复怎么办)
  - [两个 Moltbot 能互相对话吗 本地加 VPS](#两个-moltbot-能互相对话吗-本地加-vps)
  - [多个 agent 需要单独的 VPS 吗](#多个-agent-需要单独的-vps-吗)
  - [用本地笔记本做节点而不是从 VPS 用 SSH 有好处吗](#用本地笔记本做节点而不是从-vps-用-ssh-有好处吗)
  - [节点会运行 gateway 服务吗](#节点会运行-gateway-服务吗)
  - [是否有 API 或 RPC 方式应用配置](#是否有-api-或-rpc-方式应用配置)
  - [首次安装的最小合理配置是什么](#首次安装的最小合理配置是什么)
  - [如何在 VPS 上设置 Tailscale 并从 Mac 连接](#如何在-vps-上设置-tailscale-并从-mac-连接)
  - [如何把 Mac 节点连接到远程 Gateway Tailscale Serve](#如何把-mac-节点连接到远程-gateway-tailscale-serve)
  - [应该在第二台笔记本上安装还是只加节点](#应该在第二台笔记本上安装还是只加节点)
- [环境变量与 .env 加载](#环境变量与-env-加载)
  - [Moltbot 如何加载环境变量](#moltbot-如何加载环境变量)
  - [我通过 service 启动 Gateway 后环境变量消失了怎么办](#我通过-service-启动-gateway-后环境变量消失了怎么办)
  - [我设置了 COPILOT_GITHUB_TOKEN 但 models status 显示 Shell env off 为什么](#我设置了-copilot_github_token-但-models-status-显示-shell-env-off-为什么)
- [会话与多聊天](#会话与多聊天)
  - [如何开启新对话](#如何开启新对话)
  - [不发 /new 会自动重置会话吗](#不发-new-会自动重置会话吗)
  - [是否可以让 Moltbot 团队一个 CEO 多个 agent](#是否可以让-moltbot-团队一个-ceo-多个-agent)
  - [为什么上下文在任务中途被截断如何避免](#为什么上下文在任务中途被截断如何避免)
  - [如何完全重置 Moltbot 但保留安装](#如何完全重置-moltbot-但保留安装)
  - [我遇到 context too large 错误如何重置或压缩](#我遇到-context-too-large-错误如何重置或压缩)
  - [为什么我看到 LLM request rejected messages N content X tool_use input Field required](#为什么我看到-llm-request-rejected-messages-n-content-x-tool_use-input-field-required)
  - [为什么每 30 分钟会收到 heartbeat 消息](#为什么每-30-分钟会收到-heartbeat-消息)
  - [我需要把 bot 账号加到 WhatsApp 群吗](#我需要把-bot-账号加到-whatsapp-群吗)
  - [如何获取 WhatsApp 群的 JID](#如何获取-whatsapp-群的-jid)
  - [为什么 Moltbot 在群里不回复](#为什么-moltbot-在群里不回复)
  - [群或线程与私聊共享上下文吗](#群或线程与私聊共享上下文吗)
  - [可以创建多少工作区和 agent](#可以创建多少工作区和-agent)
  - [Slack 能否同时运行多个 bot 或聊天如何设置](#slack-能否同时运行多个-bot-或聊天如何设置)
- [模型：默认、选择、别名与切换](#模型默认选择别名与切换)
  - [什么是默认模型](#什么是默认模型)
  - [推荐什么模型](#推荐什么模型)
  - [如何切换模型而不清空配置](#如何切换模型而不清空配置)
  - [可以使用自托管模型吗 llama.cpp vLLM Ollama](#可以使用自托管模型吗-llamacpp-vllm-ollama)
  - [Clawd Flawd Krill 用什么模型](#clawd-flawd-krill-用什么模型)
  - [如何在不重启的情况下切换模型](#如何在不重启的情况下切换模型)
  - [能否用 GPT 5.2 做日常 Codex 5.2 做编码](#能否用-gpt-52-做日常-codex-52-做编码)
  - [为什么看到 Model is not allowed 然后无回复](#为什么看到-model-is-not-allowed-然后无回复)
  - [为什么看到 Unknown model minimax MiniMax M2.1](#为什么看到-unknown-model-minimax-minimax-m21)
  - [能否把 MiniMax 作为默认 OpenAI 做复杂任务](#能否把-minimax-作为默认-openai-做复杂任务)
  - [opus sonnet gpt 是内置快捷方式吗](#opus-sonnet-gpt-是内置快捷方式吗)
  - [如何定义或覆盖模型快捷方式别名](#如何定义或覆盖模型快捷方式别名)
  - [如何添加来自 OpenRouter 或 Z.AI 的模型](#如何添加来自-openrouter-或-zai-的模型)
- [模型故障切换与所有模型失败](#模型故障切换与所有模型失败)
  - [故障切换如何工作](#故障切换如何工作)
  - [这个错误是什么意思](#这个错误是什么意思)
  - [No credentials found for profile anthropic default 修复清单](#no-credentials-found-for-profile-anthropic-default-修复清单)
  - [为什么也尝试了 Google Gemini 并失败](#为什么也尝试了-google-gemini-并失败)
- [认证 profile 含义与管理](#认证-profile-含义与管理)
  - [什么是认证 profile](#什么是认证-profile)
  - [常见 profile ID 是什么](#常见-profile-id-是什么)
  - [可以控制优先尝试的 profile 吗](#可以控制优先尝试的-profile-吗)
  - [OAuth 与 API key 有何区别](#oauth-与-api-key-有何区别)
- [Gateway 端口已在运行与远程模式](#gateway-端口已在运行与远程模式)
  - [Gateway 用什么端口](#gateway-用什么端口)
  - [为什么 moltbot gateway status 说 Runtime running 但 RPC probe failed](#为什么-moltbot-gateway-status-说-runtime-running-但-rpc-probe-failed)
  - [为什么 moltbot gateway status 显示 Config cli 与 Config service 不同](#为什么-moltbot-gateway-status-显示-config-cli-与-config-service-不同)
  - [另一个 gateway 实例已在监听是什么意思](#另一个-gateway-实例已在监听是什么意思)
  - [如何运行远程模式客户端连接到别处的 Gateway](#如何运行远程模式客户端连接到别处的-gateway)
  - [Control UI 显示未授权或不停重连怎么办](#control-ui-显示未授权或不停重连怎么办)
  - [我设置 gateway.bind tailnet 但无法绑定或没有监听](#我设置-gatewaybind-tailnet-但无法绑定或没有监听)
  - [同一主机能跑多个 Gateway 吗](#同一主机能跑多个-gateway-吗)
  - [invalid handshake 或 code 1008 是什么意思](#invalid-handshake-或-code-1008-是什么意思)
- [日志与调试](#日志与调试)
  - [日志在哪里](#日志在哪里)
  - [如何启动停止重启 Gateway 服务](#如何启动停止重启-gateway-服务)
  - [Windows 关闭终端后如何重启 Moltbot](#windows-关闭终端后如何重启-moltbot)
  - [Gateway 在跑但回复不到达检查什么](#gateway-在跑但回复不到达检查什么)
  - [Disconnected from gateway no reason 怎么办](#disconnected-from-gateway-no-reason-怎么办)
  - [Telegram setMyCommands 失败有网络错误检查什么](#telegram-setmycommands-失败有网络错误检查什么)
  - [TUI 没输出检查什么](#tui-没输出检查什么)
  - [如何完全停止再启动 Gateway](#如何完全停止再启动-gateway)
  - [ELI5 moltbot gateway restart vs moltbot gateway](#eli5-moltbot-gateway-restart-vs-moltbot-gateway)
  - [出错时最快获取更多细节的方法是什么](#出错时最快获取更多细节的方法是什么)
- [媒体与附件](#媒体与附件)
  - [技能生成图片或 PDF 但未发送](#技能生成图片或-pdf-但未发送)
- [安全与访问控制](#安全与访问控制)
  - [对外暴露 Moltbot 的私信入口安全吗](#对外暴露-moltbot-的私信入口安全吗)
  - [提示词注入是否只对公共 bot 需要关注](#提示词注入是否只对公共-bot-需要关注)
  - [机器人要不要单独的邮箱 GitHub 账号或手机号](#机器人要不要单独的邮箱-github-账号或手机号)
  - [让它自动处理短信是否安全](#让它自动处理短信是否安全)
  - [个人助理任务能否用更便宜的模型](#个人助理任务能否用更便宜的模型)
  - [我在 Telegram 里运行 start 但没得到配对码](#我在-telegram-里运行-start-但没得到配对码)
  - [WhatsApp 会给联系人发消息吗配对如何工作](#whatsapp-会给联系人发消息吗配对如何工作)
- [聊天命令终止任务与停不下来](#聊天命令终止任务与停不下来)
  - [如何阻止内部系统消息显示在聊天中](#如何阻止内部系统消息显示在聊天中)
  - [如何停止或取消运行中的任务](#如何停止或取消运行中的任务)
  - [如何从 Telegram 发送 Discord 消息 Cross-context messaging denied](#如何从-telegram-发送-discord-消息-cross-context-messaging-denied)
  - [为什么机器人看起来忽略快速连续消息](#为什么机器人看起来忽略快速连续消息)
- [只回答截图或聊天记录中的具体问题](#只回答截图或聊天记录中的具体问题)

## 出问题后的前 60 秒

1) **快速状态（首要检查）**
   ```bash
   moltbot status
   ```
   快速本地摘要：OS + 更新、gateway/service 可达性、agents/sessions、提供方配置 + 运行时问题（当 gateway 可达时）。

2) **可粘贴报告（可安全分享）**
   ```bash
   moltbot status --all
   ```
   只读诊断，附带日志尾部（已脱敏 token）。

3) **守护进程 + 端口状态**
   ```bash
   moltbot gateway status
   ```
   展示 supervisor 运行态与 RPC 可达性、探测目标 URL，以及服务可能使用的配置。

4) **深度探测**
   ```bash
   moltbot status --deep
   ```
   运行 gateway 健康检查 + 提供方探测（需要 gateway 可达）。见 [Health](/gateway/health)。

5) **跟踪最新日志**
   ```bash
   moltbot logs --follow
   ```
   如果 RPC 不通，改用：
   ```bash
   tail -f "$(ls -t /tmp/moltbot/moltbot-*.log | head -1)"
   ```
   文件日志与 service 日志分离；见 [Logging](/logging) 和 [Troubleshooting](/gateway/troubleshooting)。

6) **运行 doctor（修复）**
   ```bash
   moltbot doctor
   ```
   修复/迁移配置与状态并运行健康检查。见 [Doctor](/gateway/doctor)。

7) **Gateway 快照**
   ```bash
   moltbot health --json
   moltbot health --verbose   # 出错时显示目标 URL + 配置路径
   ```
   向运行中的 gateway 请求完整快照（仅 WS）。见 [Health](/gateway/health)。

## 快速开始与首次运行设置

### 我卡住了最快怎么脱困

使用一个能**看见你机器**的本地 AI agent。它比在 Discord 里求助更有效，因为多数“我卡住了”的情况是**本地配置或环境问题**，远程帮手无法检查。

- **Claude Code**: https://www.anthropic.com/claude-code/
- **OpenAI Codex**: https://openai.com/codex/

这些工具可以读仓库、运行命令、检查日志，帮助修复机器级设置（PATH、服务、权限、认证文件）。请用可黑客化（git）安装给它**完整源码检出**：

```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --install-method git
```

这会从 **git 检出**安装 Moltbot，因此 agent 能读代码与文档并推理你正在运行的具体版本。之后随时可以不带 `--install-method git` 重新运行安装器回到 stable。

提示：让 agent **先规划与监督**修复步骤，再只执行必要命令。这样改动更小也更容易审计。

如果你发现真实 bug 或修复，请提交 GitHub issue 或 PR：
https://github.com/moltbot/moltbot/issues
https://github.com/moltbot/moltbot/pulls

求助时先跑这些命令（并分享输出）：

```bash
moltbot status
moltbot models status
moltbot doctor
```

它们的作用：
- `moltbot status`：gateway/agent 健康 + 基础配置的快速快照。
- `moltbot models status`：检查提供方认证 + 模型可用性。
- `moltbot doctor`：验证并修复常见配置/状态问题。

其他有用的 CLI 检查：`moltbot status --all`、`moltbot logs --follow`、
`moltbot gateway status`、`moltbot health --verbose`。

快速排障循环见：[出问题后的前 60 秒](#出问题后的前-60-秒)。
安装文档：[Install](/install)、[Installer flags](/install/installer)、[Updating](/install/updating)。

### 安装和设置 Moltbot 的推荐方式是什么

仓库推荐从源码运行，并使用 onboarding 向导：

```bash
curl -fsSL https://molt.bot/install.sh | bash
moltbot onboard --install-daemon
```

向导也会自动构建 UI 资源。完成 onboarding 后，通常在 **18789** 端口运行 Gateway。

从源码（贡献者/开发）：

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm build
pnpm ui:build # 首次运行会自动安装 UI 依赖
moltbot onboard
```

如果你还没有全局安装，可用 `pnpm moltbot onboard` 运行。

### 完成 onboarding 后怎么打开仪表板

向导现在会在 onboarding 结束后自动打开浏览器并提供带 token 的仪表板 URL，同时在摘要里打印完整链接（含 token）。请保持该标签页开启；如果没弹出，就在同一台机器上复制粘贴打印的 URL。token 只在本机使用，浏览器不会去拉取任何内容。

### 本地与远程如何认证仪表板 token

**本地（同一台机器）：**
- 打开 `http://127.0.0.1:18789/`。
- 如果提示认证，运行 `moltbot dashboard` 并使用带 token 的链接（`?token=...`）。
- token 与 `gateway.auth.token`（或 `CLAWDBOT_GATEWAY_TOKEN`）一致，并在首次加载后由 UI 保存。

**不在本机：**
- **Tailscale Serve**（推荐）：保持绑定 loopback，运行 `moltbot gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 为 `true`，身份头即可满足认证（无需 token）。
- **Tailnet bind**：运行 `moltbot gateway --bind tailnet --token "<token>"`，打开 `http://<tailscale-ip>:18789/`，在仪表板设置里粘贴 token。
- **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后从 `moltbot dashboard` 打开 `http://127.0.0.1:18789/?token=...`。

绑定模式与认证细节见：[Dashboard](/web/dashboard) 与 [Web surfaces](/web)。

### 需要什么运行时

需要 Node **>= 22**。推荐 `pnpm`。Gateway **不推荐**使用 Bun。

### 可以在树莓派上运行吗

可以。Gateway 很轻量，文档列出 **512MB-1GB RAM**、**1 核**和约 **500MB** 磁盘即可个人使用，并注明 **树莓派 4 可以运行**。

如果想留更多余量（日志、媒体、其他服务），推荐 **2GB**，但不是硬性下限。

提示：小型 Pi/VPS 可以托管 Gateway，你可以在笔记本/手机上配对 **节点** 来获得本地屏幕/摄像头/画布或命令执行。见 [Nodes](/nodes)。

### 树莓派安装有什么建议

简版结论：可以跑，但要有心理准备。

- 使用 **64 位**系统并保持 Node >= 22。
- 优先使用 **可黑客化（git）安装**，便于看日志和快速更新。
- 先不启用频道/技能，再逐个加入。
- 遇到怪异二进制问题，多半是 **ARM 兼容性**。

文档：[Linux](/platforms/linux)、[Install](/install)。

### 卡在 wake up my friend 或 onboarding 不出壳怎么办

这个界面依赖 Gateway 可达且已认证。TUI 在首次出壳时也会自动发送 “Wake up, my friend!”。如果你看到这行但**没有回复**并且 tokens 仍为 0，说明 agent 根本没跑起来。

1) 重启 Gateway：
```bash
moltbot gateway restart
```
2) 检查状态 + 认证：
```bash
moltbot status
moltbot models status
moltbot logs --follow
```
3) 还卡住就运行：
```bash
moltbot doctor
```

如果 Gateway 在远程，请确认隧道/Tailscale 连接正常，并确保 UI 指向正确的 Gateway。见 [Remote access](/gateway/remote)。

### 能否把配置迁移到新机器 Mac mini 而不重新 onboarding

可以。复制 **状态目录** 与 **工作区**，再跑一次 Doctor。这会让你的机器人“完全一致”（记忆、会话历史、认证、频道状态），前提是你复制了**这两个位置**：

1) 在新机器上安装 Moltbot。
2) 从旧机器复制 `$CLAWDBOT_STATE_DIR`（默认：`~/.clawdbot`）。
3) 复制你的工作区（默认：`~/clawd`）。
4) 运行 `moltbot doctor` 并重启 Gateway 服务。

这会保留配置、认证 profile、WhatsApp 凭据、会话和记忆。如果你处于远程模式，请记住 gateway 主机拥有会话存储与工作区。

**重要：** 如果你只是把工作区提交/推送到 GitHub，那只是在备份**记忆 + 启动文件**，**没有**包含会话历史或认证。它们在 `~/.clawdbot/` 下（例如 `~/.clawdbot/agents/<agentId>/sessions/`）。

相关链接：[Migrating](/install/migrating)、[磁盘上的位置](/help/faq#where-does-moltbot-store-its-data)、
[Agent workspace](/concepts/agent-workspace)、[Doctor](/gateway/doctor)、
[Remote mode](/gateway/remote)。

### 最新版本有哪些新内容

查看 GitHub 的变更日志：  
https://github.com/moltbot/moltbot/blob/main/CHANGELOG.md

最新条目在最上方。如果顶部标注 **Unreleased**，则下一个带日期的段落是最新发布版本。条目按 **Highlights**、**Changes**、**Fixes** 分组（必要时还有 docs/其他部分）。

### 无法访问 docs.molt.bot SSL 错误怎么办

部分 Comcast/Xfinity 连接会错误地通过 Xfinity Advanced Security 阻断 `docs.molt.bot`。请关闭它或把 `docs.molt.bot` 加入 allowlist，然后重试。更多细节见 [Troubleshooting](/help/troubleshooting#docsmoltbot-shows-an-ssl-error-comcastxfinity)。
也请在这里反馈以帮助解封：https://spa.xfinity.com/check_url_status。

如果仍无法访问，文档在 GitHub 也有镜像：
https://github.com/moltbot/moltbot/tree/main/docs

### stable 与 beta 有什么区别

**stable** 与 **beta** 是 **npm dist-tag**，不是不同代码线：
- `latest` = stable
- `beta` = 早期测试版本

我们把构建发布到 **beta**，测试稳定后再把**同一版本**提升到 `latest`。这就是为什么 beta 与 stable 可能指向**同一版本**。

查看变更：  
https://github.com/moltbot/moltbot/blob/main/CHANGELOG.md

### 如何安装 beta 版本以及 beta 与 dev 的区别是什么

**Beta** 是 npm dist-tag `beta`（可能与 `latest` 相同）。  
**Dev** 是 `main` 的滚动头（git）；发布时使用 npm dist-tag `dev`。

一键命令（macOS/Linux）：

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://molt.bot/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://molt.bot/install.sh | bash -s -- --install-method git
```

Windows 安装器（PowerShell）：
https://molt.bot/install.ps1

更多细节：[Development channels](/install/development-channels) 与 [Installer flags](/install/installer)。

### 安装与 onboarding 通常需要多久

粗略范围：
- **安装：** 2-5 分钟
- **onboarding：** 5-15 分钟，取决于你配置了多少频道/模型

如果卡住，请看 [安装器卡住](#安装器卡住了怎么获得更多反馈) 以及 [我卡住了](#我卡住了最快怎么脱困) 里的快速排障。

### 如何体验最新版本

两种方式：

1) **Dev 渠道（git checkout）：**
```bash
moltbot update --channel dev
```
这会切到 `main` 分支并从源码更新。

2) **可黑客化安装（安装器站点）：**
```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --install-method git
```
这会得到可编辑的本地仓库，然后通过 git 更新。

如果你想手动干净克隆：
```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm build
```

文档：[Update](/cli/update)、[Development channels](/install/development-channels)、
[Install](/install)。

### 安装器卡住了怎么获得更多反馈

用 **verbose 输出**重新运行安装器：

```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --verbose
```

beta 安装 + verbose：

```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --beta --verbose
```

可黑客化（git）安装：

```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --install-method git --verbose
```

更多选项见：[Installer flags](/install/installer)。

### Windows 安装提示 git 未找到或无法识别 moltbot

Windows 常见两类问题：

**1) npm 错误 spawn git / git not found**
- 安装 **Git for Windows**，并确保 `git` 在 PATH 中。
- 关闭并重开 PowerShell，再次运行安装器。

**2) 安装后 moltbot 未识别**
- npm 全局 bin 目录不在 PATH。
- 查看路径：
  ```powershell
  npm config get prefix
  ```
- 确保 `<prefix>\\bin` 在 PATH 中（多数系统为 `%AppData%\\npm`）。
- 更新 PATH 后关闭并重开 PowerShell。

如果要最省心的 Windows 方案，请用 **WSL2** 而不是原生 Windows。
文档：[Windows](/platforms/windows)。

### 文档没回答我的问题如何得到更好的答案

使用 **可黑客化（git）安装**，这样你本地就有完整源码和文档，然后让你的机器人（或 Claude/Codex）**在该目录下**读取仓库并精确回答。

```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --install-method git
```

更多细节：[Install](/install) 与 [Installer flags](/install/installer)。

### 如何在 Linux 上安装 Moltbot

简短答案：按 Linux 指南操作，然后运行 onboarding 向导。

- Linux 快速路径 + service 安装：[Linux](/platforms/linux)。
- 完整流程：[Getting Started](/start/getting-started)。
- 安装器 + 更新：[Install & updates](/install/updating)。

### 如何在 VPS 上安装 Moltbot

任意 Linux VPS 都可用。安装在服务器上，然后用 SSH/Tailscale 访问 Gateway。

指南：[exe.dev](/platforms/exe-dev)、[Hetzner](/platforms/hetzner)、[Fly.io](/platforms/fly)。  
远程访问：[Gateway remote](/gateway/remote)。

### 云端与 VPS 安装指南在哪里

我们有一个**托管总览**覆盖常见提供商，选一个跟着走即可：

- [VPS hosting](/vps)（所有提供商一站式）
- [Fly.io](/platforms/fly)
- [Hetzner](/platforms/hetzner)
- [exe.dev](/platforms/exe-dev)

云端工作方式：**Gateway 跑在服务器上**，你通过 Control UI（或 Tailscale/SSH）从笔记本/手机访问。状态与工作区都在服务器上，所以把宿主机当事实来源并做好备份。

你还可以把 **节点**（Mac/iOS/Android/headless）配对到云端 Gateway，用于本地屏幕/摄像头/画布或在笔记本上执行命令，同时保持 Gateway 在云端。

总览：[Platforms](/platforms)。远程访问：[Gateway remote](/gateway/remote)。
节点：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)。

### 可以让 Clawd 自己更新吗

简短答案：**可以，但不推荐**。更新流程可能重启 Gateway（会断开当前会话）、可能需要干净的 git 检出，也可能需要确认提示。更安全的做法是以操作者身份在 shell 里更新。

使用 CLI：

```bash
moltbot update
moltbot update status
moltbot update --channel stable|beta|dev
moltbot update --tag <dist-tag|version>
moltbot update --no-restart
```

如果必须让 agent 自动化：

```bash
moltbot update --yes --no-restart
moltbot gateway restart
```

文档：[Update](/cli/update)、[Updating](/install/updating)。

### onboarding 向导实际做什么

`moltbot onboard` 是推荐的安装路径。在**本地模式**下它会引导你：

- **模型/认证设置**（Claude 订阅推荐 Anthropic **setup-token**，支持 OpenAI Codex OAuth，可选 API key，支持 LM Studio 本地模型）
- **工作区**位置与启动文件
- **Gateway 设置**（bind/port/auth/tailscale）
- **提供方**（WhatsApp、Telegram、Discord、Mattermost（插件）、Signal、iMessage）
- **守护进程安装**（macOS 的 LaunchAgent；Linux/WSL2 的 systemd user unit）
- **健康检查** 与 **技能**选择

它还会在配置的模型未知或缺少认证时提示你。

### 运行需要 Claude 或 OpenAI 订阅吗

不需要。你可以用 **API key**（Anthropic/OpenAI/其他）或 **仅本地模型** 运行，数据可留在设备内。订阅（Claude Pro/Max 或 OpenAI Codex）只是认证这些提供方的可选方式。

文档：[Anthropic](/providers/anthropic)、[OpenAI](/providers/openai)、
[Local models](/gateway/local-models)、[Models](/concepts/models)。

### 没有 API key 可以用 Claude Max 订阅吗

可以。你可以用 **setup-token** 而不是 API key。这是订阅路径。

Claude Pro/Max 订阅**不包含 API key**，因此这是订阅账户的正确做法。重要提醒：你需要向 Anthropic 确认该用法符合其订阅政策与条款。如果你想走最明确且支持的路径，请使用 Anthropic API key。

### Anthropic setup-token 认证如何工作

`claude setup-token` 会通过 Claude Code CLI 生成 **token 字符串**（不在网页控制台里）。可以在**任意机器**上运行。向导里选择 **Anthropic token（粘贴 setup-token）**，或用 `moltbot models auth paste-token --provider anthropic` 直接粘贴。该 token 作为 **anthropic** 提供方的认证 profile 保存并像 API key 一样使用（不会自动刷新）。更多细节见 [OAuth](/concepts/oauth)。

### 在哪里找到 Anthropic setup-token

它**不在** Anthropic Console。setup-token 由 **Claude Code CLI** 在**任意机器**生成：

```bash
claude setup-token
```

复制输出的 token，然后在向导中选择 **Anthropic token（粘贴 setup-token）**。如果你想在 gateway 主机上执行，用 `moltbot models auth setup-token --provider anthropic`。如果你在别处执行 `claude setup-token`，就在 gateway 主机上用 `moltbot models auth paste-token --provider anthropic` 粘贴。见 [Anthropic](/providers/anthropic)。

### 是否支持 Claude 订阅认证 Claude Code OAuth

支持 — 通过 **setup-token**。Moltbot 不再复用 Claude Code CLI OAuth token；请使用 setup-token 或 Anthropic API key。token 可在任意地点生成，然后粘贴到 gateway 主机。见 [Anthropic](/providers/anthropic) 与 [OAuth](/concepts/oauth)。

注意：Claude 订阅访问受 Anthropic 条款约束。用于生产或多用户负载时，API key 通常更稳妥。

### 为什么我看到来自 Anthropic 的 HTTP 429 rate_limit_error

这说明你的 **Anthropic 配额或限流**在当前窗口已耗尽。如果你使用 **Claude 订阅**（setup-token 或 Claude Code OAuth），等待窗口重置或升级计划即可。如果你使用 **Anthropic API key**，请在 Anthropic Console 查看用量/计费并提升额度。

提示：设置 **fallback 模型**，让 Moltbot 在某提供方限流时继续回复。见 [Models](/cli/models) 与 [OAuth](/concepts/oauth)。

### 是否支持 AWS Bedrock

支持，但需手动配置，通过 pi-ai 的 **Amazon Bedrock（Converse）** 提供方。你必须在 gateway 主机上提供 AWS 凭据与区域，并在模型配置中添加 Bedrock provider 条目。见 [Amazon Bedrock](/bedrock) 与 [Model providers](/providers/models)。如果你希望更托管的密钥流程，在 Bedrock 前放一个 OpenAI 兼容代理也是可行选项。

### Codex 认证如何工作

Moltbot 通过 OAuth（ChatGPT 登录）支持 **OpenAI Code（Codex）**。向导可运行 OAuth 流程，并在合适时把默认模型设置为 `openai-codex/gpt-5.2`。见 [Model providers](/concepts/model-providers) 与 [Wizard](/start/wizard)。

### 是否支持 OpenAI 订阅认证 Codex OAuth

支持。Moltbot 完整支持 **OpenAI Code（Codex）订阅 OAuth**。onboarding 向导可替你完成 OAuth 流程。

见 [OAuth](/concepts/oauth)、[Model providers](/concepts/model-providers) 与 [Wizard](/start/wizard)。

### 如何设置 Gemini CLI OAuth

Gemini CLI 使用**插件认证流程**，而不是在 `moltbot.json` 里写 client id/secret。

步骤：
1) 启用插件：`moltbot plugins enable google-gemini-cli-auth`
2) 登录：`moltbot models auth login --provider google-gemini-cli --set-default`

这会把 OAuth token 存到 gateway 主机的认证 profile 中。详情见 [Model providers](/concepts/model-providers)。

### 本地模型适合日常聊天吗

通常不适合。Moltbot 需要大上下文与强安全性；小模型容易截断并泄漏。如果必须，本地可运行 **最大** 的 MiniMax M2.1（LM Studio）并参考 [/gateway/local-models](/gateway/local-models)。更小或量化模型会增加提示词注入风险，见 [Security](/gateway/security)。

### 如何把托管模型流量限制在特定区域

选择绑定区域的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供美国托管选项；选择 US 版本即可把数据留在区域内。你仍可通过 `models.mode: "merge"` 把 Anthropic/OpenAI 叠加在列表里，这样在尊重区域提供方的同时仍有可用的 fallback。

### 安装是否必须买 Mac Mini

不需要。Moltbot 可在 macOS 或 Linux 上运行（Windows 通过 WSL2）。Mac mini 只是可选项，有些人买它当作常开主机；小型 VPS、家庭服务器或树莓派等级设备也可以。

你只在**需要 macOS 专用工具**时才需要 Mac。iMessage 场景下，你可以把 Gateway 放在 Linux 上，并通过 SSH 让 `imsg` 在任意 Mac 上运行，把 `channels.imessage.cliPath` 指向 SSH wrapper。若需要其他 macOS 专用工具，则在 Mac 上跑 Gateway 或配对一个 macOS 节点。

文档：[iMessage](/channels/imessage)、[Nodes](/nodes)、[Mac remote mode](/platforms/mac/remote)。

### iMessage 支持需要 Mac mini 吗

需要**任意 macOS 设备**登录 Messages。**不一定**是 Mac mini，任意 Mac 都可以。Moltbot 的 iMessage 集成运行在 macOS（BlueBubbles 或 `imsg`），而 Gateway 可运行在别处。

常见配置：
- Gateway 跑在 Linux/VPS，`channels.imessage.cliPath` 指向在 Mac 上运行 `imsg` 的 SSH wrapper。
- 如果你想最简单的单机方案，就全部运行在 Mac 上。

文档：[iMessage](/channels/imessage)、[BlueBubbles](/channels/bluebubbles)、
[Mac remote mode](/platforms/mac/remote)。

### 买 Mac mini 跑 Moltbot 后能否连接到 MacBook Pro

可以。**Mac mini 运行 Gateway**，你的 MacBook Pro 作为**节点**连接（伴随设备）。节点不会运行 Gateway，而是提供该设备上的屏幕/摄像头/画布与 `system.run`。

常见模式：
- Gateway 在 Mac mini（常开）。
- MacBook Pro 运行 macOS app 或节点主机并与 Gateway 配对。
- 用 `moltbot nodes status` / `moltbot nodes list` 查看。

文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)。

### 可以用 Bun 吗

**不推荐** Bun。我们观察到运行时 bug，尤其在 WhatsApp 和 Telegram 上。请用 **Node** 保证 Gateway 稳定。

如果你仍想体验 Bun，请在非生产的 gateway 上实验，并不要启用 WhatsApp/Telegram。

### Telegram 的 allowFrom 里填什么

`channels.telegram.allowFrom` 是**人类发送者的 Telegram 用户 ID**（数字，推荐）或 `@username`，不是 bot 用户名。

更安全的做法（不依赖第三方 bot）：
- 私聊你的 bot，然后运行 `moltbot logs --follow`，读取 `from.id`。

官方 Bot API：
- 私聊你的 bot，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates`，读取 `message.from.id`。

第三方（隐私较弱）：
- 私聊 `@userinfobot` 或 `@getidsbot`。

见 [/channels/telegram](/channels/telegram#access-control-dms--groups)。

### 多个人能否用同一个 WhatsApp 号码配不同 Moltbots

可以，通过**多 agent 路由**。把每个发送者的 WhatsApp **DM**（peer `kind: "dm"`，发送者 E.164 例如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都有自己的工作区和会话存储。回复仍然来自**同一个 WhatsApp 账号**，DM 访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）对整个 WhatsApp 账号全局生效。见 [Multi-Agent Routing](/concepts/multi-agent) 与 [WhatsApp](/channels/whatsapp)。

### 能否同时运行快速聊天 agent 和用于编码的 Opus agent

可以。使用多 agent 路由：给每个 agent 配置自己的默认模型，然后把入站路由（提供方账号或特定 peer）绑定到对应 agent。示例配置见 [Multi-Agent Routing](/concepts/multi-agent)。另见 [Models](/concepts/models) 与 [Configuration](/gateway/configuration)。

### Homebrew 能在 Linux 上工作吗

可以。Homebrew 支持 Linux（Linuxbrew）。快速安装：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

如果你通过 systemd 运行 Moltbot，请确保 service PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或你的 brew 前缀），这样 `brew` 安装的工具在非登录 shell 里也能解析。
最近的构建还会在 Linux systemd services 中预置常见用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置时读取 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR`、`FNM_DIR`。

### 可黑客化 git 安装与 npm 安装有何区别

- **可黑客化（git）安装：** 完整源码检出，可编辑，最适合贡献者。
  本地构建，可以修改代码/文档。
- **npm 安装：** 全局 CLI 安装，没有仓库，适合“只想跑起来”。
  更新通过 npm dist-tag。

文档：[Getting started](/start/getting-started)、[Updating](/install/updating)。

### 之后能在 npm 与 git 安装之间切换吗

可以。安装另一种方式后，运行 Doctor 让 gateway service 指向新的入口。
这**不会删除数据**，只会更换 Moltbot 代码安装。你的状态（`~/.clawdbot`）和工作区（`~/clawd`）不会被触碰。

从 npm → git：

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm build
moltbot doctor
moltbot gateway restart
```

从 git → npm：

```bash
npm install -g moltbot@latest
moltbot doctor
moltbot gateway restart
```

Doctor 会检测 gateway service 的入口不匹配并提示重写服务配置（在自动化里可用 `--repair`）。

备份建议见：[备份策略](#推荐的备份策略)。

### Gateway 应该跑在笔记本还是 VPS

简短答案：**想要 24/7 稳定就用 VPS**。如果你追求最低摩擦且能接受休眠/重启，就在本地跑。

**笔记本（本地 Gateway）**
- **优点：** 无服务器费用，直接访问本地文件，有可见浏览器窗口。
- **缺点：** 休眠/断网 = 掉线，系统更新/重启会中断，必须保持唤醒。

**VPS / 云端**
- **优点：** 常开、网络稳定、不受笔记本休眠影响、易于持续运行。
- **缺点：** 多数为无头运行（用截图），本地文件只能远程访问，需要 SSH 更新。

**Moltbot 特定说明：** WhatsApp/Telegram/Slack/Mattermost（插件）/Discord 在 VPS 上都能正常工作。主要取舍是**无头浏览器**与可见窗口的差异。见 [Browser](/tools/browser)。

**推荐默认：** 如果你曾遇到 gateway 断线，优先 VPS。本地适合你在 Mac 上活跃使用且需要本地文件访问或可见浏览器的 UI 自动化。

### 在专用机器上运行 Moltbot 有多重要

非必须，但**推荐用于可靠性与隔离**。

- **专用主机（VPS/Mac mini/Pi）：** 常开、少休眠/重启干扰、权限更干净、易于持续运行。
- **共享笔记本/台式机：** 用于测试或活跃使用完全可以，但机器休眠或更新会中断。

想要两全其美：把 Gateway 放在专用主机上，再把笔记本配成**节点**来提供本地屏幕/摄像头/exec 工具。见 [Nodes](/nodes)。
安全建议见 [Security](/gateway/security)。

### VPS 最低配置与推荐系统是什么

Moltbot 很轻量。用于基础 Gateway + 单聊天频道：

- **绝对最低：** 1 vCPU、1GB RAM、约 500MB 磁盘。
- **推荐：** 1-2 vCPU、2GB RAM 或更多余量（日志、媒体、多频道）。节点工具和浏览器自动化可能更吃资源。

系统：使用 **Ubuntu LTS**（或任何现代 Debian/Ubuntu）。Linux 安装路径在此最稳定。

文档：[Linux](/platforms/linux)、[VPS hosting](/vps)。

### 能否在 VM 里运行 Moltbot 以及要求是什么

可以。把 VM 当成 VPS：需要常开、可达，并有足够 RAM 供 Gateway 和启用的频道使用。

基准建议：
- **绝对最低：** 1 vCPU、1GB RAM。
- **推荐：** 若运行多个频道、浏览器自动化或媒体工具，建议 2GB RAM 或更多。
- **系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu。

如果你在 Windows 上，**WSL2 是最简单的 VM 方案**，并且工具兼容性最好。见 [Windows](/platforms/windows)、[VPS hosting](/vps)。
如果你在 VM 里运行 macOS，见 [macOS VM](/platforms/macos-vm)。

## 什么是 Moltbot

### 用一段话介绍 Moltbot

Moltbot 是一个运行在你自己设备上的个人 AI 助手。它可以在你已经使用的聊天界面中回复（WhatsApp、Telegram、Slack、Mattermost（插件）、Discord、Google Chat、Signal、iMessage、WebChat），并在支持的平台上提供语音与实时 Canvas。**Gateway** 是常开的控制平面；助理是产品本身。

### 价值主张是什么

Moltbot 不是“只是 Claude 的外壳”。它是一个**本地优先的控制平面**，让你在**自己的硬件**上运行强大的助手，通过已有的聊天应用触达，具备会话状态、记忆和工具能力，而无需把工作流控制权交给托管 SaaS。

亮点：
- **你的设备，你的数据：** Gateway 想跑哪就跑哪（Mac、Linux、VPS），工作区与会话历史留在本地。
- **真实频道，而不是网页沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，加上支持平台的移动语音与 Canvas。
- **模型无关：** Anthropic、OpenAI、MiniMax、OpenRouter 等均可用，并支持按 agent 路由与故障切换。
- **仅本地选项：** 运行本地模型，**所有数据可留在你的设备**。
- **多 agent 路由：** 按频道、账号或任务分离 agent，各自独立工作区与默认值。
- **开源可黑客化：** 可检查、扩展、自托管，无厂商锁定。

文档：[Gateway](/gateway)、[Channels](/channels)、[Multi-agent](/concepts/multi-agent)、
[Memory](/concepts/memory)。

### 刚装好后应该做什么

好的首个项目：
- 搭建网站（WordPress、Shopify 或简单静态站）。
- 原型化移动应用（大纲、页面、API 方案）。
- 整理文件与文件夹（清理、命名、标签）。
- 连接 Gmail 并自动生成摘要或跟进。

它能处理大任务，但当你把任务拆成阶段并用子 agent 并行时效果最好。

### Moltbot 的五个日常用例

日常胜利通常是：
- **个人简报：** 你关心的收件箱、日历、新闻摘要。
- **研究与写作：** 快速调研、摘要、邮件或文档初稿。
- **提醒与跟进：** 由 cron 或 heartbeat 驱动的提醒与清单。
- **浏览器自动化：** 填表、采集数据、重复 Web 任务。
- **跨设备协作：** 在手机发任务，让 Gateway 在服务器执行，再把结果回到聊天里。

### Moltbot 能帮助 SaaS 做获客外联广告和博客吗

可以用于 **研究、资格筛选和草稿**。它能扫描网站、建立名单、总结潜在客户，并写外联或广告文案初稿。

对于**外联或投放**，请保持人工在环。避免垃圾信息，遵守当地法律与平台政策，并在发送前审阅内容。最安全的模式是 Moltbot 草拟，你来确认。

文档：[Security](/gateway/security)。

### 相比 Claude Code 的 Web 开发优势是什么

Moltbot 是**个人助理**与协调层，不是 IDE 替代品。若要在仓库里获得最快的编码循环，请用 Claude Code 或 Codex。当你需要持久记忆、跨设备访问与工具编排时，用 Moltbot。

优势：
- **跨会话持久记忆 + 工作区**
- **多平台接入**（WhatsApp、Telegram、TUI、WebChat）
- **工具编排**（浏览器、文件、调度、hooks）
- **常开 Gateway**（在 VPS 上运行，随处交互）
- **节点**提供本地浏览器/屏幕/摄像头/exec

展示： https://molt.bot/showcase

## 技能与自动化

### 如何自定义技能而不弄脏仓库

使用托管覆盖而不是编辑仓库副本。把改动放到 `~/.clawdbot/skills/<name>/SKILL.md`（或通过 `~/.clawdbot/moltbot.json` 的 `skills.load.extraDirs` 添加目录）。优先级为 `<workspace>/skills` > `~/.clawdbot/skills` > 内置，因此托管覆盖可以生效且不动 git。只有值得上游的改动才放进仓库并提 PR。

### 能否从自定义文件夹加载技能

可以。用 `~/.clawdbot/moltbot.json` 的 `skills.load.extraDirs` 添加额外目录（最低优先级）。默认优先级仍是：`<workspace>/skills` → `~/.clawdbot/skills` → 内置 → `skills.load.extraDirs`。`clawdhub` 默认安装到 `./skills`，Moltbot 会把它视为 `<workspace>/skills`。

### 如何为不同任务使用不同模型

目前支持的模式：
- **Cron 任务：** 每个任务可设置 `model` 覆盖。
- **子 agent：** 将任务路由到不同默认模型的 agent。
- **按需切换：** 用 `/model` 在当前会话随时切换。

见 [Cron jobs](/automation/cron-jobs)、[Multi-Agent Routing](/concepts/multi-agent) 与 [Slash commands](/tools/slash-commands)。

### 机器人在重活时卡住了怎么卸载负载

用 **子 agent** 处理耗时或并行任务。子 agent 在独立会话运行，返回摘要，并保持主聊天响应。

你可以对机器人说“为此任务创建子 agent”，或使用 `/subagents`。
用 `/status` 查看 Gateway 当前在做什么（是否繁忙）。

Token 提示：长任务与子 agent 都会消耗 token。如果成本敏感，可以用 `agents.defaults.subagents.model` 给子 agent 配更便宜的模型。

文档：[Sub-agents](/tools/subagents)。

### Cron 或提醒不触发检查什么

Cron 在 Gateway 进程内运行。如果 Gateway 不能持续运行，定时任务就不会触发。

检查清单：
- 确认 cron 已启用（`cron.enabled`）且未设置 `CLAWDBOT_SKIP_CRON`。
- 检查 Gateway 是否 24/7 运行（没有休眠/重启）。
- 校验任务的时区设置（`--tz` 与主机时区）。

调试：
```bash
moltbot cron run <jobId> --force
moltbot cron runs --id <jobId> --limit 50
```

文档：[Cron jobs](/automation/cron-jobs)、[Cron vs Heartbeat](/automation/cron-vs-heartbeat)。

### 如何在 Linux 上安装技能

使用 **ClawdHub**（CLI）或把技能放进工作区。macOS Skills UI 在 Linux 不可用。
技能列表：https://clawdhub.com。

安装 ClawdHub CLI（任选一个包管理器）：

```bash
npm i -g clawdhub
```

```bash
pnpm add -g clawdhub
```

### Moltbot 能否定时或持续在后台运行任务

可以。使用 Gateway 调度器：

- **Cron jobs** 用于定时或循环任务（跨重启持久）。
- **Heartbeat** 用于“主会话”的周期性检查。
- **隔离任务** 用于自主 agent 汇总或回传到聊天。

文档：[Cron jobs](/automation/cron-jobs)、[Cron vs Heartbeat](/automation/cron-vs-heartbeat)、
[Heartbeat](/gateway/heartbeat)。

### 能否在 Linux 上运行仅限 Apple 或 macOS 的技能

不能直接运行。macOS 技能受 `metadata.moltbot.os` 与所需二进制限制，只有在 **Gateway 主机**满足条件时才会进入系统提示词。在 Linux 上，`darwin` 专用技能（如 `imsg`、`apple-notes`、`apple-reminders`）默认不会加载，除非你覆盖 gating。

有三种支持的模式：

**方案 A - 在 Mac 上运行 Gateway（最简单）。**  
让 Gateway 在 macOS 二进制可用的机器上运行，再从 Linux 通过 [远程模式](#如何运行远程模式客户端连接到别处的-gateway) 或 Tailscale 连接。因为 Gateway 主机是 macOS，技能会正常加载。

**方案 B - 使用 macOS 节点（无 SSH）。**  
Gateway 运行在 Linux，上配一个 macOS 节点（菜单栏 app），并在 Mac 上把 **Node Run Commands** 设为 “Always Ask” 或 “Always Allow”。当节点存在所需二进制时，Moltbot 可认为这些 macOS 技能可用。agent 通过 `nodes` 工具调用这些技能。如果选择 “Always Ask”，在提示中批准 “Always Allow” 会把该命令加入 allowlist。

**方案 C - 通过 SSH 代理 macOS 二进制（高级）。**  
Gateway 跑在 Linux，但让需要的 CLI 二进制指向在 Mac 上运行的 SSH wrapper。然后覆盖技能以允许 Linux，使其保持可用。

1) 为二进制创建 SSH wrapper（示例 `imsg`）：
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/imsg "$@"
   ```
2) 把 wrapper 放到 Linux 主机的 `PATH`（例如 `~/bin/imsg`）。
3) 覆盖技能元数据（工作区或 `~/.clawdbot/skills`）以允许 Linux：
   ```markdown
   ---
   name: imsg
   description: iMessage/SMS CLI for listing chats, history, watch, and sending.
   metadata: {"moltbot":{"os":["darwin","linux"],"requires":{"bins":["imsg"]}}}
   ---
   ```
4) 重新开始会话，让技能快照刷新。

针对 iMessage，也可以把 `channels.imessage.cliPath` 指向 SSH wrapper（Moltbot 只需要 stdio）。见 [iMessage](/channels/imessage)。

### 是否有 Notion 或 HeyGen 集成

当前没有内置。

可选方案：
- **自定义技能/插件：** 最适合可靠 API 访问（Notion/HeyGen 都有 API）。
- **浏览器自动化：** 无需代码，但更慢也更脆弱。

如果你需要按客户保持上下文（代理/工作流），一种简单模式是：
- 每个客户一个 Notion 页面（上下文 + 偏好 + 进行中的工作）。
- 让 agent 在会话开始时获取该页面。

若需要原生集成，请开 feature request 或构建对应 API 的技能。

安装技能：

```bash
clawdhub install <skill-slug>
clawdhub update --all
```

ClawdHub 默认安装到当前目录下的 `./skills`（或回退到你的 Moltbot 工作区）；Moltbot 会在下一次会话把它视为 `<workspace>/skills`。若要让多个 agent 共享技能，把它们放到 `~/.clawdbot/skills/<name>/SKILL.md`。部分技能依赖 Homebrew 二进制；在 Linux 上就是 Linuxbrew（见上面的 Homebrew Linux FAQ）。见 [Skills](/tools/skills) 与 [ClawdHub](/tools/clawdhub)。

### 如何安装浏览器接管的 Chrome 扩展

使用内置安装器，然后在 Chrome 中加载解包扩展：

```bash
moltbot browser extension install
moltbot browser extension path
```

然后在 Chrome → `chrome://extensions` → 启用 “Developer mode” → “Load unpacked” → 选择该目录。

完整指南（包含远程 Gateway + 安全说明）：[Chrome extension](/tools/chrome-extension)

如果 Gateway 与 Chrome 在同一台机器（默认设置），通常**不需要**额外操作。
如果 Gateway 在别处，请在浏览器机器上运行节点主机，让 Gateway 代理浏览器动作。
你仍需点击扩展按钮绑定目标标签页（不会自动附着）。

## 沙箱与记忆

### 有专门的沙箱文档吗

有。见 [Sandboxing](/gateway/sandboxing)。Docker 相关（完整 gateway Docker 或沙箱镜像）见 [Docker](/install/docker)。

**能否让私聊保持个人但群聊用公共沙箱且用一个 agent**

可以，如果你的私密流量是 **DM**，公共流量是 **群聊**。

把 `agents.defaults.sandbox.mode: "non-main"`，让群聊或频道会话（非 main key）在 Docker 中运行，而主 DM 会话保留在宿主机。然后用 `tools.sandbox.tools` 限制沙箱会话可用的工具。

配置示例与流程见：[Groups: personal DMs + public groups](/concepts/groups#pattern-personal-dms-public-groups-single-agent)

关键配置参考：[Gateway configuration](/gateway/configuration#agentsdefaultssandbox)

### 如何把宿主机文件夹绑定到沙箱

设置 `agents.defaults.sandbox.docker.binds` 为 `"host:path:mode"` 形式（例如 `"/home/user/src:/src:ro"`）。全局与 per-agent binds 会合并；当 `scope: "shared"` 时会忽略 per-agent binds。对敏感内容请用 `:ro`，并记住 bind 会绕过沙箱文件系统隔离。示例与安全说明见 [Sandboxing](/gateway/sandboxing#custom-bind-mounts) 与 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

### 记忆如何工作

Moltbot 的记忆本质是 agent 工作区里的 Markdown 文件：
- 每日笔记在 `memory/YYYY-MM-DD.md`
- 长期精选笔记在 `MEMORY.md`（仅 main/私密会话）

Moltbot 还会在自动压缩前执行一次**静默记忆刷新**，提醒模型写入持久笔记。仅当工作区可写时运行（只读沙箱会跳过）。见 [Memory](/concepts/memory)。

### 记忆总忘事怎么让它记住

让机器人**把事实写入记忆**。长期笔记写进 `MEMORY.md`，短期上下文写进 `memory/YYYY-MM-DD.md`。

这是我们仍在改进的领域。提醒模型存储记忆很有帮助，它知道该怎么做。如果仍然频繁遗忘，请确认 Gateway 每次运行使用的是同一个工作区。

文档：[Memory](/concepts/memory)、[Agent workspace](/concepts/agent-workspace)。

### 语义记忆检索需要 OpenAI API key 吗

只有当你使用 **OpenAI embeddings** 时才需要。Codex OAuth 只覆盖 chat/completions，**不**包含 embeddings，因此**用 Codex 登录（OAuth 或 Codex CLI）无法用于语义记忆检索**。OpenAI embeddings 仍需要真实 API key（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

如果你没有显式设置 provider，Moltbot 会在能解析到 API key 时自动选择 provider（认证 profiles、`models.providers.*.apiKey` 或环境变量）。有 OpenAI key 时优先 OpenAI，否则有 Gemini key 时优先 Gemini。若两者都不可用，记忆检索保持关闭，直到你配置它。如果你配置并可用本地模型路径，Moltbot 会优先 `local`。

如果你想完全本地，设置 `memorySearch.provider = "local"`（可选 `memorySearch.fallback = "none"`）。如果要 Gemini embeddings，设置 `memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或 `memorySearch.remote.apiKey`）。我们支持 **OpenAI、Gemini 或本地** embeddings，详见 [Memory](/concepts/memory)。

### 记忆会永久保存吗有什么限制

记忆文件存放在磁盘上，除非你删除，否则会一直存在。限制来自存储，而不是模型。**会话上下文** 仍受模型上下文窗口限制，所以长对话会被压缩或截断。这就是记忆检索存在的原因：它只把相关部分拉回上下文。

文档：[Memory](/concepts/memory)、[Context](/concepts/context)。

## 磁盘上的位置

### Moltbot 的数据是否全部保存在本地

不是。**Moltbot 的状态是本地的**，但**外部服务仍会看到你发给它们的内容**。

- **本地默认：** 会话、记忆文件、配置与工作区在 Gateway 主机上（`~/.clawdbot` + 工作区目录）。
- **远程不可避免：** 你发给模型提供方（Anthropic/OpenAI 等）的消息会到它们的 API，聊天平台（WhatsApp/Telegram/Slack 等）会在服务器上存储消息。
- **你可控制范围：** 使用本地模型可让提示词留在机器上，但频道流量仍会经过该频道的服务器。

相关：[Agent workspace](/concepts/agent-workspace)、[Memory](/concepts/memory)。

### Moltbot 把数据存在哪里

一切都在 `$CLAWDBOT_STATE_DIR`（默认：`~/.clawdbot`）下：

| 路径 | 作用 |
|------|------|
| `$CLAWDBOT_STATE_DIR/moltbot.json` | 主配置（JSON5） |
| `$CLAWDBOT_STATE_DIR/credentials/oauth.json` | 旧版 OAuth 导入（首次使用时复制到认证 profiles） |
| `$CLAWDBOT_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 认证 profiles（OAuth + API keys） |
| `$CLAWDBOT_STATE_DIR/agents/<agentId>/agent/auth.json` | 运行时认证缓存（自动管理） |
| `$CLAWDBOT_STATE_DIR/credentials/` | 提供方状态（例如 `whatsapp/<accountId>/creds.json`） |
| `$CLAWDBOT_STATE_DIR/agents/` | 每个 agent 的状态（agentDir + 会话） |
| `$CLAWDBOT_STATE_DIR/agents/<agentId>/sessions/` | 会话历史与状态（每个 agent） |
| `$CLAWDBOT_STATE_DIR/agents/<agentId>/sessions/sessions.json` | 会话元数据（每个 agent） |

旧版单 agent 路径：`~/.clawdbot/agent/*`（由 `moltbot doctor` 迁移）。

你的 **工作区**（AGENTS.md、记忆文件、技能等）是独立的，通过 `agents.defaults.workspace` 配置（默认：`~/clawd`）。

### AGENTS.md SOUL.md USER.md MEMORY.md 应该放在哪里

这些文件应放在 **agent 工作区**，而不是 `~/.clawdbot`。

- **工作区（每个 agent）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
  `MEMORY.md`（或 `memory.md`）、`memory/YYYY-MM-DD.md`、可选 `HEARTBEAT.md`。
- **状态目录（`~/.clawdbot`）**：配置、凭据、认证 profiles、会话、日志、共享技能（`~/.clawdbot/skills`）。

默认工作区为 `~/clawd`，可通过以下配置：

```json5
{
  agents: { defaults: { workspace: "~/clawd" } }
}
```

如果机器人重启后“遗忘”，请确认 Gateway 每次启动使用同一个工作区（并记住：远程模式使用的是**gateway 主机**的工作区，而不是本地笔记本）。

提示：若你想持久化某个行为或偏好，最好让机器人**写入 AGENTS.md 或 MEMORY.md**，而不是依赖聊天历史。

见 [Agent workspace](/concepts/agent-workspace) 与 [Memory](/concepts/memory)。

### 推荐的备份策略

把 **agent 工作区** 放进**私有** git 仓库并做私密备份（例如 GitHub 私有仓库）。这样能保存记忆与 AGENTS/SOUL/USER 文件，便于之后恢复助手“心智”。

**不要**提交 `~/.clawdbot` 下的任何内容（凭据、会话、token）。如果你需要完整恢复，请分别备份工作区与状态目录（见上面的迁移问题）。

文档：[Agent workspace](/concepts/agent-workspace)。

### 如何彻底卸载 Moltbot

见专门指南：[Uninstall](/install/uninstall)。

### agent 能在工作区之外工作吗

可以。工作区是**默认 cwd** 与记忆锚点，不是硬性沙箱。相对路径会在工作区内解析，但除非启用沙箱，绝对路径仍可访问其他主机位置。需要隔离时使用 [`agents.defaults.sandbox`](/gateway/sandboxing) 或 per-agent 沙箱设置。若你希望某仓库成为默认工作目录，就把 해당 agent 的 `workspace` 指向仓库根目录。Moltbot 仓库只是源码，除非你刻意要在其中工作，否则应将工作区独立。

示例（仓库作为默认 cwd）：

```json5
{
  agents: {
    defaults: {
      workspace: "~/Projects/my-repo"
    }
  }
}
```

### 远程模式下会话存储在哪里

会话状态归 **gateway 主机**所有。处于远程模式时，你关心的会话存储在远程机器上，而不是本地笔记本。见 [Session management](/concepts/session)。

## 配置基础

### 配置是什么格式在哪里

Moltbot 会从 `$CLAWDBOT_CONFIG_PATH`（默认：`~/.clawdbot/moltbot.json`）读取可选的 **JSON5** 配置：

```
$CLAWDBOT_CONFIG_PATH
```

如果文件不存在，会使用相对安全的默认值（包括默认工作区 `~/clawd`）。

### 我设置 gateway.bind lan 或 tailnet 后没有监听或 UI 显示未授权

非 loopback 绑定**必须认证**。请配置 `gateway.auth.mode` + `gateway.auth.token`（或使用 `CLAWDBOT_GATEWAY_TOKEN`）。

```json5
{
  gateway: {
    bind: "lan",
    auth: {
      mode: "token",
      token: "replace-me"
    }
  }
}
```

说明：
- `gateway.remote.token` 仅用于**远程 CLI 调用**；不会启用本地 gateway 认证。
- Control UI 通过 `connect.params.auth.token` 认证（保存在 app/UI 设置中）。避免把 token 放进 URL。

### 为什么现在 localhost 也需要 token

向导默认会生成 gateway token（即便是 loopback），因此**本地 WS 客户端必须认证**。这能阻止其他本地进程调用 Gateway。把 token 粘贴到 Control UI 设置（或你的客户端配置）即可连接。

如果你**确实**想开放 loopback，可以从配置中移除 `gateway.auth`。Doctor 可随时为你生成 token：`moltbot doctor --generate-gateway-token`。

### 修改配置后需要重启吗

Gateway 会监视配置并支持热更新：

- `gateway.reload.mode: "hybrid"`（默认）：安全变更热应用，关键变更重启
- 也支持 `hot`、`restart`、`off`

### 如何启用 web search 以及 web fetch

`web_fetch` 不需要 API key。`web_search` 需要 Brave Search API key。
**推荐：** 运行 `moltbot configure --section web` 把它写入 `tools.web.search.apiKey`。环境变量替代方案：给 Gateway 进程设置 `BRAVE_API_KEY`。

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE",
        maxResults: 5
      },
      fetch: {
        enabled: true
      }
    }
  }
}
```

说明：
- 如果你使用 allowlist，请添加 `web_search`/`web_fetch` 或 `group:web`。
- `web_fetch` 默认启用（除非显式禁用）。
- 守护进程会从 `~/.clawdbot/.env` 读取环境变量（或 service 环境）。

文档：[Web tools](/tools/web)。

### 如何运行一个中心 Gateway 并在多设备上用专用 worker

常见模式是 **一个 Gateway**（例如树莓派）+ **节点** + **agents**：

- **Gateway（中心）：** 持有频道（Signal/WhatsApp）、路由与会话。
- **节点（设备）：** Mac/iOS/Android 作为外设，暴露本地工具（`system.run`、`canvas`、`camera`）。
- **agents（工人）：** 为特定角色分离大脑/工作区（例如 “Hetzner ops”、“个人数据”）。
- **子 agent：** 在你需要并行时由主 agent 生成后台工作。
- **TUI：** 连接 Gateway 并切换 agent/会话。

文档：[Nodes](/nodes)、[Remote access](/gateway/remote)、[Multi-Agent Routing](/concepts/multi-agent)、[Sub-agents](/tools/subagents)、[TUI](/tui)。

### Moltbot 浏览器能无头运行吗

可以，这是配置项：

```json5
{
  browser: { headless: true },
  agents: {
    defaults: {
      sandbox: { browser: { headless: true } }
    }
  }
}
```

默认 `false`（有头）。无头模式更容易触发某些站点的反机器人检查。见 [Browser](/tools/browser)。

无头使用**相同的 Chromium 引擎**，多数自动化可用（表单、点击、抓取、登录）。主要区别：
- 没有可见浏览器窗口（需要时用截图）。
- 某些站点在无头模式更严格（CAPTCHA、反机器人）。
  例如 X/Twitter 常阻止无头会话。

### 如何用 Brave 控制浏览器

把 `browser.executablePath` 指向 Brave 二进制（或任意 Chromium 内核浏览器）并重启 Gateway。
完整配置示例见 [Browser](/tools/browser#use-brave-or-another-chromium-based-browser)。

## 远程 Gateway 与节点

### Telegram gateway 与节点之间的命令如何传播

Telegram 消息由 **gateway** 处理。gateway 先运行 agent，然后在需要节点工具时，通过 **Gateway WebSocket** 调用节点：

Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

节点不会看到入站提供方流量；它们只接收 node RPC 调用。

### Gateway 远程托管时 agent 如何访问我的电脑

简短答案：**把你的电脑配对成一个节点**。Gateway 运行在别处，但它可以通过 Gateway WebSocket 调用你本机的 `node.*` 工具（屏幕、摄像头、系统）。

典型设置：
1) 在常开主机（VPS/家用服务器）上运行 Gateway。
2) 将 Gateway 主机与电脑加入同一 tailnet。
3) 确保 Gateway WS 可达（tailnet bind 或 SSH 隧道）。
4) 在本地打开 macOS app，并以 **Remote over SSH** 模式（或直接 tailnet）连接，从而注册为节点。
5) 在 Gateway 上批准该节点：
   ```bash
   moltbot nodes pending
   moltbot nodes approve <requestId>
   ```

无需单独的 TCP 桥接；节点通过 Gateway WebSocket 连接。

安全提醒：配对 macOS 节点会允许在该机器上执行 `system.run`。只配对可信设备，并阅读 [Security](/gateway/security)。

文档：[Nodes](/nodes)、[Gateway protocol](/gateway/protocol)、[macOS remote mode](/platforms/mac/remote)、[Security](/gateway/security)。

### Tailscale 已连接但没回复怎么办

先检查基础项：
- Gateway 在运行：`moltbot gateway status`
- Gateway 健康：`moltbot status`
- 频道健康：`moltbot channels status`

再检查认证与路由：
- 如果用 Tailscale Serve，确认 `gateway.auth.allowTailscale` 设置正确。
- 如果通过 SSH 隧道连接，确认本地隧道正常且端口正确。
- 确认 allowlist（DM 或群）包含你的账号。

文档：[Tailscale](/gateway/tailscale)、[Remote access](/gateway/remote)、[Channels](/channels)。

### 两个 Moltbot 能互相对话吗 本地加 VPS

可以。没有内置“bot-to-bot”桥，但你可以用几种可靠方式连起来：

**最简单：** 用两个 bot 都能访问的普通聊天渠道（Telegram/Slack/WhatsApp）。让 Bot A 发消息给 Bot B，Bot B 正常回复。

**CLI 桥（通用）：** 运行脚本调用另一个 Gateway：
`moltbot agent --message ... --deliver`，目标是另一个 bot 监听的聊天。如果其中一个 bot 在远程 VPS，请把 CLI 指向远程 Gateway（SSH/Tailscale，见 [Remote access](/gateway/remote)）。

示例模式（在能访问目标 Gateway 的机器上运行）：
```bash
moltbot agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

提示：加个防护，避免两个 bot 无休止互相循环（仅提及回复、频道 allowlist、或“不回复 bot 消息”规则）。

文档：[Remote access](/gateway/remote)、[Agent CLI](/cli/agent)、[Agent send](/tools/agent-send)。

### 多个 agent 需要单独的 VPS 吗

不需要。一个 Gateway 可以托管多个 agent，每个都有自己的工作区、默认模型和路由。这是正常配置，比每个 agent 一台 VPS 更便宜也更简单。

仅当你需要硬隔离（安全边界）或完全不同且不想共享的配置时，才用多个 VPS。否则保持一个 Gateway + 多个 agent/子 agent。

### 用本地笔记本做节点而不是从 VPS 用 SSH 有好处吗

有。节点是从远程 Gateway 访问笔记本的一级方式，不止是 shell 访问。Gateway 跑在 macOS/Linux（Windows 通过 WSL2），很轻量（小型 VPS 或树莓派级机器即可；4GB RAM 足够），常见模式是常开主机 + 笔记本作为节点。

- **无需入站 SSH。** 节点主动连接 Gateway WebSocket 并使用设备配对。
- **更安全的执行控制。** `system.run` 受该笔记本上的节点 allowlist/审批控制。
- **更多设备工具。** 节点除 `system.run` 外还暴露 `canvas`、`camera`、`screen`。
- **本地浏览器自动化。** Gateway 放在 VPS，本地跑 Chrome，通过扩展 + 节点主机中继控制。

SSH 适合临时 shell 访问，但节点更适合持续的 agent 工作流与设备自动化。

文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)、[Chrome extension](/tools/chrome-extension)。

### 应该在第二台笔记本上安装还是只加节点

如果你只需要第二台笔记本的**本地工具**（屏幕/摄像头/exec），就把它当**节点**。这样保持单一 Gateway，避免配置重复。本地节点工具当前仅 macOS 支持，但我们计划扩展到其他 OS。

只有当你需要**硬隔离**或两个完全独立的机器人时，才安装第二个 Gateway。

文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)、[Multiple gateways](/gateway/multiple-gateways)。

### 节点会运行 gateway 服务吗

不会。除非你刻意运行隔离 profile（见 [Multiple gateways](/gateway/multiple-gateways)），每台主机只应运行**一个 gateway**。节点是连接到 gateway 的外设（iOS/Android 节点，或 macOS 菜单栏 app 的“node 模式”）。无头节点主机与 CLI 控制见 [Node host CLI](/cli/node)。

`gateway`、`discovery` 与 `canvasHost` 的变更需要完全重启。

### 是否有 API 或 RPC 方式应用配置

有。`config.apply` 会验证并写入完整配置，并在操作中重启 Gateway。

### config.apply 清空了我的配置如何恢复并避免

`config.apply` 会替换**整个配置**。如果你发送部分对象，其余内容会被移除。

恢复：
- 从备份恢复（git 或复制的 `~/.clawdbot/moltbot.json`）。
- 如果没有备份，重新运行 `moltbot doctor` 并重新配置频道/模型。
- 如果这是意外行为，请提交 bug 并附上最后可用配置或任何备份。
- 本地编程 agent 往往能从日志或历史中重建可用配置。

避免：
- 小改动用 `moltbot config set`。
- 交互式编辑用 `moltbot configure`。

文档：[Config](/cli/config)、[Configure](/cli/configure)、[Doctor](/gateway/doctor)。

### 首次安装的最小合理配置是什么

```json5
{
  agents: { defaults: { workspace: "~/clawd" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } }
}
```

这会设置工作区并限制谁可以触发机器人。

### 如何在 VPS 上设置 Tailscale 并从 Mac 连接

最小步骤：

1) **在 VPS 上安装并登录**
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```
2) **在 Mac 上安装并登录**
   - 使用 Tailscale app 并登录同一 tailnet。
3) **启用 MagicDNS（推荐）**
   - 在 Tailscale 管理后台启用 MagicDNS，使 VPS 有稳定名称。
4) **使用 tailnet 主机名**
   - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
   - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

若要不用 SSH 访问 Control UI，可在 VPS 上启用 Tailscale Serve：
```bash
moltbot gateway --tailscale serve
```
这会让 gateway 保持 loopback 绑定，并通过 Tailscale 暴露 HTTPS。见 [Tailscale](/gateway/tailscale)。

### 如何把 Mac 节点连接到远程 Gateway Tailscale Serve

Serve 会暴露 **Gateway Control UI + WS**。节点通过同一 Gateway WS 端点连接。

推荐步骤：
1) **确保 VPS 与 Mac 在同一 tailnet**。
2) **用 macOS app 的 Remote 模式**（SSH 目标可为 tailnet 主机名）。
   app 会隧道 Gateway 端口并作为节点连接。
3) **在 gateway 上批准节点**：
   ```bash
   moltbot nodes pending
   moltbot nodes approve <requestId>
   ```

文档：[Gateway protocol](/gateway/protocol)、[Discovery](/gateway/discovery)、[macOS remote mode](/platforms/mac/remote)。

## 环境变量与 .env 加载

### Moltbot 如何加载环境变量

Moltbot 从父进程读取环境变量（shell、launchd/systemd、CI 等），并额外加载：

- 当前工作目录的 `.env`
- 全局兜底的 `~/.clawdbot/.env`（也就是 `$CLAWDBOT_STATE_DIR/.env`）

两个 `.env` 都不会覆盖已有环境变量。

你也可以在配置中定义内联环境变量（仅当进程 env 中缺失时才应用）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." }
  }
}
```

完整优先级与来源见 [/environment](/environment)。

### 我通过 service 启动 Gateway 后环境变量消失了怎么办

两种常见修复：

1) 把缺失的 key 放到 `~/.clawdbot/.env`，这样即使 service 不继承 shell env 也能加载。
2) 启用 shell 导入（可选便利功能）：

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000
    }
  }
}
```

这会运行你的登录 shell 并仅导入缺失的预期 key（不会覆盖）。对应环境变量：
`CLAWDBOT_LOAD_SHELL_ENV=1`、`CLAWDBOT_SHELL_ENV_TIMEOUT_MS=15000`。

### 我设置了 COPILOT_GITHUB_TOKEN 但 models status 显示 Shell env off 为什么

`moltbot models status` 显示**是否启用 shell env 导入**。“Shell env: off”并不代表 env 缺失，只表示 Moltbot 不会自动加载你的登录 shell。

如果 Gateway 作为 service 运行（launchd/systemd），它不会继承 shell 环境。解决方式：

1) 把 token 放入 `~/.clawdbot/.env`：
   ```
   COPILOT_GITHUB_TOKEN=...
   ```
2) 或启用 shell 导入（`env.shellEnv.enabled: true`）。
3) 或把它加入配置的 `env` 块（仅在缺失时应用）。

然后重启 gateway 并再次检查：
```bash
moltbot models status
```

Copilot token 来自 `COPILOT_GITHUB_TOKEN`（也支持 `GH_TOKEN` / `GITHUB_TOKEN`）。
见 [/concepts/model-providers](/concepts/model-providers) 与 [/environment](/environment)。

## 会话与多聊天

### 如何开启新对话

发送 `/new` 或 `/reset` 作为单独消息。见 [Session management](/concepts/session)。

### 不发 /new 会自动重置会话吗

会。会话在 `session.idleMinutes`（默认 **60**）后过期。**下一条**消息会为该聊天 key 创建新的会话 ID。这不会删除记录，只是开启新会话。

```json5
{
  session: {
    idleMinutes: 240
  }
}
```

### 是否可以让 Moltbot 团队一个 CEO 多个 agent

可以，通过 **多 agent 路由** 与 **子 agent**。你可以创建一个协调 agent 和多个各自拥有工作区与模型的 worker。

但这最好视为**有趣的实验**。它耗费 token，且通常不如一个 bot + 多个会话高效。我们设想的典型模型是一只你对话的 bot，它通过多个会话并行工作，并在需要时生成子 agent。

文档：[Multi-agent routing](/concepts/multi-agent)、[Sub-agents](/tools/subagents)、[Agents CLI](/cli/agents)。

### 为什么上下文在任务中途被截断如何避免

会话上下文受模型窗口限制。长聊天、大量工具输出或大量文件都会触发压缩或截断。

有帮助的做法：
- 让机器人总结当前状态并写入文件。
- 长任务前用 `/compact`，切换话题时用 `/new`。
- 把重要上下文放进工作区，让机器人读回来。
- 使用子 agent 处理长任务或并行工作，保持主聊天更小。
- 如果经常发生，选择更大上下文窗口的模型。

### 如何完全重置 Moltbot 但保留安装

使用 reset 命令：

```bash
moltbot reset
```

非交互式全量重置：

```bash
moltbot reset --scope full --yes --non-interactive
```

然后重新运行 onboarding：

```bash
moltbot onboard --install-daemon
```

说明：
- onboarding 向导在发现已有配置时也提供 **Reset**。见 [Wizard](/start/wizard)。
- 如使用 profiles（`--profile` / `CLAWDBOT_PROFILE`），请重置每个 state dir（默认 `~/.clawdbot-<profile>`）。
- 开发重置：`moltbot gateway --dev --reset`（仅 dev；清空 dev 配置 + 凭据 + 会话 + 工作区）。

### 我遇到 context too large 错误如何重置或压缩

可用以下方式：

- **压缩**（保留对话但总结较旧内容）：
  ```
  /compact
  ```
  或 `/compact <instructions>` 指定摘要方向。

- **重置**（同一聊天 key 使用新的会话 ID）：
  ```
  /new
  /reset
  ```

如果仍频繁发生：
- 启用或调整 **会话裁剪**（`agents.defaults.contextPruning`）以截断旧工具输出。
- 选择更大上下文窗口的模型。

文档：[Compaction](/concepts/compaction)、[Session pruning](/concepts/session-pruning)、[Session management](/concepts/session)。

### 为什么我看到 LLM request rejected messages N content X tool_use input Field required

这是提供方的校验错误：模型输出了 `tool_use` 块但缺少必需的 `input`。通常意味着会话历史陈旧或被破坏（常见于长线程或工具/模式变更后）。

修复：用 `/new` 开始一个新会话（单独发送）。

### 为什么每 30 分钟会收到 heartbeat 消息

Heartbeat 默认每 **30 分钟**运行一次。可调整或禁用：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "2h"   // 或 "0m" 以禁用
      }
    }
  }
}
```

如果 `HEARTBEAT.md` 存在但实际上为空（只有空行与 Markdown 标题如 `# Heading`），Moltbot 会跳过 heartbeat 以节省 API 调用。如果文件缺失，heartbeat 仍会运行，由模型决定做什么。

per-agent 覆盖使用 `agents.list[].heartbeat`。文档：[Heartbeat](/gateway/heartbeat)。

### 我需要把 bot 账号加到 WhatsApp 群吗

不需要。Moltbot 运行在**你的账号**上，所以只要你在群里，Moltbot 就能看到。默认情况下，群回复被阻止，直到你允许发送者（`groupPolicy: "allowlist"`）。

如果你只希望**你**能触发群回复：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"]
    }
  }
}
```

### 如何获取 WhatsApp 群的 JID

方案 1（最快）：跟踪日志并在群里发一条测试消息：

```bash
moltbot logs --follow --json
```

查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
`1234567890-1234567890@g.us`。

方案 2（已配置/allowlist）：从配置里列出群：

```bash
moltbot directory groups list --channel whatsapp
```

文档：[WhatsApp](/channels/whatsapp)、[Directory](/cli/directory)、[Logs](/cli/logs)。

### 为什么 Moltbot 在群里不回复

两类常见原因：
- 默认开启提及门控。你必须 @ 提及机器人（或匹配 `mentionPatterns`）。
- 你配置了 `channels.whatsapp.groups` 且未包含 `"*"`，该群未被 allowlist。

见 [Groups](/concepts/groups) 与 [Group messages](/concepts/group-messages)。

### 群或线程与私聊共享上下文吗

私聊默认会折叠到主会话。群/频道有各自的会话 key，Telegram 话题/Discord 线程是独立会话。见 [Groups](/concepts/groups) 与 [Group messages](/concepts/group-messages)。

### 可以创建多少工作区和 agent

没有硬限制。几十个甚至上百个都行，但注意：

- **磁盘增长：** 会话与记录在 `~/.clawdbot/agents/<agentId>/sessions/`。
- **token 成本：** agent 越多并发模型使用越多。
- **运维成本：** 每个 agent 的认证 profiles、工作区与频道路由。

提示：
- 每个 agent 保持一个**活跃**工作区（`agents.defaults.workspace`）。
- 磁盘变大时裁剪旧会话（删除 JSONL 或存档条目）。
- 用 `moltbot doctor` 发现游离工作区与 profile 不匹配。

### Slack 能否同时运行多个 bot 或聊天如何设置

可以。使用 **Multi-Agent Routing** 运行多个隔离 agent，并按频道/账号/peer 路由入站消息。Slack 作为频道支持，且可绑定到指定 agent。

浏览器访问很强，但并非“人类能做的都行”——反机器人、CAPTCHA、MFA 仍会阻挡自动化。最可靠的浏览器控制方式是在浏览器所在机器上使用 Chrome 扩展中继（Gateway 可在任意位置）。

最佳实践：
- 常开 Gateway 主机（VPS/Mac mini）。
- 每个角色一个 agent（绑定）。
- Slack 频道绑定到对应 agent。
- 需要时用扩展中继本地浏览器（或节点）。

文档：[Multi-Agent Routing](/concepts/multi-agent)、[Slack](/channels/slack)、
[Browser](/tools/browser)、[Chrome extension](/tools/chrome-extension)、[Nodes](/nodes)。

## 模型：默认、选择、别名与切换

### 什么是默认模型

Moltbot 的默认模型就是你设置的：

```
agents.defaults.model.primary
```

模型以 `provider/model` 引用（例如 `anthropic/claude-opus-4-5`）。如果省略 provider，Moltbot 目前会临时假定 `anthropic` 作为弃用兜底，但你仍应**显式**设置 `provider/model`。

### 推荐什么模型

**推荐默认：** `anthropic/claude-opus-4-5`。  
**不错的替代：** `anthropic/claude-sonnet-4-5`。  
**稳定可靠（更少个性）：** `openai/gpt-5.2`，几乎和 Opus 一样好，只是个性更少。  
**预算优先：** `zai/glm-4.7`。

MiniMax M2.1 有单独文档：[MiniMax](/providers/minimax) 与
[Local models](/gateway/local-models)。

经验法则：对高风险任务使用你能负担的**最好模型**，对日常聊天/摘要使用便宜模型。你可以按 agent 路由模型，并用子 agent 并行长任务（每个子 agent 会消耗 token）。见 [Models](/concepts/models) 与
[Sub-agents](/tools/subagents)。

强烈警告：弱模型或过度量化模型更容易遭受提示词注入与不安全行为。见 [Security](/gateway/security)。

更多背景：[Models](/concepts/models)。

### 可以使用自托管模型吗 llama.cpp vLLM Ollama

可以。如果你的本地服务器提供 OpenAI 兼容 API，你就可以配置自定义 provider 指向它。Ollama 直接支持且最简单。

安全提示：较小或高度量化模型更容易遭受提示词注入。我们强烈建议任何能调用工具的 bot 使用**大模型**。若仍要小模型，请启用沙箱并使用严格工具 allowlist。

文档：[Ollama](/providers/ollama)、[Local models](/gateway/local-models)、
[Model providers](/concepts/model-providers)、[Security](/gateway/security)、
[Sandboxing](/gateway/sandboxing)。

### 如何切换模型而不清空配置

使用**模型命令**或只编辑**模型字段**。避免整份配置替换。

安全方式：
- 聊天里 `/model`（按会话快速切换）
- `moltbot models set ...`（只更新模型配置）
- `moltbot configure --section models`（交互式）
- 编辑 `~/.clawdbot/moltbot.json` 的 `agents.defaults.model`

避免用部分对象执行 `config.apply`，除非你打算替换整份配置。
如果误覆盖了配置，请从备份恢复或运行 `moltbot doctor` 修复。

文档：[Models](/concepts/models)、[Configure](/cli/configure)、[Config](/cli/config)、[Doctor](/gateway/doctor)。

### Clawd Flawd Krill 用什么模型

- **Clawd + Flawd：** Anthropic Opus（`anthropic/claude-opus-4-5`）— 见 [Anthropic](/providers/anthropic)。
- **Krill：** MiniMax M2.1（`minimax/MiniMax-M2.1`）— 见 [MiniMax](/providers/minimax)。

### 如何在不重启的情况下切换模型

把 `/model` 当作单独消息发送：

```
/model sonnet
/model haiku
/model opus
/model gpt
/model gpt-mini
/model gemini
/model gemini-flash
```

可用 `/model`、`/model list` 或 `/model status` 列出模型。

`/model`（以及 `/model list`）会显示紧凑的编号选择器，通过编号选择：

```
/model 3
```

你也可以为该 provider 强制指定认证 profile（按会话）：

```
/model opus@anthropic:default
/model opus@anthropic:work
```

提示：`/model status` 会显示当前 agent、正在使用的 `auth-profiles.json` 文件，以及下一次会尝试的 profile。
它还会在可用时显示配置的 provider 端点（`baseUrl`）与 API 模式（`api`）。

**如何取消 profile 绑定**

重新运行不带 `@profile` 后缀的 `/model`：

```
/model anthropic/claude-opus-4-5
```

如果要回到默认值，从 `/model` 中选择默认（或发送 `/model <默认 provider/model>`）。
用 `/model status` 确认当前使用的 profile。

### 能否用 GPT 5.2 做日常 Codex 5.2 做编码

可以。设置一个为默认，按需切换：

- **快速切换（按会话）：** 日常用 `/model gpt-5.2`，编码用 `/model gpt-5.2-codex`。
- **默认 + 切换：** 将 `agents.defaults.model.primary` 设为 `openai-codex/gpt-5.2`，编码时切到 `openai-codex/gpt-5.2-codex`（或反过来）。
- **子 agent：** 把编码任务路由到使用不同默认模型的子 agent。

见 [Models](/concepts/models) 与 [Slash commands](/tools/slash-commands)。

### 为什么看到 Model is not allowed 然后无回复

如果设置了 `agents.defaults.models`，它会成为 `/model` 与会话覆盖的**allowlist**。选择不在列表里的模型会返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

该错误会**代替**正常回复。解决：把该模型加入 `agents.defaults.models`，移除 allowlist，或从 `/model list` 选择。

### 为什么看到 Unknown model minimax MiniMax M2.1

这表示**provider 未配置**（没有 MiniMax provider 配置或认证 profile），因此无法解析模型。用于该检测的修复在 **2026.1.12**（撰写时尚未发布）。

修复清单：
1) 升级到 **2026.1.12**（或从源码 `main` 运行），然后重启 gateway。
2) 确保已配置 MiniMax（向导或 JSON），或环境/认证 profiles 中存在 MiniMax API key，从而注入 provider。
3) 使用精确模型 id（区分大小写）：`minimax/MiniMax-M2.1` 或
   `minimax/MiniMax-M2.1-lightning`。
4) 运行：
   ```bash
   moltbot models list
   ```
   并从列表中选择（或聊天中 `/model list`）。

见 [MiniMax](/providers/minimax) 与 [Models](/concepts/models)。

### 能否把 MiniMax 作为默认 OpenAI 做复杂任务

可以。**MiniMax 作为默认**，需要时**按会话**切换模型。Fallback 用于**错误**，不是“难任务”，因此使用 `/model` 或单独 agent。

**方案 A：按会话切换**
```json5
{
  env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.1" },
      models: {
        "minimax/MiniMax-M2.1": { alias: "minimax" },
        "openai/gpt-5.2": { alias: "gpt" }
      }
    }
  }
}
```

然后：
```
/model gpt
```

**方案 B：分离 agent**
- Agent A 默认：MiniMax
- Agent B 默认：OpenAI
- 按 agent 路由或用 `/agent` 切换

文档：[Models](/concepts/models)、[Multi-Agent Routing](/concepts/multi-agent)、[MiniMax](/providers/minimax)、[OpenAI](/providers/openai)。

### opus sonnet gpt 是内置快捷方式吗

是。Moltbot 内置一些默认简写（仅当模型存在于 `agents.defaults.models` 时生效）：

- `opus` → `anthropic/claude-opus-4-5`
- `sonnet` → `anthropic/claude-sonnet-4-5`
- `gpt` → `openai/gpt-5.2`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`

如果你用同名 alias 覆盖，则以你的配置为准。

### 如何定义或覆盖模型快捷方式别名

别名来自 `agents.defaults.models.<modelId>.alias`。示例：

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-5" },
      models: {
        "anthropic/claude-opus-4-5": { alias: "opus" },
        "anthropic/claude-sonnet-4-5": { alias: "sonnet" },
        "anthropic/claude-haiku-4-5": { alias: "haiku" }
      }
    }
  }
}
```

然后 `/model sonnet`（或支持时 `/<alias>`）会解析到对应 model id。

### 如何添加来自 OpenRouter 或 Z.AI 的模型

OpenRouter（按 token 计费，多模型）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-5" },
      models: { "openrouter/anthropic/claude-sonnet-4-5": {} }
    }
  },
  env: { OPENROUTER_API_KEY: "sk-or-..." }
}
```

Z.AI（GLM 模型）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "zai/glm-4.7" },
      models: { "zai/glm-4.7": {} }
    }
  },
  env: { ZAI_API_KEY: "..." }
}
```

如果你引用了 provider/model，但缺少相应 provider key，会出现运行时认证错误（例如 `No API key found for provider "zai"`）。

**添加新 agent 后提示 No API key found for provider**

这通常意味着**新 agent**的认证存储为空。认证是按 agent 存储的，位置在：

```
~/.clawdbot/agents/<agentId>/agent/auth-profiles.json
```

修复方式：
- 运行 `moltbot agents add <id>` 并在向导中配置认证。
- 或把主 agent 的 `auth-profiles.json` 复制到新 agent 的 `agentDir`。

不要在多个 agent 间复用 `agentDir`，否则会造成认证/会话冲突。

## 模型故障切换与所有模型失败

### 故障切换如何工作

故障切换分两级：

1) **同一 provider 内的认证 profile 轮换**。
2) **模型 fallback** 到 `agents.defaults.model.fallbacks` 中的下一个模型。

对失败 profile 会应用冷却期（指数退避），因此即使某个 provider 被限流或暂时失败，Moltbot 仍能继续回应。

### 这个错误是什么意思

```
No credentials found for profile "anthropic:default"
```

意思是系统尝试使用认证 profile ID `anthropic:default`，但在预期的认证存储中找不到它。

### No credentials found for profile anthropic default 修复清单

- **确认认证 profiles 存放位置**（新旧路径）
  - 当前：`~/.clawdbot/agents/<agentId>/agent/auth-profiles.json`
  - 旧版：`~/.clawdbot/agent/*`（由 `moltbot doctor` 迁移）
- **确认 Gateway 已加载你的环境变量**
  - 若你在 shell 中设置 `ANTHROPIC_API_KEY` 但通过 systemd/launchd 运行 Gateway，可能未继承。请放到 `~/.clawdbot/.env` 或启用 `env.shellEnv`。
- **确认你在编辑正确的 agent**
  - 多 agent 配置会产生多个 `auth-profiles.json`。
- **检查模型/认证状态**
  - 用 `moltbot models status` 查看已配置模型与认证是否成功。

**No credentials found for profile anthropic 修复清单**

这表示运行被绑定到某个 Anthropic 认证 profile，但 Gateway 在认证存储中找不到它。

- **使用 setup-token**
  - 运行 `claude setup-token`，然后用 `moltbot models auth setup-token --provider anthropic` 粘贴。
  - 若 token 在另一台机器生成，用 `moltbot models auth paste-token --provider anthropic` 粘贴。
- **如果你要用 API key**
  - 把 `ANTHROPIC_API_KEY` 放到 **gateway 主机**的 `~/.clawdbot/.env`。
  - 清除强制顺序的绑定：
    ```bash
    moltbot models auth order clear --provider anthropic
    ```
- **确认你在 gateway 主机上运行命令**
  - 远程模式下，认证 profiles 在 gateway 机器上，而不是本地笔记本。

### 为什么也尝试了 Google Gemini 并失败

如果你的模型配置包含 Google Gemini 作为 fallback（或你切到 Gemini 简写），Moltbot 会在 fallback 时尝试它。如果你未配置 Google 认证，会看到 `No API key found for provider "google"`。

修复：提供 Google 认证，或从 `agents.defaults.model.fallbacks` / alias 中移除 Google 模型，避免 fallback 路由过去。

**LLM request rejected message thinking signature required google antigravity**

原因：会话历史包含**没有签名的 thinking block**（常见于中止或部分流式）。Google Antigravity 要求 thinking block 有签名。

修复：Moltbot 现在会为 Google Antigravity Claude 去掉未签名 thinking block。如果仍出现，请开始**新会话**或对该 agent 设置 `/thinking off`。

## 认证 profile 含义与管理

相关：[ /concepts/oauth ](/concepts/oauth)（OAuth 流程、token 存储、多账号模式）

### 什么是认证 profile

认证 profile 是绑定到 provider 的具名凭据记录（OAuth 或 API key）。profile 存放在：

```
~/.clawdbot/agents/<agentId>/agent/auth-profiles.json
```

### 常见 profile ID 是什么

Moltbot 使用 provider 前缀的 ID，例如：

- `anthropic:default`（常见于没有 email 身份时）
- `anthropic:<email>` 用于 OAuth 身份
- 你自定义的 ID（例如 `anthropic:work`）

### 可以控制优先尝试的 profile 吗

可以。配置支持 profile 的可选元数据与 provider 的排序（`auth.order.<provider>`）。它**不**存储密钥，只映射 ID 到 provider/mode 并设置轮换顺序。

当 profile 处于短期**冷却**（限流/超时/认证失败）或更长的**禁用**（计费/额度不足）状态时，Moltbot 可能暂时跳过。可运行 `moltbot models status --json` 查看 `auth.unusableProfiles`。调整项：`auth.cooldowns.billingBackoffHours*`。

你也可以通过 CLI 设置**每个 agent**的顺序覆盖（存储在该 agent 的 `auth-profiles.json`）：

```bash
# 默认是配置的默认 agent（省略 --agent）
moltbot models auth order get --provider anthropic

# 锁定轮换到单一 profile（只尝试这一个）
moltbot models auth order set --provider anthropic anthropic:default

# 或设置显式顺序（provider 内 fallback）
moltbot models auth order set --provider anthropic anthropic:work anthropic:default

# 清除覆盖（回退到 config auth.order / 轮询）
moltbot models auth order clear --provider anthropic
```

指定特定 agent：

```bash
moltbot models auth order set --provider anthropic --agent main anthropic:default
```

### OAuth 与 API key 有何区别

Moltbot 两者都支持：

- **OAuth** 通常可利用订阅访问（在适用时）。
- **API keys** 按 token 计费。

向导明确支持 Anthropic setup-token 与 OpenAI Codex OAuth，并可为你保存 API key。

## Gateway 端口已在运行与远程模式

### Gateway 用什么端口

`gateway.port` 控制 WebSocket + HTTP（Control UI、hooks 等）复用的单一端口。

优先级：

```
--port > CLAWDBOT_GATEWAY_PORT > gateway.port > default 18789
```

### 为什么 moltbot gateway status 说 Runtime running 但 RPC probe failed

因为“running”是 **supervisor** 视角（launchd/systemd/schtasks）。RPC probe 是 CLI 真正连接 gateway WebSocket 并调用 `status`。

请使用 `moltbot gateway status` 并关注：
- `Probe target:`（探测实际使用的 URL）
- `Listening:`（端口实际绑定情况）
- `Last gateway error:`（进程活着但端口没监听时常见根因）

### 为什么 moltbot gateway status 显示 Config cli 与 Config service 不同

你在编辑一个配置文件，而 service 在跑另一个（通常是 `--profile` / `CLAWDBOT_STATE_DIR` 不匹配）。

修复：
```bash
moltbot gateway install --force
```
在你希望 service 使用的同一 `--profile` / 环境下执行。

### 另一个 gateway 实例已在监听是什么意思

Moltbot 启动时会立即绑定 WebSocket 监听器（默认 `ws://127.0.0.1:18789`）。如果绑定失败且返回 `EADDRINUSE`，会抛出 `GatewayLockError` 表示已有实例在监听。

修复：停止另一个实例、释放端口，或用 `moltbot gateway --port <port>` 运行。

### 如何运行远程模式客户端连接到别处的 Gateway

设置 `gateway.mode: "remote"` 并指向远程 WebSocket URL，可选 token/password：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://gateway.tailnet:18789",
      token: "your-token",
      password: "your-password"
    }
  }
}
```

说明：
- 只有在 `gateway.mode` 为 `local` 时 `moltbot gateway` 才会启动（或你手动传 override）。
- macOS app 会监听配置并在这些值变化时动态切换模式。

### Control UI 显示未授权或不停重连怎么办

你的 gateway 开启了认证（`gateway.auth.*`），但 UI 没有发送匹配的 token/password。

事实（来自代码）：
- Control UI 把 token 存在浏览器 localStorage 的 `moltbot.control.settings.v1`。
- UI 可一次性从 `?token=...`（和或 `?password=...`）导入，然后从 URL 中移除。

修复：
- 最快方式：`moltbot dashboard`（打印并复制带 token 链接，尝试打开；若无头会提示 SSH）。
- 如果你还没有 token：`moltbot doctor --generate-gateway-token`。
- 若在远程，先隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/?token=...`。

- 若在远程，先隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/?token=...`。
- 在 gateway 主机上设置 `gateway.auth.token`（或 `CLAWDBOT_GATEWAY_TOKEN`）。
- 在 Control UI 设置中粘贴相同的 token（或用一次性 `?token=...` 链接刷新）。
- 仍卡住？运行 `moltbot status --all` 并按 [Troubleshooting](/gateway/troubleshooting) 排查。认证细节见 [Dashboard](/web/dashboard)。

### 我设置 gateway.bind tailnet 但无法绑定或没有监听

`tailnet` 绑定会从你的网络接口中选择 Tailscale IP（100.64.0.0/10）。如果机器未加入 Tailscale（或接口不可用），就没有可绑定的地址。

修复：
- 在该主机上启动 Tailscale（获得 100.x 地址），或
- 切换到 `gateway.bind: "loopback"` / `"lan"`。

注意：`tailnet` 是显式绑定。`auto` 会偏向 loopback；当你需要只在 tailnet 监听时使用 `gateway.bind: "tailnet"`。

### 同一主机能跑多个 Gateway 吗

通常不需要，一个 Gateway 可以跑多个消息频道与 agent。只有当你需要冗余（例如救援 bot）或硬隔离时才运行多个 Gateway。

可以，但必须隔离：

- `CLAWDBOT_CONFIG_PATH`（每实例配置）
- `CLAWDBOT_STATE_DIR`（每实例状态）
- `agents.defaults.workspace`（工作区隔离）
- `gateway.port`（唯一端口）

快速方案（推荐）：
- 每个实例用 `moltbot --profile <name> …`（会自动创建 `~/.clawdbot-<name>`）。
- 在每个 profile 配置中设置唯一 `gateway.port`（或手动运行时用 `--port`）。
- 为每个 profile 安装 service：`moltbot --profile <name> gateway install`。

Profiles 也会给 service 名称加后缀（`bot.molt.<profile>`；旧版 `com.clawdbot.*`、`moltbot-gateway-<profile>.service`、`Moltbot Gateway (<profile>)`）。
完整指南：[Multiple gateways](/gateway/multiple-gateways)。

### invalid handshake 或 code 1008 是什么意思

Gateway 是一个 **WebSocket 服务器**，它期望第一条消息就是 `connect` 帧。如果收到其他内容，会以 **1008**（策略违规）关闭连接。

常见原因：
- 你用浏览器打开 **HTTP** URL（`http://...`），而不是 WS 客户端。
- 端口或路径错误。
- 代理或隧道剥离了认证头或发送了非 Gateway 请求。

快速修复：
1) 使用 WS URL：`ws://<host>:18789`（或 HTTPS 场景 `wss://...`）。
2) 不要在普通浏览器标签页打开 WS 端口。
3) 若启用认证，在 `connect` 帧中携带 token/password。

如果你使用 CLI 或 TUI，URL 应类似：
```
moltbot tui --url ws://<host>:18789 --token <token>
```

协议细节：[Gateway protocol](/gateway/protocol)。

## 日志与调试

### 日志在哪里

文件日志（结构化）：

```
/tmp/moltbot/moltbot-YYYY-MM-DD.log
```

可用 `logging.file` 设置稳定路径。文件日志级别由 `logging.level` 控制。控制台详细度由 `--verbose` 与 `logging.consoleLevel` 控制。

最快日志跟踪：

```bash
moltbot logs --follow
```

service/supervisor 日志（gateway 通过 launchd/systemd 运行时）：
- macOS：`$CLAWDBOT_STATE_DIR/logs/gateway.log` 与 `gateway.err.log`（默认 `~/.clawdbot/logs/...`；profile 使用 `~/.clawdbot-<profile>/logs/...`）
- Linux：`journalctl --user -u moltbot-gateway[-<profile>].service -n 200 --no-pager`
- Windows：`schtasks /Query /TN "Moltbot Gateway (<profile>)" /V /FO LIST`

更多见 [Troubleshooting](/gateway/troubleshooting#log-locations)。

### 如何启动停止重启 Gateway 服务

使用 gateway helper：

```bash
moltbot gateway status
moltbot gateway restart
```

如果你手动运行 gateway，`moltbot gateway --force` 可回收端口。见 [Gateway](/gateway)。

### Windows 关闭终端后如何重启 Moltbot

Windows 有**两种安装模式**：

**1) WSL2（推荐）：** Gateway 在 Linux 中运行。

打开 PowerShell，进入 WSL，然后重启：

```powershell
wsl
moltbot gateway status
moltbot gateway restart
```

如果你没有安装 service，就在前台启动：

```bash
moltbot gateway run
```

**2) 原生 Windows（不推荐）：** Gateway 直接在 Windows 运行。

打开 PowerShell 并运行：

```powershell
moltbot gateway status
moltbot gateway restart
```

如果手动运行（无 service）：

```powershell
moltbot gateway run
```

文档：[Windows (WSL2)](/platforms/windows)、[Gateway service runbook](/gateway)。

### Gateway 在跑但回复不到达检查什么

先做快速健康检查：

```bash
moltbot status
moltbot models status
moltbot channels status
moltbot logs --follow
```

常见原因：
- 模型认证没有加载到**gateway 主机**（检查 `models status`）。
- 频道配对/allowlist 阻止回复（检查频道配置 + 日志）。
- WebChat/仪表板未带正确 token。

如果你在远程，请确认隧道/Tailscale 连接正常，并确保 Gateway WebSocket 可达。

文档：[Channels](/channels)、[Troubleshooting](/gateway/troubleshooting)、[Remote access](/gateway/remote)。

### Disconnected from gateway no reason 怎么办

这通常表示 UI 失去 WebSocket 连接。检查：

1) Gateway 是否运行？`moltbot gateway status`
2) Gateway 是否健康？`moltbot status`
3) UI 是否有正确 token？`moltbot dashboard`
4) 若为远程，隧道/Tailscale 是否正常？

然后跟踪日志：

```bash
moltbot logs --follow
```

文档：[Dashboard](/web/dashboard)、[Remote access](/gateway/remote)、[Troubleshooting](/gateway/troubleshooting)。

### Telegram setMyCommands 失败有网络错误检查什么

先看日志与频道状态：

```bash
moltbot channels status
moltbot channels logs --channel telegram
```

如果你在 VPS 或代理后，请确认出站 HTTPS 允许且 DNS 正常。
如果 Gateway 在远程，确保你查看的是 Gateway 主机的日志。

文档：[Telegram](/channels/telegram)、[Channel troubleshooting](/channels/troubleshooting)。

### TUI 没输出检查什么

先确认 Gateway 可达且 agent 能运行：

```bash
moltbot status
moltbot models status
moltbot logs --follow
```

在 TUI 中用 `/status` 查看当前状态。如果你期望在聊天频道收到回复，请确保启用投递（`/deliver on`）。

文档：[TUI](/tui)、[Slash commands](/tools/slash-commands)。

### 如何完全停止再启动 Gateway

如果安装了 service：

```bash
moltbot gateway stop
moltbot gateway start
```

这会停止/启动**受监管的 service**（macOS 的 launchd、Linux 的 systemd）。当 Gateway 在后台守护进程运行时使用。

如果在前台运行，用 Ctrl‑C 停止，然后：

```bash
moltbot gateway run
```

文档：[Gateway service runbook](/gateway)。

### ELI5 moltbot gateway restart vs moltbot gateway

- `moltbot gateway restart`：重启**后台 service**（launchd/systemd）。
- `moltbot gateway`：在**前台**运行 gateway（当前终端会话）。

如果你安装了 service，用 gateway 命令组。需要一次性的前台运行时才用 `moltbot gateway`。

### 出错时最快获取更多细节的方法是什么

用 `--verbose` 启动 Gateway 以获得更多控制台细节。然后查看日志文件里的频道认证、模型路由和 RPC 错误。

## 媒体与附件

### 技能生成图片或 PDF 但未发送

agent 发出的附件必须包含一行 `MEDIA:<path-or-url>`（单独一行）。见 [Moltbot assistant setup](/start/clawd) 与 [Agent send](/tools/agent-send)。

CLI 发送：

```bash
moltbot message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

还要检查：
- 目标频道支持外发媒体且未被 allowlist 阻止。
- 文件在提供方大小限制内（图片会被缩放到最大 2048px）。

见 [Images](/nodes/images)。

## 安全与访问控制

### 对外暴露 Moltbot 的私信入口安全吗

把入站私信当作不可信输入。默认配置用来降低风险：

- 可私信频道的默认行为是**配对**：
  - 未知发送者只会收到配对码，机器人不会处理其消息。
  - 用 `moltbot pairing approve <channel> <code>` 批准。
  - 待处理请求每个频道上限 **3** 个；若没收到配对码，检查 `moltbot pairing list <channel>`。
- 公开开启私信需要显式 opt-in（`dmPolicy: "open"` 且 allowlist 为 `"*"`）。

运行 `moltbot doctor` 以发现危险的 DM 策略。

### 提示词注入是否只对公共 bot 需要关注

不是。提示词注入针对的是**不可信内容**，而不仅是能否私信 bot。
如果助手读取外部内容（web search/fetch、浏览器页面、邮件、文档、附件、粘贴日志），这些内容可能包含试图劫持模型的指令。即使**只有你是发送者**也会发生。

最大风险来自工具启用：模型可能被诱导外泄上下文或代表你调用工具。降低风险：
- 用只读或禁用工具的 “reader” agent 总结不可信内容
- 对启用工具的 agent 关闭 `web_search` / `web_fetch` / `browser`
- 启用沙箱与严格工具 allowlist

细节见 [Security](/gateway/security)。

### 机器人要不要单独的邮箱 GitHub 账号或手机号

多数设置都建议单独账号。把机器人与个人账号隔离可以降低出问题时的影响面，也更容易轮换凭据或撤销访问而不影响个人账号。

从小做起，只给必要工具与账号权限，按需扩展。

文档：[Security](/gateway/security)、[Pairing](/start/pairing)。

### 让它自动处理短信是否安全

我们**不推荐**让它完全自主处理个人消息。最安全的模式是：
- 让私信保持**配对模式**或严格 allowlist。
- 如果要它代发，请使用**独立号码或账号**。
- 让它起草，然后**人工确认再发送**。

如果要实验，请用专用账号并保持隔离。见 [Security](/gateway/security)。

### 个人助理任务能否用更便宜的模型

可以，**前提是** agent 仅聊天且输入可信。小模型更容易被指令劫持，所以在启用工具或读取不可信内容时避免使用。若必须用小模型，锁定工具并运行在沙箱内。见 [Security](/gateway/security)。

### 我在 Telegram 里运行 start 但没得到配对码

配对码只有在未知发送者给 bot 发消息且启用 `dmPolicy: "pairing"` 时才发送。单独的 `/start` 不会生成配对码。

检查待处理请求：
```bash
moltbot pairing list telegram
```

如果要立即访问，请把发送者 id 加入 allowlist 或把 `dmPolicy` 设为 `open`。

### WhatsApp 会给联系人发消息吗配对如何工作

不会。默认 WhatsApp DM 策略是**配对**。未知发送者只会收到配对码，消息**不会处理**。Moltbot 只回复它收到的聊天，或你显式触发的发送。

批准配对：

```bash
moltbot pairing approve whatsapp <code>
```

列出待处理请求：

```bash
moltbot pairing list whatsapp
```

向导里的手机号提示用于设置你的**allowlist/owner**，并不用于自动发送。如果你运行在个人 WhatsApp 号码上，请用该号码并启用 `channels.whatsapp.selfChatMode`。

## 聊天命令终止任务与停不下来

### 如何阻止内部系统消息显示在聊天中

多数内部或工具消息只在该会话启用 **verbose** 或 **reasoning** 时出现。

在出现问题的聊天中修复：
```
/verbose off
/reasoning off
```

若仍然很吵，请检查 Control UI 会话设置并把 verbose 设为 **inherit**。同时确认你没有在配置里把 `verboseDefault` 设为 `on` 的 bot profile。

文档：[Thinking and verbose](/tools/thinking)、[Security](/gateway/security#reasoning--verbose-output-in-groups)。

### 如何停止或取消运行中的任务

发送以下任意一条**单独消息**（不带斜杠）：

```
stop
abort
esc
wait
exit
interrupt
```

这些是终止触发词（不是斜杠命令）。

对于 exec 工具产生的后台进程，可以让 agent 运行：

```
process action:kill sessionId:XXX
```

斜杠命令概览见 [Slash commands](/tools/slash-commands)。

大多数命令必须以 `/` 开头单独发送，但少数快捷命令（如 `/status`）对 allowlist 发送者也可内联使用。

### 如何从 Telegram 发送 Discord 消息 Cross-context messaging denied

Moltbot 默认阻止**跨提供方**消息。若工具调用绑定到 Telegram，它不会发送到 Discord，除非你显式允许。

为该 agent 启用跨提供方：

```json5
{
  agents: {
    defaults: {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " }
          }
        }
      }
    }
  }
}
```

修改配置后重启 gateway。如果只想针对单一 agent，在 `agents.list[].tools.message` 下设置。

### 为什么机器人看起来忽略快速连续消息

队列模式控制新消息如何与正在运行的任务交互。用 `/queue` 切换模式：

- `steer` - 新消息重定向当前任务
- `followup` - 按顺序逐条运行
- `collect` - 批量收集后回复一次（默认）
- `steer-backlog` - 先重定向，再处理 backlog
- `interrupt` - 中断当前任务并重新开始

可添加选项如 `debounce:2s cap:25 drop:summarize` 用于 followup 模式。

## 只回答截图或聊天记录中的具体问题

**问：**“Anthropic 使用 API key 时默认模型是什么？”

**答：** 在 Moltbot 中，认证与模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在认证 profiles 中存储 Anthropic API key）仅是启用认证，实际默认模型取决于你在 `agents.defaults.model.primary` 中配置的值（例如 `anthropic/claude-sonnet-4-5` 或 `anthropic/claude-opus-4-5`）。如果你看到 `No credentials found for profile "anthropic:default"`，说明 Gateway 在运行的 agent 的 `auth-profiles.json` 里找不到 Anthropic 凭据。

---

仍然卡住？在 [Discord](https://discord.com/invite/clawd) 提问或在 [GitHub discussion](https://github.com/moltbot/moltbot/discussions) 发起讨论。
