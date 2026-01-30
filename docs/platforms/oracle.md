---
summary: "在 Oracle Cloud 上运行 Moltbot（Always Free ARM）"
read_when:
  - 在 Oracle Cloud 上搭建 Moltbot
  - 寻找低成本 Moltbot VPS 托管
  - 想在小服务器上 24/7 运行 Moltbot
---

# 在 Oracle Cloud 上运行 Moltbot（OCI）

## 目标

在 Oracle Cloud 的 **Always Free** ARM 层运行常驻 Moltbot Gateway。

Oracle 免费层非常适合 Moltbot（特别是你已有 OCI 账号时），但有一些权衡：

- ARM 架构（多数可用，但部分二进制仅 x86）
- 容量与注册可能比较挑剔

## 费用对比（2026）

| 提供商 | 方案 | 规格 | 月费 | 说明 |
|----------|------|-------|----------|-------|
| Oracle Cloud | Always Free ARM | 最高 4 OCPU, 24GB RAM | $0 | ARM，容量有限 |
| Hetzner | CX22 | 2 vCPU, 4GB RAM | ~ $4 | 最便宜的付费选项 |
| DigitalOcean | Basic | 1 vCPU, 1GB RAM | $6 | 简单 UI，文档友好 |
| Vultr | Cloud Compute | 1 vCPU, 1GB RAM | $6 | 位置多 |
| Linode | Nanode | 1 vCPU, 1GB RAM | $5 | 现属 Akamai |

---

## 先决条件

