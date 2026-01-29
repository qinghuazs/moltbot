---
summary: "使用 Nix 以声明式方式安装 Moltbot"
read_when:
  - 你想要可复现 可回滚的安装
  - 你已经在用 Nix/NixOS/Home Manager
  - 你希望全部固定并用声明式方式管理
---

# Nix 安装

使用 Nix 运行 Moltbot 的推荐方式是 **[nix-moltbot](https://github.com/moltbot/nix-moltbot)**，这是一个带电池的 Home Manager 模块。

## 快速开始

把下面这段复制给你的 AI agent（Claude、Cursor 等）：

```text
I want to set up nix-moltbot on my Mac.
Repository: github:moltbot/nix-moltbot

What I need you to do:
1. Check if Determinate Nix is installed (if not, install it)
2. Create a local flake at ~/code/moltbot-local using templates/agent-first/flake.nix
3. Help me create a Telegram bot (@BotFather) and get my chat ID (@userinfobot)
4. Set up secrets (bot token, Anthropic key) - plain files at ~/.secrets/ is fine
5. Fill in the template placeholders and run home-manager switch
6. Verify: launchd running, bot responds to messages

Reference the nix-moltbot README for module options.
```

> **📦 完整指南：[github.com/moltbot/nix-moltbot](https://github.com/moltbot/nix-moltbot)**
>
> nix-moltbot 仓库是 Nix 安装的事实来源。本页面只是快速概览。

## 你将获得

- Gateway + macOS 应用 + 工具（whisper、spotify、cameras）— 全部固定版本
- 可在重启后继续运行的 launchd 服务
- 声明式配置的插件系统
- 即时回滚：`home-manager switch --rollback`

---

## Nix 模式运行行为

当设置了 `CLAWDBOT_NIX_MODE=1`（使用 nix-moltbot 时自动设置）：

Moltbot 支持 **Nix 模式**，让配置确定化并禁用自动安装流程。
通过导出环境变量启用：

```bash
CLAWDBOT_NIX_MODE=1
```

在 macOS 上，GUI 应用不会自动继承 shell 环境变量。也可以通过 defaults 启用 Nix 模式：

```bash
defaults write bot.molt.mac moltbot.nixMode -bool true
```

### 配置与状态路径

Moltbot 从 `CLAWDBOT_CONFIG_PATH` 读取 JSON5 配置，并把可变数据存入 `CLAWDBOT_STATE_DIR`。

- `CLAWDBOT_STATE_DIR`（默认：`~/.clawdbot`）
- `CLAWDBOT_CONFIG_PATH`（默认：`$CLAWDBOT_STATE_DIR/moltbot.json`）

在 Nix 下运行时，请把这些显式设置为 Nix 管理的位置，避免运行时状态与配置落到不可变 store 中。

### Nix 模式下的运行行为

- 禁用自动安装与自修改流程
- 缺失依赖时显示 Nix 专用的修复提示
- UI 在可用时显示只读的 Nix 模式横幅

## 打包说明（macOS）

macOS 打包流程需要一个稳定的 Info.plist 模板，路径为：

```
apps/macos/Sources/Moltbot/Resources/Info.plist
```

[`scripts/package-mac-app.sh`](https://github.com/moltbot/moltbot/blob/main/scripts/package-mac-app.sh) 会把该模板复制进 app bundle 并填充动态字段
（bundle ID、version/build、Git SHA、Sparkle keys）。这样可保证 SwiftPM 打包与 Nix 构建
（不依赖完整 Xcode 工具链）时的 plist 可确定性。

## 相关

- [nix-moltbot](https://github.com/moltbot/nix-moltbot) — 完整搭建指南
- [Wizard](/start/wizard) — 非 Nix CLI 安装
- [Docker](/install/docker) — 容器化安装
