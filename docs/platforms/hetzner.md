---
summary: "在便宜的 Hetzner VPS 上 24/7 运行 Moltbot Gateway（Docker），并持久化状态与二进制"
read_when:
  - 你想在云 VPS 上 24/7 运行 Moltbot（不是你的笔记本）
  - 你想在自有 VPS 上运行生产级常驻 Gateway
  - 你希望完全控制持久化、二进制与重启行为
  - 你在 Hetzner 或类似提供商上用 Docker 运行 Moltbot
---

# 在 Hetzner 上运行 Moltbot（Docker 生产 VPS 指南）

## 目标

在 Hetzner VPS 上通过 Docker 运行常驻 Moltbot Gateway，并具备持久化状态、内置二进制与安全重启行为。

如果你想“约 $5 每月 24/7 Moltbot”，这是最简单可靠的方案。
Hetzner 价格可能变化；选择最小的 Debian/Ubuntu VPS，遇到 OOM 再升级。

## 我们在做什么（简单说）

- 租一台小型 Linux 服务器（Hetzner VPS）
- 安装 Docker（隔离应用运行时）
- 在 Docker 中启动 Moltbot Gateway
- 在宿主机持久化 `~/.clawdbot` + `~/clawd`（重启/重建不丢）
- 通过 SSH 隧道从笔记本访问 Control UI

Gateway 可通过以下方式访问：
- 从笔记本进行 SSH 端口转发
- 如果你自行管理防火墙和 token，也可直接暴露端口

本指南基于 Hetzner 上的 Ubuntu 或 Debian。  
如果你是其他 Linux VPS，请自行映射包名。  
通用 Docker 流程见 [Docker](/install/docker)。

---

## 快速路径（熟练运维）

1) 创建 Hetzner VPS  
2) 安装 Docker  
3) 克隆 Moltbot 仓库  
4) 创建持久化宿主机目录  
5) 配置 `.env` 与 `docker-compose.yml`  
6) 将所需二进制烘焙进镜像  
7) `docker compose up -d`  
8) 验证持久化与 Gateway 访问

---

## 你需要准备

- Hetzner VPS（root 权限）  
- 从你的笔记本进行 SSH 访问  
- 熟悉 SSH 与复制粘贴  
- 约 20 分钟  
- Docker 与 Docker Compose  
- 模型认证凭据  
- 可选提供方凭据  
  - WhatsApp 二维码  
  - Telegram bot token  
  - Gmail OAuth  

---

## 1) 创建 VPS

在 Hetzner 创建 Ubuntu 或 Debian VPS。

以 root 连接：

```bash
ssh root@YOUR_VPS_IP
```

本指南假设该 VPS **有状态**。不要把它当作一次性基础设施。

---

## 2) 安装 Docker（在 VPS 上）

```bash
apt-get update
apt-get install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sh
```

验证：

```bash
docker --version
docker compose version
```

---

## 3) 克隆 Moltbot 仓库

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
```

本指南假设你会构建自定义镜像，以确保二进制持久化。

---

## 4) 创建持久化宿主机目录

Docker 容器是短暂的。所有长期状态必须保存在宿主机。

```bash
mkdir -p /root/.clawdbot
mkdir -p /root/clawd

# 设置为容器用户（uid 1000）：
chown -R 1000:1000 /root/.clawdbot
chown -R 1000:1000 /root/clawd
```

---

## 5) 配置环境变量

在仓库根目录创建 `.env`。

```bash
CLAWDBOT_IMAGE=moltbot:latest
CLAWDBOT_GATEWAY_TOKEN=change-me-now
CLAWDBOT_GATEWAY_BIND=lan
CLAWDBOT_GATEWAY_PORT=18789

CLAWDBOT_CONFIG_DIR=/root/.clawdbot
CLAWDBOT_WORKSPACE_DIR=/root/clawd

