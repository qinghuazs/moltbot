---
summary: "在树莓派上运行 Moltbot（低成本自托管方案）"
read_when:
  - 在树莓派上搭建 Moltbot
  - 在 ARM 设备上运行 Moltbot
  - 构建低成本常驻个人 AI
---

# 在树莓派上运行 Moltbot

## 目标

用树莓派运行常驻 Moltbot Gateway，**一次性成本约 $35-80**（无月费）。

适合：
- 24/7 个人 AI 助理
- 家庭自动化中枢
- 低功耗、随时可用的 Telegram/WhatsApp 机器人

## 硬件要求

| Pi 型号 | RAM | 可用吗 | 说明 |
|----------|-----|--------|-------|
| **Pi 5** | 4GB/8GB | ✅ 最佳 | 最快，推荐 |
| **Pi 4** | 4GB | ✅ 良好 | 多数用户的甜点 |
| **Pi 4** | 2GB | ✅ 还行 | 可用，建议加 swap |
| **Pi 4** | 1GB | ⚠️ 紧张 | 可用但需 swap，尽量精简 |
| **Pi 3B+** | 1GB | ⚠️ 慢 | 能用但较卡 |
| **Pi Zero 2 W** | 512MB | ❌ | 不推荐 |

**最低规格：** 1GB RAM，1 核，500MB 磁盘  
**推荐：** 2GB+ RAM，64 位系统，16GB+ SD 卡（或 USB SSD）

## 你需要准备

- 树莓派 4 或 5（推荐 2GB+）
- MicroSD 卡（16GB+）或 USB SSD（性能更好）
- 电源（推荐官方电源）
- 网络连接（有线或 WiFi）
- 约 30 分钟

## 1) 刷写系统

使用 **Raspberry Pi OS Lite（64 位）**，无头服务器无需桌面。

1. 下载 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. 选择系统：**Raspberry Pi OS Lite (64-bit)**
3. 点击齿轮图标（⚙️）预配置：
   - 设置主机名：`gateway-host`
   - 启用 SSH
   - 设置用户名/密码
   - 配置 WiFi（若不用有线）
4. 刷写到 SD 卡或 USB 硬盘
5. 插入并启动树莓派

## 2) 通过 SSH 连接

```bash
ssh user@gateway-host
# 或使用 IP 地址
ssh user@192.168.x.x
```

## 3) 系统准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要包
sudo apt install -y git curl build-essential

# 设置时区（对 cron/提醒很重要）
sudo timedatectl set-timezone America/Chicago  # 换成你的时区
```

## 4) 安装 Node.js 22（ARM64）

```bash
# 通过 NodeSource 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node --version  # 应显示 v22.x.x
npm --version
```

## 5) 添加 Swap（2GB 或更小很重要）

Swap 可防止内存不足崩溃：

```bash
# 创建 2GB swap 文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 持久化
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 低内存优化（降低 swappiness）
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 6) 安装 Moltbot

### 方式 A：标准安装（推荐）

```bash
curl -fsSL https://molt.bot/install.sh | bash
```

### 方式 B：可黑客安装（便于折腾）

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
npm install
npm run build
npm link
```

可黑客安装能直接访问日志与源码，适合排查 ARM 相关问题。

## 7) 运行引导

```bash
moltbot onboard --install-daemon
```

跟随向导：
1. **Gateway 模式：** Local
2. **认证：** 推荐 API key（无头 Pi 上 OAuth 可能不稳定）
3. **渠道：** Telegram 最容易开始
4. **Daemon：** 是（systemd）

## 8) 验证安装

```bash
# 查看状态
moltbot status

# 检查服务
sudo systemctl status moltbot

# 查看日志
journalctl -u moltbot -f
```

## 9) 访问仪表盘

树莓派是无头设备，可使用 SSH 隧道：

```bash
# 在你的笔记本/台式机上
ssh -L 18789:localhost:18789 user@gateway-host

