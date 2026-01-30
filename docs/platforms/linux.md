---
summary: "Linux 支持与伴侣应用状态"
read_when:
  - 查看 Linux 伴侣应用状态
  - 规划平台覆盖或贡献
---
# Linux 应用

Gateway 在 Linux 上完全支持。**推荐运行时是 Node**。
Gateway 不推荐使用 Bun（WhatsApp/Telegram 有已知问题）。

原生 Linux 伴侣应用在计划中。如果你想参与构建，欢迎贡献。

## 新手快捷路径（VPS）

1) 安装 Node 22+  
2) `npm i -g moltbot@latest`  
3) `moltbot onboard --install-daemon`  
4) 在你的笔记本上：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`  
5) 打开 `http://127.0.0.1:18789/` 并粘贴 token

VPS 分步指南：[exe.dev](/platforms/exe-dev)

## 安装
- [Getting Started](/start/getting-started)
- [Install & updates](/install/updating)
- 可选流程：[Bun (experimental)](/install/bun)、[Nix](/install/nix)、[Docker](/install/docker)

## Gateway
- [Gateway runbook](/gateway)
- [Configuration](/gateway/configuration)

## Gateway 服务安装（CLI）

任选一种：

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

## 系统控制（systemd 用户单元）

Moltbot 默认安装 systemd **用户**服务。对共享或常驻服务器请使用 **system** 服务。
完整 unit 示例与说明见 [Gateway runbook](/gateway)。

最小示例：

创建 `~/.config/systemd/user/moltbot-gateway[-<profile>].service`：

```
[Unit]
Description=Moltbot Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/moltbot gateway --port 18789
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

启用：

```
systemctl --user enable --now moltbot-gateway[-<profile>].service
```
