---
summary: "安全更新 Moltbot（全局安装或源码安装），以及回滚策略"
read_when:
  - 更新 Moltbot
  - 更新后出现问题
---

# 更新

Moltbot 仍处于快速迭代阶段（1.0 之前）。把更新当作发布基础设施对待：更新 → 运行检查 → 重启（或使用会自动重启的 `moltbot update`）→ 验证。

## 推荐：重新运行网站安装器（原地升级）

**首选**的更新路径是重新运行网站安装器。它会检测已有安装，原地升级，并在需要时运行 `moltbot doctor`。

```bash
curl -fsSL https://molt.bot/install.sh | bash
```

说明：
- 如果不想再次运行引导向导，加 `--no-onboard`。
- **源码安装**请使用：
  ```bash
  curl -fsSL https://molt.bot/install.sh | bash -s -- --install-method git --no-onboard
  ```
  安装器只有在仓库干净时才会执行 `git pull --rebase`。
- **全局安装**时，该脚本内部使用 `npm install -g moltbot@latest`。
- 兼容性说明：`moltbot` 仍可作为兼容 shim 使用。

## 更新前准备

- 确认你的安装方式：**全局**（npm/pnpm）还是**源码**（git clone）。
- 确认 Gateway 的运行方式：**前台终端**还是**受监控服务**（launchd/systemd）。
- 备份你的定制：
  - 配置：`~/.clawdbot/moltbot.json`
  - 凭据：`~/.clawdbot/credentials/`
  - 工作区：`~/clawd`

## 更新（全局安装）

全局安装（任选其一）：

```bash
npm i -g moltbot@latest
```

```bash
pnpm add -g moltbot@latest
```

我们**不**推荐在 Gateway 运行时使用 Bun（WhatsApp/Telegram bug）。

切换更新通道（git 与 npm 安装均适用）：

```bash
moltbot update --channel beta
moltbot update --channel dev
moltbot update --channel stable
```

使用 `--tag <dist-tag|version>` 进行一次性指定版本安装。

通道语义和发行说明见：[Development channels](/install/development-channels)。

注意：npm 安装会在启动时记录更新提示（检查当前通道的 tag）。通过 `update.checkOnStart: false` 可禁用。

然后：

```bash
moltbot doctor
moltbot gateway restart
moltbot health
```

说明：
- 如果 Gateway 以服务方式运行，优先使用 `moltbot gateway restart`，不要直接杀进程。
- 如果你固定在特定版本，见下方 “回滚与版本锁定”。

## 更新（`moltbot update`）

**源码安装**（git 检出）优先使用：

```bash
moltbot update
```

它会运行一个相对安全的更新流程：
- 要求工作区干净。
- 切换到所选通道（tag 或分支）。
- 从配置的上游拉取并 rebase（dev 通道）。
- 安装依赖、构建、构建 Control UI，并运行 `moltbot doctor`。
- 默认重启 gateway（用 `--no-restart` 跳过）。

如果你通过 **npm/pnpm** 安装（没有 git 元数据），`moltbot update` 会尝试通过包管理器更新。若无法识别安装方式，请使用“更新（全局安装）”。

## 更新（Control UI / RPC）

Control UI 提供 **Update & Restart**（RPC：`update.run`）。它会：
1) 对源码安装执行与 `moltbot update` 相同的更新流程（仅 git 检出）。
2) 写入带结构化报告的重启哨兵（stdout/stderr 尾部）。
3) 重启 gateway，并向最近活跃的会话发送报告。

如果 rebase 失败，gateway 会放弃更新并重启，不应用变更。

## 更新（从源码）

从仓库检出目录：

推荐：

```bash
moltbot update
```

手动（大致等价）：

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # 首次运行会自动安装 UI 依赖
moltbot doctor
moltbot health
```

说明：
- 当你运行打包的 `moltbot` 二进制（[`moltbot.mjs`](https://github.com/moltbot/moltbot/blob/main/moltbot.mjs)）或用 Node 运行 `dist/` 时，`pnpm build` 很重要。
- 如果你在仓库检出目录中没有全局安装，用 `pnpm moltbot ...` 执行 CLI 命令。
- 如果你直接从 TypeScript 运行（`pnpm moltbot ...`），通常不需要重新构建，但**配置迁移仍然适用**，请运行 doctor。
- 在全局安装与 git 安装之间切换很容易：安装另一种方式后运行 `moltbot doctor`，以便将 gateway 服务入口更新为当前安装方式。

## 始终运行：`moltbot doctor`

Doctor 是“安全更新”命令。它刻意保持简单：修复 + 迁移 + 警告。

注意：如果你是**源码安装**（git 检出），`moltbot doctor` 会先提示运行 `moltbot update`。

它通常会做：
- 迁移已弃用的配置键或旧的配置文件位置。
- 审核 DM 策略，并在风险较高的“open”设置上提示。
- 检查 Gateway 健康状态，并可提示重启。
- 检测并迁移旧的 gateway 服务（launchd/systemd；旧 schtasks）到当前 Moltbot 服务。
- 在 Linux 上确保 systemd user lingering（保证注销后 Gateway 仍运行）。

详情：[Doctor](/gateway/doctor)

## 启动 停止 重启 Gateway

CLI（不依赖操作系统）：

```bash
moltbot gateway status
moltbot gateway stop
moltbot gateway restart
moltbot gateway --port 18789
moltbot logs --follow
```

如果你受监控运行：
- macOS launchd（应用自带 LaunchAgent）：`launchctl kickstart -k gui/$UID/bot.molt.gateway`（使用 `bot.molt.<profile>`；旧 `com.clawdbot.*` 仍可用）
- Linux systemd 用户服务：`systemctl --user restart moltbot-gateway[-<profile>].service`
- Windows（WSL2）：`systemctl --user restart moltbot-gateway[-<profile>].service`
  - 只有在服务已安装时 `launchctl`/`systemctl` 才能用，否则先执行 `moltbot gateway install`。

运行手册与准确的服务标签：[Gateway runbook](/gateway)

## 回滚与版本锁定（出问题时）

### 锁定版本（全局安装）

安装一个已知可用的版本（将 `<version>` 替换为最后正常工作的版本）：

```bash
npm i -g moltbot@<version>
```

```bash
pnpm add -g moltbot@<version>
```

提示：查看当前已发布版本可运行 `npm view moltbot version`。

然后重启并重新运行 doctor：

```bash
moltbot doctor
moltbot gateway restart
```

### 按日期锁定（源码）

选择某个日期的提交（示例：“2026-01-01 时 main 的状态”）：

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
```

然后重新安装依赖并重启：

```bash
pnpm install
pnpm build
moltbot gateway restart
```

如果你之后想回到最新：

```bash
git checkout main
git pull
```

## 如果卡住了

- 再次运行 `moltbot doctor` 并仔细阅读输出（经常会直接给出修复方案）。
- 查看：[Troubleshooting](/gateway/troubleshooting)
- 进入 Discord 求助：https://channels.discord.gg/clawd