# 然后在浏览器打开
open http://localhost:18789
```

或使用 Tailscale 常驻访问：

```bash
# 在 Pi 上
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# 更新配置
moltbot config set gateway.bind tailnet
sudo systemctl restart moltbot
```

---

## 性能优化

### 使用 USB SSD（性能大幅提升）

SD 卡慢且易损耗。USB SSD 会显著改善性能：

```bash
# 检查是否从 USB 启动
lsblk
```

设置见 [Pi USB 启动指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

### 降低内存占用

```bash
# 禁用 GPU 内存分配（无头）
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt

# 不需要蓝牙时禁用
sudo systemctl disable bluetooth
```

### 监控资源

```bash
# 查看内存
free -h

# 查看 CPU 温度
vcgencmd measure_temp

# 实时监控
htop
```

---

## ARM 专项说明

### 二进制兼容性

大多数 Moltbot 功能在 ARM64 上可用，但一些外部二进制可能需要 ARM 构建：

| 工具 | ARM64 状态 | 说明 |
|------|--------------|-------|
| Node.js | ✅ | 正常可用 |
| WhatsApp（Baileys） | ✅ | 纯 JS，无问题 |
| Telegram | ✅ | 纯 JS，无问题 |
| gog（Gmail CLI） | ⚠️ | 检查是否有 ARM 版本 |
| Chromium（浏览器） | ✅ | `sudo apt install chromium-browser` |

如果某个技能失败，请检查其二进制是否有 ARM 构建。很多 Go/Rust 工具有，但也有不少没有。

### 32 位 vs 64 位

**务必使用 64 位系统。** Node.js 与许多现代工具都需要它。可用以下命令确认：

```bash
uname -m
# 应显示：aarch64（64 位），而不是 armv7l（32 位）
```

---

## 推荐模型配置

Pi 只运行 Gateway（模型在云端），建议使用 API 模型：

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514",
        "fallbacks": ["openai/gpt-4o-mini"]
      }
    }
  }
}
```

**不要**在 Pi 上跑本地 LLM，连小模型也太慢。把重活交给 Claude/GPT。

---

## 开机自启

引导向导会自动设置；验证方式：

```bash
# 检查服务是否启用
sudo systemctl is-enabled moltbot

# 未启用则开启
sudo systemctl enable moltbot

# 启动
sudo systemctl start moltbot
```

---

## 故障排查

### 内存不足（OOM）

```bash
# 查看内存
free -h

# 增加 swap（见步骤 5）
# 或减少树莓派上运行的服务
```

### 性能缓慢

- 用 USB SSD 替代 SD 卡
- 禁用不需要的服务：`sudo systemctl disable cups bluetooth avahi-daemon`
- 检查 CPU 降频：`vcgencmd get_throttled`（应返回 `0x0`）

### 服务无法启动

```bash
# 查看日志
journalctl -u moltbot --no-pager -n 100

# 常见修复：重新构建
cd ~/moltbot  # 使用可黑客安装时
npm run build
sudo systemctl restart moltbot
```

### ARM 二进制问题

若技能报 “exec format error”：
1. 检查是否有 ARM64 构建
2. 尝试从源码编译
3. 或使用支持 ARM 的 Docker 容器

### WiFi 断连

无头 Pi 的 WiFi 断连可尝试：

```bash
# 禁用 WiFi 省电
sudo iwconfig wlan0 power off

# 持久化
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## 成本对比

| 方案 | 一次性成本 | 月费 | 说明 |
|-------|---------------|--------------|-------|
| **Pi 4 (2GB)** | ~$45 | $0 | + 电费（约 $5/年） |
| **Pi 4 (4GB)** | ~$55 | $0 | 推荐 |
| **Pi 5 (4GB)** | ~$60 | $0 | 最佳性能 |
| **Pi 5 (8GB)** | ~$80 | $0 | 过度配置但更耐用 |
| DigitalOcean | $0 | $6/月 | $72/年 |
| Hetzner | $0 | €3.79/月 | ~$50/年 |

**回本周期：** 相比云 VPS，树莓派约 6-12 个月回本。

---

## 另见

- [Linux guide](/platforms/linux) — 通用 Linux 设置
- [DigitalOcean guide](/platforms/digitalocean) — 云端替代方案
- [Hetzner guide](/platforms/hetzner) — Docker 方案
- [Tailscale](/gateway/tailscale) — 远程访问
- [Nodes](/nodes) — 将你的笔记本/手机配对到 Pi gateway
