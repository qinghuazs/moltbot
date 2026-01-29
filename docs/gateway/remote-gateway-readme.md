---
summary: "Moltbot.app 通过 SSH 隧道连接远程网关"
read_when: "通过 SSH 将 macOS 应用连接到远程网关"
---

# 使用远程 Gateway 运行 Moltbot.app

Moltbot.app 使用 SSH 隧道连接远程 Gateway。本指南说明如何设置。

## 概览

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Machine                          │
│                                                              │
│  Moltbot.app ──► ws://127.0.0.1:18789 (local port)           │
│                     │                                        │
│                     ▼                                        │
│  SSH Tunnel ────────────────────────────────────────────────│
│                     │                                        │
└─────────────────────┼──────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                         Remote Machine                        │
│                                                              │
│  Gateway WebSocket ──► ws://127.0.0.1:18789 ──►              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 快速设置

### 步骤 1：添加 SSH 配置

编辑 `~/.ssh/config` 并添加：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>          # 例如 172.27.187.184
    User <REMOTE_USER>            # 例如 user
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

将 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替换为你的值。

### 步骤 2：复制 SSH 公钥

将公钥复制到远端机器（只需输入一次密码）：

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

### 步骤 3：设置 Gateway Token

```bash
launchctl setenv CLAWDBOT_GATEWAY_TOKEN "<your-token>"
```

### 步骤 4：启动 SSH 隧道

```bash
ssh -N remote-gateway &
```

### 步骤 5：重启 Moltbot.app

```bash
# 退出 Moltbot.app（⌘Q），然后重新打开：
open /path/to/Moltbot.app
```

应用现在会通过 SSH 隧道连接远程 Gateway。

---

## 登录后自动启动隧道

若想在登录后自动启动 SSH 隧道，可创建 Launch Agent。

### 创建 PLIST 文件

保存为 `~/Library/LaunchAgents/bot.molt.ssh-tunnel.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>bot.molt.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/ssh</string>
        <string>-N</string>
        <string>remote-gateway</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

### 加载 Launch Agent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/bot.molt.ssh-tunnel.plist
```

隧道将会：
- 登录时自动启动
- 崩溃后自动重启
- 在后台持续运行

遗留提示：如存在 `com.clawdbot.ssh-tunnel` LaunchAgent，请移除。

---

## 故障排查

**检查隧道是否在运行：**

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

**重启隧道：**

```bash
launchctl kickstart -k gui/$UID/bot.molt.ssh-tunnel
```

**停止隧道：**

```bash
launchctl bootout gui/$UID/bot.molt.ssh-tunnel
```

---

## 工作原理

| 组件 | 作用 |
|-----------|--------------|
| `LocalForward 18789 127.0.0.1:18789` | 将本地 18789 端口转发到远端 18789 端口 |
| `ssh -N` | 不执行远端命令的 SSH（只做端口转发） |
| `KeepAlive` | 隧道崩溃时自动重启 |
| `RunAtLoad` | Agent 加载时启动隧道 |

Moltbot.app 会连接你本机上的 `ws://127.0.0.1:18789`。SSH 隧道把该连接转发到远端机器上运行 Gateway 的 18789 端口。
