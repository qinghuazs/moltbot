---
summary: "在 GCP Compute Engine 上 24/7 运行 Moltbot Gateway（Docker），并持久化状态"
read_when:
  - 你想在 GCP 上常驻 Moltbot
  - 你想在自有 VM 上运行生产级常驻 Gateway
  - 你需要完全控制持久化、二进制与重启行为
---

# 在 GCP Compute Engine 上运行 Moltbot（Docker 生产 VPS 指南）

## 目标

在 GCP Compute Engine VM 上通过 Docker 运行常驻 Moltbot Gateway，并具备持久化状态、内置二进制与安全重启行为。

如果你想“约 $5-12/月 24/7 Moltbot”，这是 Google Cloud 上可靠的方案。
价格取决于机型与地区；选择适合负载的最小 VM，遇到 OOM 再升级。

## 我们在做什么（简单说）

- 创建 GCP 项目并启用计费
- 创建 Compute Engine VM
- 安装 Docker（隔离应用运行时）
- 在 Docker 中启动 Moltbot Gateway
- 在宿主机持久化 `~/.clawdbot` + `~/clawd`（重启/重建不丢）
- 通过 SSH 隧道从笔记本访问 Control UI

Gateway 可通过以下方式访问：
- 从笔记本进行 SSH 端口转发
- 如果你自行管理防火墙与 token，也可直接暴露端口

本指南使用 GCP Compute Engine 上的 Debian。
Ubuntu 也可用；请自行映射包名。
通用 Docker 流程见 [Docker](/install/docker)。

---

## 快速路径（熟练运维）

1) 创建 GCP 项目并启用 Compute Engine API
2) 创建 Compute Engine VM（e2-small，Debian 12，20GB）
3) SSH 进入 VM
4) 安装 Docker
5) 克隆 Moltbot 仓库
6) 创建持久化宿主机目录
7) 配置 `.env` 和 `docker-compose.yml`
8) 烘焙所需二进制、构建并启动

---

## 你需要准备

- GCP 账号（e2-micro 符合免费层）
- 已安装 gcloud CLI（或使用 Cloud Console）
- 从你的笔记本进行 SSH 访问
- 熟悉 SSH 与复制粘贴
- 约 20-30 分钟
- Docker 与 Docker Compose
- 模型认证凭据
- 可选提供方凭据
  - WhatsApp 二维码
  - Telegram bot token
  - Gmail OAuth

---

## 1) 安装 gcloud CLI（或使用 Console）

**方式 A：gcloud CLI**（自动化推荐）

安装说明：https://cloud.google.com/sdk/docs/install

初始化并认证：

```bash
gcloud init
gcloud auth login
```

**方式 B：Cloud Console**

所有步骤也可在 https://console.cloud.google.com 通过 Web UI 完成。

---

## 2) 创建 GCP 项目

**CLI：**

```bash
gcloud projects create my-moltbot-project --name="Moltbot Gateway"
gcloud config set project my-moltbot-project
```

在 https://console.cloud.google.com/billing 启用计费（Compute Engine 必需）。

启用 Compute Engine API：

```bash
gcloud services enable compute.googleapis.com
```

**Console：**

1. 进入 IAM & Admin > Create Project
2. 命名并创建
3. 为项目启用计费
4. 进入 APIs & Services > Enable APIs > 搜索 "Compute Engine API" > Enable

---

## 3) 创建 VM

**机型：**

| 类型 | 规格 | 费用 | 说明 |
|------|-------|------|-------|
| e2-small | 2 vCPU, 2GB RAM | ~$12/月 | 推荐 |
| e2-micro | 2 vCPU（共享）, 1GB RAM | 免费层可用 | 负载大时易 OOM |

**CLI：**

```bash
gcloud compute instances create moltbot-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --boot-disk-size=20GB \
  --image-family=debian-12 \
  --image-project=debian-cloud
```

**Console：**

1. 进入 Compute Engine > VM instances > Create instance
2. Name：`moltbot-gateway`
3. Region：`us-central1`，Zone：`us-central1-a`
4. Machine type：`e2-small`
5. Boot disk：Debian 12，20GB
6. Create

