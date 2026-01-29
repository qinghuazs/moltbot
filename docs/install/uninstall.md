---
summary: "完全卸载 Moltbot（CLI、服务、状态、工作区）"
read_when:
  - 你想从机器上移除 Moltbot
  - 卸载后 gateway 服务仍在运行
---

# 卸载

有两条路径：
- **简单路径**：`moltbot` 仍在。
- **手动移除服务**：CLI 已不存在但服务还在运行。

## 简单路径（CLI 仍已安装）

推荐：使用内置卸载器：

```bash
moltbot uninstall
```

非交互（自动化 / npx）：

```bash
moltbot uninstall --all --yes --non-interactive
npx -y moltbot uninstall --all --yes --non-interactive
```

手动步骤（结果相同）：

1) 停止 gateway 服务：

```bash
moltbot gateway stop
```

2) 卸载 gateway 服务（launchd/systemd/schtasks）：

```bash
moltbot gateway uninstall
```

3) 删除状态与配置：

```bash
rm -rf "${CLAWDBOT_STATE_DIR:-$HOME/.clawdbot}"
```

如果你将 `CLAWDBOT_CONFIG_PATH` 指向状态目录之外的自定义位置，也要删除该文件。

4) 删除工作区（可选，会移除 agent 文件）：

```bash
rm -rf ~/clawd
```

5) 移除 CLI 安装（选择你使用的方式）：

```bash
npm rm -g moltbot
pnpm remove -g moltbot
bun remove -g moltbot
```

6) 如果你安装了 macOS 应用：

```bash
rm -rf /Applications/Moltbot.app
```

说明：
- 如果你使用了 profiles（`--profile` / `CLAWDBOT_PROFILE`），对每个状态目录重复步骤 3（默认是 `~/.clawdbot-<profile>`）。
- 远程模式下，状态目录在**gateway 主机**上，所以步骤 1-4 也要在那台机器执行。

## 手动移除服务（CLI 未安装）

当 gateway 服务仍在运行但 `moltbot` 不存在时使用。

### macOS（launchd）

默认 label 是 `bot.molt.gateway`（或 `bot.molt.<profile>`；旧的 `com.clawdbot.*` 可能仍存在）：

```bash
launchctl bootout gui/$UID/bot.molt.gateway
rm -f ~/Library/LaunchAgents/bot.molt.gateway.plist
```

如果你使用了 profile，把 label 和 plist 名替换为 `bot.molt.<profile>`。如存在旧的 `com.clawdbot.*` plists 也一并删除。

### Linux（systemd 用户单元）

默认 unit 名称是 `moltbot-gateway.service`（或 `moltbot-gateway-<profile>.service`）：

```bash
systemctl --user disable --now moltbot-gateway.service
rm -f ~/.config/systemd/user/moltbot-gateway.service
systemctl --user daemon-reload
```

### Windows（计划任务）

默认任务名称是 `Moltbot Gateway`（或 `Moltbot Gateway (<profile>)`）。
任务脚本位于你的状态目录下。

```powershell
schtasks /Delete /F /TN "Moltbot Gateway"
Remove-Item -Force "$env:USERPROFILE\.clawdbot\gateway.cmd"
```

如果你使用了 profile，删除匹配的任务名称和 `~\.clawdbot-<profile>\gateway.cmd`。

## 普通安装与源码检出

### 普通安装（install.sh / npm / pnpm / bun）

如果你通过 `https://molt.bot/install.sh` 或 `install.ps1` 安装，CLI 是通过 `npm install -g moltbot@latest` 安装的。
用 `npm rm -g moltbot` 移除（或 `pnpm remove -g` / `bun remove -g`）。

### 源码检出（git clone）

如果你从仓库检出运行（`git clone` + `moltbot ...` / `bun run moltbot ...`）：

1) 在删除仓库前**先卸载 gateway 服务**（使用上面的简单路径或手动移除服务）。
2) 删除仓库目录。
3) 删除状态和工作区（如上）。
