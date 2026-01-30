---
summary: "在 DigitalOcean 上运行 Moltbot（简单的付费 VPS 方案）"
read_when:
  - 在 DigitalOcean 上搭建 Moltbot
  - 寻找便宜的 Moltbot VPS 托管
---

# 在 DigitalOcean 上运行 Moltbot

## 目标

在 DigitalOcean 上运行常驻 Moltbot Gateway，**$6/月**（或预留价格 $4/月）。

如果你希望 $0/月 且不介意 ARM 与厂商特定配置，请看 [Oracle Cloud 指南](/platforms/oracle)。

## 费用对比（2026）

| 提供商 | 方案 | 规格 | 月费 | 说明 |
|----------|------|-------|----------|-------|
| Oracle Cloud | Always Free ARM | 最高 4 OCPU, 24GB RAM | $0 | ARM，容量有限/注册麻烦 |
| Hetzner | CX22 | 2 vCPU, 4GB RAM | €3.79 (~$4) | 最便宜的付费选项 |
| DigitalOcean | Basic | 1 vCPU, 1GB RAM | $6 | 简单 UI，文档友好 |
| Vultr | Cloud Compute | 1 vCPU, 1GB RAM | $6 | 位置多 |
| Linode | Nanode | 1 vCPU, 1GB RAM | $5 | 现属 Akamai |

**选择建议：**
- DigitalOcean：最简单、可预测的设置（本指南）
- Hetzner：价格/性能更好（见 [Hetzner guide](/platforms/hetzner)）
- Oracle Cloud：可 $0/月，但更挑剔且仅 ARM（见 [Oracle guide](/platforms/oracle)）

---

## 先决条件

- DigitalOcean 账号（[注册可领 $200 额度](https://m.do.co/c/signup)）
- SSH 密钥对（或愿意使用密码认证）
- 约 20 分钟

## 1) 创建 Droplet

1. 登录 [DigitalOcean](https://cloud.digitalocean.com/)
2. 点击 **Create → Droplets**
3. 选择：
   - **Region：** 选择离你或用户最近的地区
   - **Image：** Ubuntu 24.04 LTS
   - **Size：** Basic → Regular → **$6/月**（1 vCPU, 1GB RAM, 25GB SSD）
   - **Authentication：** SSH key（推荐）或密码
4. 点击 **Create Droplet**
5. 记录 IP 地址

## 2) 通过 SSH 连接

```bash
ssh root@YOUR_DROPLET_IP
```

## 3) 安装 Moltbot

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 安装 Moltbot
curl -fsSL https://molt.bot/install.sh | bash

# 验证
moltbot --version
```

## 4) 运行引导

```bash
moltbot onboard --install-daemon
```

向导会引导：
- 模型认证（API key 或 OAuth）
- 渠道设置（Telegram、WhatsApp、Discord 等）
- Gateway token（自动生成）
- Daemon 安装（systemd）

## 5) 验证 Gateway

```bash
# 查看状态
moltbot status

# 检查服务
systemctl --user status moltbot-gateway.service

# 查看日志
journalctl --user -u moltbot-gateway.service -f
```

## 6) 访问仪表盘

Gateway 默认绑定 loopback。访问 Control UI：

**方式 A：SSH 隧道（推荐）**
```bash
# 在本地机器上
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# 然后打开：http://localhost:18789
```

**方式 B：Tailscale Serve（HTTPS，loopback-only）**
```bash
# 在 droplet 上
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# 配置 Gateway 使用 Tailscale Serve
moltbot config set gateway.tailscale.mode serve
moltbot gateway restart
```

打开：`https://<magicdns>/`

说明：
- Serve 保持 Gateway 仅 loopback，并通过 Tailscale 身份头认证。
- 若要强制 token/password，设置 `gateway.auth.allowTailscale: false` 或使用 `gateway.auth.mode: "password"`。

**方式 C：Tailnet 绑定（不使用 Serve）**
```bash
moltbot config set gateway.bind tailnet
moltbot gateway restart
```

打开：`http://<tailscale-ip>:18789`（需要 token）。

## 7) 连接渠道

### Telegram
```bash
moltbot pairing list telegram
moltbot pairing approve telegram <CODE>
```

### WhatsApp
```bash
moltbot channels login whatsapp
# 扫描二维码
```

其他渠道见 [Channels](/channels)。

---

## 1GB RAM 优化

$6 方案只有 1GB RAM。为稳定运行：

### 添加 swap（推荐）
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 使用更轻量模型

如果遇到 OOM：
- 使用 API 模型（Claude、GPT）而不是本地模型
- 把 `agents.defaults.model.primary` 设为更小的模型

### 监控内存
```bash
free -h
htop
```

---

## 持久化

所有状态存储在：
- `~/.clawdbot/` — 配置、凭据、会话数据
- `~/clawd/` — 工作区（SOUL.md、memory 等）

这些在重启后仍保留。请定期备份：
```bash
tar -czvf moltbot-backup.tar.gz ~/.clawdbot ~/clawd
```

---

## Oracle Cloud 免费替代

Oracle Cloud 提供 **Always Free** ARM 实例，性能显著强于本文任意付费选项，且 $0/月。

| 你获得的资源 | 规格 |
|--------------|-------|
| **4 OCPUs** | ARM Ampere A1 |
| **24GB RAM** | 充足 |
| **200GB storage** | Block volume |
| **Forever free** | 不收费 |

**注意事项：**
- 注册可能较挑剔（失败可重试）
- ARM 架构 —— 多数可用，但部分二进制需 ARM 构建

完整设置见 [Oracle Cloud](/platforms/oracle)。注册与排障建议见此 [社区指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)。

---

## 故障排查

### Gateway 无法启动
```bash
moltbot gateway status
moltbot doctor --non-interactive
journalctl -u moltbot --no-pager -n 50
```

### 端口已被占用
```bash
lsof -i :18789
kill <PID>
```

### 内存不足
```bash
# 查看内存
free -h

# 增加 swap
# 或升级到 $12/月 droplet（2GB RAM）
```

---

## 另见

- [Hetzner guide](/platforms/hetzner) — 更便宜 更强
- [Docker install](/install/docker) — 容器化方案
- [Tailscale](/gateway/tailscale) — 安全远程访问
- [Configuration](/gateway/configuration) — 完整配置参考