- Oracle Cloud 账号（[注册](https://www.oracle.com/cloud/free/)）——遇到问题可参考 [社区注册指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 账号（tailscale.com 免费）
- 约 30 分钟

## 1) 创建 OCI 实例

1. 登录 [Oracle Cloud Console](https://cloud.oracle.com/)
2. 进入 **Compute → Instances → Create Instance**
3. 配置：
   - **Name：** `moltbot`
   - **Image：** Ubuntu 24.04 (aarch64)
   - **Shape：** `VM.Standard.A1.Flex`（Ampere ARM）
   - **OCPUs：** 2（或最多 4）
   - **Memory：** 12 GB（或最多 24 GB）
   - **Boot volume：** 50 GB（最高 200 GB 免费）
   - **SSH key：** 添加你的公钥
4. 点击 **Create**
5. 记录公网 IP

**提示：** 如果提示 “Out of capacity”，尝试换可用区或稍后重试。免费层容量有限。

## 2) 连接并更新

```bash
# 通过公网 IP 连接
ssh ubuntu@YOUR_PUBLIC_IP

# 更新系统
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential
```

**说明：** `build-essential` 对 ARM 依赖编译很重要。

## 3) 配置用户与主机名

```bash
# 设置主机名
sudo hostnamectl set-hostname moltbot

# 为 ubuntu 用户设置密码
sudo passwd ubuntu

# 启用 lingering（保持用户服务在登出后运行）
sudo loginctl enable-linger ubuntu
```

## 4) 安装 Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=moltbot
```

这会启用 Tailscale SSH，因此你可以在 tailnet 的任意设备通过 `ssh moltbot` 连接，无需公网 IP。

验证：
```bash
tailscale status
```

**从现在开始建议通过 Tailscale 连接：** `ssh ubuntu@moltbot`（或使用 Tailscale IP）。

## 5) 安装 Moltbot

```bash
curl -fsSL https://molt.bot/install.sh | bash
source ~/.bashrc
```

当提示 “How do you want to hatch your bot?” 时，选择 **“Do this later”**。

> 说明：如果遇到 ARM 原生构建问题，先安装系统包（例如 `sudo apt install -y build-essential`），再考虑 Homebrew。

## 6) 配置 Gateway（loopback + token）并启用 Tailscale Serve

默认使用 token 认证。它可预测，且无需任何 “不安全认证” 的 Control UI 标志。

```bash
# 保持 Gateway 在 VM 上私有
moltbot config set gateway.bind loopback

# 为 Gateway + Control UI 启用认证
moltbot config set gateway.auth.mode token
moltbot doctor --generate-gateway-token

# 通过 Tailscale Serve 暴露（HTTPS + tailnet 访问）
moltbot config set gateway.tailscale.mode serve
moltbot config set gateway.trustedProxies '["127.0.0.1"]'

systemctl --user restart moltbot-gateway
```

## 7) 验证

```bash
# 查看版本
moltbot --version

# 检查 daemon 状态
systemctl --user status moltbot-gateway

# 检查 Tailscale Serve
tailscale serve status

# 测试本地响应
curl http://localhost:18789
```

## 8) 锁定 VCN 安全规则

确认运行正常后，锁定 VCN 仅允许 Tailscale。OCI 的 Virtual Cloud Network 在网络边缘充当防火墙，流量在到达实例前就被阻断。

1. 在 OCI Console 进入 **Networking → Virtual Cloud Networks**
2. 点击你的 VCN → **Security Lists** → Default Security List
3. **移除**所有入站规则，仅保留：
   - `0.0.0.0/0 UDP 41641`（Tailscale）
4. 保持默认出站规则（允许所有出站）

这样会在网络边缘阻断 22 端口 SSH、HTTP、HTTPS 等所有流量。从此只能通过 Tailscale 连接。

---

## 访问 Control UI

在任意 Tailscale 设备上打开：

```
https://moltbot.<tailnet-name>.ts.net/
```

将 `<tailnet-name>` 替换为你的 tailnet 名称（可在 `tailscale status` 中看到）。

无需 SSH 隧道。Tailscale 提供：
- HTTPS 加密（自动证书）
- 通过 Tailscale 身份认证
- 任何 tailnet 设备访问（笔记本、手机等）

---

## 安全：VCN + Tailscale（推荐基线）

当 VCN 锁定（仅 UDP 41641）且 Gateway 绑定 loopback 时，你获得强防御纵深：公网流量在网络边缘被阻断，管理访问走 tailnet。

此方案通常**无需**额外的主机防火墙来防止全网 SSH 暴力破解，但仍建议保持系统更新、运行 `moltbot security audit`，并确认没有意外监听公网地址。

### 已经保护的内容

| 传统步骤 | 需要吗 | 原因 |
|------------------|---------|-----|
| UFW 防火墙 | 否 | VCN 在流量到达实例前就阻断 |
| fail2ban | 否 | 端口 22 在 VCN 层已阻断，无暴力破解 |
| sshd 加固 | 否 | Tailscale SSH 不使用 sshd |
| 禁用 root 登录 | 否 | Tailscale 使用身份认证而非系统用户 |
| 仅 SSH key 认证 | 否 | Tailscale 通过 tailnet 认证 |
| IPv6 加固 | 通常不需要 | 取决于你的 VCN/subnet；请确认实际分配与暴露 |

### 仍然建议

- **凭据权限：** `chmod 700 ~/.clawdbot`
- **安全审计：** `moltbot security audit`
- **系统更新：** 定期 `sudo apt update && sudo apt upgrade`
- **监控 Tailscale：** 在 [Tailscale 管理控制台](https://login.tailscale.com/admin) 查看设备

### 验证安全姿态

```bash
# 确认没有公网端口监听
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# 验证 Tailscale SSH 启用
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# 可选：完全禁用 sshd
sudo systemctl disable --now ssh
```

---

## 备选方案：SSH 隧道

如果 Tailscale Serve 无法使用，请用 SSH 隧道：

```bash
# 在本地机器上（通过 Tailscale）
ssh -L 18789:127.0.0.1:18789 ubuntu@moltbot
```

然后打开 `http://localhost:18789`。

---

## 故障排查

### 实例创建失败（“Out of capacity”）

免费层 ARM 实例很抢手。尝试：
- 换可用区
- 在非高峰时段重试（清晨）
- 选择机型时使用 “Always Free” 过滤

### Tailscale 无法连接
```bash
# 查看状态
sudo tailscale status

# 重新认证
sudo tailscale up --ssh --hostname=moltbot --reset
```

### Gateway 无法启动
```bash
moltbot gateway status
moltbot doctor --non-interactive
journalctl --user -u moltbot-gateway -n 50
```

### 无法访问 Control UI
```bash
# 验证 Tailscale Serve 正在运行
tailscale serve status

# 检查 gateway 监听
curl http://localhost:18789

# 必要时重启
systemctl --user restart moltbot-gateway
```

### ARM 二进制问题

部分工具可能没有 ARM 构建。检查：
```bash
uname -m  # 应显示 aarch64
```

多数 npm 包可正常运行。二进制则寻找 `linux-arm64` 或 `aarch64` 版本。

---

## 持久化

所有状态存储在：
- `~/.clawdbot/` — 配置、凭据、会话数据
- `~/clawd/` — 工作区（SOUL.md、memory、产物）

定期备份：
```bash
tar -czvf moltbot-backup.tar.gz ~/.clawdbot ~/clawd
```

---

## 另见

- [Gateway remote access](/gateway/remote) — 其他远程访问方案
- [Tailscale integration](/gateway/tailscale) — 完整 Tailscale 文档
- [Gateway configuration](/gateway/configuration) — 全部配置项
- [DigitalOcean guide](/platforms/digitalocean) — 付费且更容易注册
- [Hetzner guide](/platforms/hetzner) — Docker 方案替代
