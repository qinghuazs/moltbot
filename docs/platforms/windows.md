---
summary: "Windows（WSL2）支持与伴侣应用状态"
read_when:
  - 在 Windows 上安装 Moltbot
  - 查看 Windows 伴侣应用状态
---
# Windows（WSL2）

Windows 上运行 Moltbot 推荐**使用 WSL2**（推荐 Ubuntu）。
CLI + Gateway 在 Linux 内运行，这能保持运行时一致，并显著提升工具兼容性（Node/Bun/pnpm、Linux 二进制、技能）。
原生 Windows 安装未充分测试且更容易出问题。

原生 Windows 伴侣应用正在计划中。

## 安装（WSL2）
- [Getting Started](/start/getting-started)（在 WSL 内使用）
- [Install & updates](/install/updating)
- 官方 WSL2 指南（Microsoft）：https://learn.microsoft.com/windows/wsl/install

## Gateway
- [Gateway runbook](/gateway)
- [Configuration](/gateway/configuration)

## Gateway 服务安装（CLI）

在 WSL2 内：

```
moltbot onboard --install-daemon
```

或：

```
moltbot gateway install
```

或：

```
moltbot configure
```

提示时选择 **Gateway service**。

修复/迁移：

```
moltbot doctor
```

## 高级：将 WSL 服务暴露到局域网（portproxy）

WSL 有独立的虚拟网络。如果其他机器需要访问**运行在 WSL 内**的服务（SSH、本地 TTS 服务器或 Gateway），你必须把 Windows 端口转发到当前 WSL IP。WSL IP 在重启后会变化，因此可能需要刷新转发规则。

示例（PowerShell **管理员**）：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

在 Windows 防火墙放行该端口（一次性）：

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

WSL 重启后刷新 portproxy：

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

说明：
- 其他机器 SSH 到**Windows 主机 IP**（示例：`ssh user@windows-host -p 2222`）。
- 远程节点必须指向**可达**的 Gateway URL（不是 `127.0.0.1`）；用 `moltbot status --all` 确认。
- `listenaddress=0.0.0.0` 用于局域网访问；`127.0.0.1` 仅本地。
- 若想自动化，可注册计划任务在登录时运行刷新步骤。

## WSL2 分步安装

### 1) 安装 WSL2 + Ubuntu

打开 PowerShell（管理员）：

```powershell
wsl --install
# 或显式选择发行版：
wsl --list --online
wsl --install -d Ubuntu-24.04
```

如果 Windows 提示重启，请重启。

### 2) 启用 systemd（Gateway 安装所需）

在 WSL 终端：

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

然后在 PowerShell：

```powershell
wsl --shutdown
```

重新打开 Ubuntu，再验证：

```bash
systemctl --user status
```

### 3) 在 WSL 内安装 Moltbot

按 WSL 内的 Linux Getting Started 流程：

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build
moltbot onboard
```

完整指南：[Getting Started](/start/getting-started)

## Windows 伴侣应用

目前还没有 Windows 伴侣应用。如果你想参与贡献，我们欢迎帮助推进。
