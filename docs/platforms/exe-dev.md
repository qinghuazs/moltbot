---
summary: "在 exe.dev 上运行 Moltbot Gateway（VM + HTTPS 代理）以便远程访问"
read_when:
  - 你想用廉价的常驻 Linux 主机运行 Gateway
  - 你想不自建 VPS 就远程访问 Control UI
---

# exe.dev

目标：在 exe.dev 的 VM 上运行 Moltbot Gateway，并通过 `https://<vm-name>.exe.xyz` 从笔记本访问。

本页默认 exe.dev 的 **exeuntu** 镜像。如果你选了其他发行版，请自行映射包名。

## 新手快速路径

1) [https://exe.new/moltbot](https://exe.new/moltbot)
2) 按需填写 auth key/token
3) 点击你 VM 旁的 “Agent”，等待……
4) ???
5) Profit

## 你需要准备

- exe.dev 账号
- 通过 `ssh exe.dev` 访问 [exe.dev](https://exe.dev) 虚拟机（可选）


## 使用 Shelley 自动安装

Shelley（[exe.dev](https://exe.dev) 的 agent）可以用我们的提示语即时安装 Moltbot。
提示语如下：

```
Set up Moltbot (https://docs.molt.bot/install) on this VM. Use the non-interactive and accept-risk flags for moltbot onboarding. Add the supplied auth or token as needed. Configure nginx to forward from the default port 18789 to the root location on the default enabled site config, making sure to enable Websocket support. Pairing is done by "moltbot devices list" and "moltbot device approve <request id>". Make sure the dashboard shows that Moltbot's health is OK. exe.dev handles forwarding from port 8000 to port 80/443 and HTTPS for us, so the final "reachable" should be <vm-name>.exe.xyz, without port specification.
```

## 手动安装

## 1) 创建 VM

在你的设备上：

```bash
ssh exe.dev new 
```

然后连接：

```bash
ssh <vm-name>.exe.xyz
```

提示：保持该 VM **有状态**。Moltbot 状态保存在 `~/.clawdbot/` 与 `~/clawd/`。

## 2) 安装前置依赖（在 VM 上）

```bash
sudo apt-get update
sudo apt-get install -y git curl jq ca-certificates openssl
```

## 3) 安装 Moltbot

运行 Moltbot 安装脚本：

```bash
curl -fsSL https://molt.bot/install.sh | bash
```

## 4) 设置 nginx 将 Moltbot 代理到 8000 端口

编辑 `/etc/nginx/sites-enabled/default`：

```
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 8000;
    listen [::]:8000;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for long-lived connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

## 5) 访问 Moltbot 并授予权限

访问 `https://<vm-name>.exe.xyz/?token=YOUR-TOKEN-FROM-TERMINAL`。使用
`moltbot devices list` 与 `moltbot device approve` 批准设备。拿不准时，直接在浏览器里用 Shelley！

## 远程访问

远程访问由 [exe.dev](https://exe.dev) 的认证处理。默认情况下，来自 8000 端口的 HTTP 流量会转发到 `https://<vm-name>.exe.xyz` 并使用邮箱认证。

## 更新

```bash
npm i -g moltbot@latest
moltbot doctor
moltbot gateway restart
moltbot health
```

指南：[Updating](/install/updating)