GOG_KEYRING_PASSWORD=change-me-now
XDG_CONFIG_HOME=/home/node/.clawdbot
```

生成强随机密钥：

```bash
openssl rand -hex 32
```

**不要提交该文件。**

---

## 6) Docker Compose 配置

创建或更新 `docker-compose.yml`。

```yaml
services:
  moltbot-gateway:
    image: ${CLAWDBOT_IMAGE}
    build: .
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - HOME=/home/node
      - NODE_ENV=production
      - TERM=xterm-256color
      - CLAWDBOT_GATEWAY_BIND=${CLAWDBOT_GATEWAY_BIND}
      - CLAWDBOT_GATEWAY_PORT=${CLAWDBOT_GATEWAY_PORT}
      - CLAWDBOT_GATEWAY_TOKEN=${CLAWDBOT_GATEWAY_TOKEN}
      - GOG_KEYRING_PASSWORD=${GOG_KEYRING_PASSWORD}
      - XDG_CONFIG_HOME=${XDG_CONFIG_HOME}
      - PATH=/home/linuxbrew/.linuxbrew/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
    volumes:
      - ${CLAWDBOT_CONFIG_DIR}:/home/node/.clawdbot
      - ${CLAWDBOT_WORKSPACE_DIR}:/home/node/clawd
    ports:
      # 推荐：在 VPS 上保持 Gateway 仅 loopback，通过 SSH 隧道访问。
      # 若要公开访问，移除 `127.0.0.1:` 前缀并配置防火墙。
      - "127.0.0.1:${CLAWDBOT_GATEWAY_PORT}:18789"

      # 可选：仅当 iOS/Android 节点需要 Canvas host 时打开。
      # 如果公开暴露，请阅读 /gateway/security 并配置防火墙。
      # - "18793:18793"
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${CLAWDBOT_GATEWAY_BIND}",
        "--port",
        "${CLAWDBOT_GATEWAY_PORT}"
      ]
```

---

## 7) 将所需二进制烘焙进镜像（关键）

在运行中的容器内安装二进制是个坑。
运行时安装的内容会在重启后丢失。

所有技能所需的外部二进制必须在镜像构建时安装。

下方仅示例三种常见二进制：
- `gog` 用于 Gmail
- `goplaces` 用于 Google Places
- `wacli` 用于 WhatsApp

这些只是示例，并非完整清单。
你可用同样模式安装更多二进制。

若后续新增技能依赖额外二进制，必须：
1. 更新 Dockerfile
2. 重建镜像
3. 重启容器

**示例 Dockerfile**

```dockerfile
FROM node:22-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# Example binary 1: Gmail CLI
RUN curl -L https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/gog

# Example binary 2: Google Places CLI
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/goplaces

# Example binary 3: WhatsApp CLI
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/wacli

# Add more binaries below using the same pattern

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

---

## 8) 构建并启动

```bash
docker compose build
docker compose up -d moltbot-gateway
```

验证二进制：

```bash
docker compose exec moltbot-gateway which gog
docker compose exec moltbot-gateway which goplaces
docker compose exec moltbot-gateway which wacli
```

期望输出：

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

---

## 9) 验证 Gateway

```bash
docker compose logs -f moltbot-gateway
```

成功示例：

```
[gateway] listening on ws://0.0.0.0:18789
```

在你的笔记本上：

```bash
ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
```

打开：

`http://127.0.0.1:18789/`

粘贴 gateway token。

---

## 持久化位置（事实来源）

Moltbot 在 Docker 中运行，但 Docker 不是事实来源。
所有长期状态必须在重启、重建与重启后仍能保留。

| 组件 | 位置 | 持久化机制 | 说明 |
|---|---|---|---|
| Gateway 配置 | `/home/node/.clawdbot/` | 宿主机 volume 挂载 | 包含 `moltbot.json`、token |
| 模型认证配置 | `/home/node/.clawdbot/` | 宿主机 volume 挂载 | OAuth token、API key |
| 技能配置 | `/home/node/.clawdbot/skills/` | 宿主机 volume 挂载 | 技能级状态 |
| Agent 工作区 | `/home/node/clawd/` | 宿主机 volume 挂载 | 代码与 agent 产物 |
| WhatsApp 会话 | `/home/node/.clawdbot/` | 宿主机 volume 挂载 | 保留二维码登录 |
| Gmail keyring | `/home/node/.clawdbot/` | 宿主机 volume + 密码 | 需要 `GOG_KEYRING_PASSWORD` |
| 外部二进制 | `/usr/local/bin/` | Docker 镜像 | 必须在构建时烘焙 |
| Node 运行时 | 容器文件系统 | Docker 镜像 | 每次构建重建 |
| OS 包 | 容器文件系统 | Docker 镜像 | 不要运行时安装 |
| Docker 容器 | 临时 | 可重启 | 可安全删除 |
