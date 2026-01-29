---
summary: "使用 Ansible 自动化和加固部署 Moltbot，包含 Tailscale VPN 与防火墙隔离"
read_when:
  - 你想自动化部署并进行安全加固
  - 你需要通过 VPN 访问并使用防火墙隔离
  - 你要部署到远程 Debian/Ubuntu 服务器
---

# Ansible 安装

将 Moltbot 部署到生产服务器的推荐方式是 **[moltbot-ansible](https://github.com/moltbot/moltbot-ansible)** —— 一个安全优先的自动化安装器。

## 快速开始

一条命令安装：

```bash
curl -fsSL https://raw.githubusercontent.com/moltbot/moltbot-ansible/main/install.sh | bash
```

> **📦 完整指南：[github.com/moltbot/moltbot-ansible](https://github.com/moltbot/moltbot-ansible)**
>
> moltbot-ansible 仓库是 Ansible 部署的事实来源。本页面只是快速概览。

## 你将获得

- 🔒 **防火墙优先安全**：UFW + Docker 隔离（仅 SSH + Tailscale 可访问）
- 🔐 **Tailscale VPN**：安全远程访问，不对公网暴露服务
- 🐳 **Docker**：隔离沙箱容器，仅本地绑定
- 🛡️ **纵深防御**：4 层安全架构
- 🚀 **一键部署**：数分钟完成
- 🔧 **Systemd 集成**：开机自启动与安全加固

## 要求

- **系统**：Debian 11+ 或 Ubuntu 20.04+
- **权限**：root 或 sudo
- **网络**：可联网安装依赖
- **Ansible**：2.14+（快速安装脚本会自动安装）

## 将安装的内容

Ansible playbook 会安装并配置：

1. **Tailscale**（安全远程访问的 mesh VPN）
2. **UFW 防火墙**（仅开放 SSH + Tailscale 端口）
3. **Docker CE + Compose V2**（用于 agent 沙箱）
4. **Node.js 22.x + pnpm**（运行时依赖）
5. **Moltbot**（宿主机运行，不容器化）
6. **Systemd 服务**（开机自启并安全加固）

注意：gateway **直接在宿主机上运行**（不在 Docker 中），但 agent 沙箱使用 Docker 隔离。详见 [Sandboxing](/gateway/sandboxing)。

## 安装后设置

安装完成后切换到 moltbot 用户：

```bash
sudo -i -u moltbot
```

后续脚本会引导你完成：

1. **引导向导**：配置 Moltbot 设置
2. **提供方登录**：连接 WhatsApp/Telegram/Discord/Signal
3. **Gateway 测试**：验证安装
4. **Tailscale 设置**：加入 VPN mesh

### 快捷命令

```bash
# 查看服务状态
sudo systemctl status moltbot

# 查看实时日志
sudo journalctl -u moltbot -f

# 重启 gateway
sudo systemctl restart moltbot

# 提供方登录（以 moltbot 用户运行）
sudo -i -u moltbot
moltbot channels login
```

## 安全架构

### 4 层防护

1. **防火墙（UFW）**：仅对外开放 SSH（22）与 Tailscale（41641/udp）
2. **VPN（Tailscale）**：gateway 仅通过 VPN mesh 访问
3. **Docker 隔离**：DOCKER-USER iptables 链阻止外部端口暴露
4. **Systemd 加固**：NoNewPrivileges、PrivateTmp、非特权用户

### 验证

测试对外攻击面：

```bash
nmap -p- YOUR_SERVER_IP
```

应该只看到 **22 端口**（SSH）开放。其他服务（gateway、Docker）全部被锁定。

### Docker 可用性

Docker 用于**agent 沙箱**（隔离的工具执行），而非运行 gateway 本身。gateway 仅绑定到 localhost，并通过 Tailscale VPN 访问。

沙箱配置见：[Multi-Agent Sandbox & Tools](/multi-agent-sandbox-tools)。

## 手动安装

如果你更希望手动控制而不是自动化：

```bash
# 1. 安装前置依赖
sudo apt update && sudo apt install -y ansible git

# 2. 克隆仓库
git clone https://github.com/moltbot/moltbot-ansible.git
cd moltbot-ansible

# 3. 安装 Ansible 集合
ansible-galaxy collection install -r requirements.yml

# 4. 运行 playbook
./run-playbook.sh

# 或直接运行（之后手动执行 /tmp/moltbot-setup.sh）
# ansible-playbook playbook.yml --ask-become-pass
```

## 更新 Moltbot

Ansible 安装器默认使用手动更新。请参考 [Updating](/install/updating) 的标准更新流程。

若需要重新运行 Ansible playbook（例如配置变更）：

```bash
cd moltbot-ansible
./run-playbook.sh
```

说明：该过程幂等，可安全多次运行。

## 故障排查

### 防火墙阻断连接

如果你被锁在外面：
- 先确认可通过 Tailscale VPN 访问
- SSH（22 端口）始终允许
- gateway **按设计仅通过 Tailscale 访问**

### 服务无法启动

```bash
# 查看日志
sudo journalctl -u moltbot -n 100

# 检查权限
sudo ls -la /opt/moltbot

# 手动启动测试
sudo -i -u moltbot
cd ~/moltbot
pnpm start
```

### Docker 沙箱问题

```bash
# 确认 Docker 正在运行
sudo systemctl status docker

# 检查沙箱镜像
sudo docker images | grep moltbot-sandbox

# 若缺失则构建
cd /opt/moltbot/moltbot
sudo -u moltbot ./scripts/sandbox-setup.sh
```

### 提供方登录失败

确认你以 `moltbot` 用户运行：

```bash
sudo -i -u moltbot
moltbot channels login
```

## 高级配置

更详细的安全架构与排障：
- [Security Architecture](https://github.com/moltbot/moltbot-ansible/blob/main/docs/security.md)
- [Technical Details](https://github.com/moltbot/moltbot-ansible/blob/main/docs/architecture.md)
- [Troubleshooting Guide](https://github.com/moltbot/moltbot-ansible/blob/main/docs/troubleshooting.md)

## 相关

- [moltbot-ansible](https://github.com/moltbot/moltbot-ansible) — 完整部署指南
- [Docker](/install/docker) — 容器化 gateway 安装
- [Sandboxing](/gateway/sandboxing) — agent 沙箱配置
- [Multi-Agent Sandbox & Tools](/multi-agent-sandbox-tools) — 按 agent 隔离