---

## 4) SSH 进入 VM

**CLI：**

```bash
gcloud compute ssh moltbot-gateway --zone=us-central1-a
```

**Console：**

在 Compute Engine 面板点击 VM 旁的 “SSH”。

说明：VM 创建后 SSH key 下发可能需要 1-2 分钟。若连接被拒绝，请稍等再试。

---

## 5) 安装 Docker（在 VM 上）

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

退出并重新登录以生效：

```bash
exit
```

然后重新 SSH：

```bash
gcloud compute ssh moltbot-gateway --zone=us-central1-a
```

验证：

```bash
docker --version
docker compose version
```

---

## 6) 克隆 Moltbot 仓库

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
```

本指南假设你会构建自定义镜像以保证二进制持久化。

---

## 7) 创建持久化宿主机目录

Docker 容器是短暂的。
所有长期状态必须保存在宿主机上。

```bash
mkdir -p ~/.clawdbot
mkdir -p ~/clawd
```

---

## 8) 配置环境变量

在仓库根目录创建 `.env`。

```bash
CLAWDBOT_IMAGE=moltbot:latest
CLAWDBOT_GATEWAY_TOKEN=change-me-now
CLAWDBOT_GATEWAY_BIND=lan
CLAWDBOT_GATEWAY_PORT=18789

CLAWDBOT_CONFIG_DIR=/home/$USER/.clawdbot
CLAWDBOT_WORKSPACE_DIR=/home/$USER/clawd

GOG_KEYRING_PASSWORD=change-me-now
XDG_CONFIG_HOME=/home/node/.clawdbot
```

生成强随机密钥：

```bash
openssl rand -hex 32
```

**不要提交该文件。**

---

## 9) Docker Compose 配置

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
      # 推荐：在 VM 上保持 Gateway 仅 loopback，通过 SSH 隧道访问。
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

## 10) 将所需二进制烘焙进镜像（关键）

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

## 11) 构建并启动

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

## 12) 验证 Gateway

```bash
docker compose logs -f moltbot-gateway
```

成功示例：

```
[gateway] listening on ws://0.0.0.0:18789
```

---

## 13) 从笔记本访问

创建 SSH 隧道转发 Gateway 端口：

```bash
gcloud compute ssh moltbot-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

在浏览器打开：

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

---

## 更新

更新 VM 上的 Moltbot：

```bash
cd ~/moltbot
git pull
docker compose build
docker compose up -d
```

---

## 故障排查

**SSH 连接被拒绝**

VM 创建后 SSH key 下发可能需要 1-2 分钟。等待后重试。

**OS Login 问题**

检查你的 OS Login profile：

```bash
gcloud compute os-login describe-profile
```

确保账号拥有所需 IAM 权限（Compute OS Login 或 Compute OS Admin Login）。

**内存不足（OOM）**

若使用 e2-micro 且 OOM，请升级到 e2-small 或 e2-medium：

```bash
# 先停止 VM
gcloud compute instances stop moltbot-gateway --zone=us-central1-a

# 修改机型
gcloud compute instances set-machine-type moltbot-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small

# 启动 VM
gcloud compute instances start moltbot-gateway --zone=us-central1-a
```

---

## 服务账号（安全最佳实践）

个人使用时默认账号即可。

自动化或 CI/CD 建议使用最小权限的专用服务账号：

1. 创建服务账号：
   ```bash
   gcloud iam service-accounts create moltbot-deploy \
     --display-name="Moltbot Deployment"
   ```

2. 授予 Compute Instance Admin 角色（或更窄的自定义角色）：
   ```bash
   gcloud projects add-iam-policy-binding my-moltbot-project \
     --member="serviceAccount:moltbot-deploy@my-moltbot-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

避免在自动化中使用 Owner 角色。遵循最小权限原则。

IAM 角色说明见 https://cloud.google.com/iam/docs/understanding-roles

---

## 下一步

- 设置消息渠道：[Channels](/channels)
- 将本地设备配对为节点：[Nodes](/nodes)
- 配置 Gateway：[Gateway configuration](/gateway/configuration)
