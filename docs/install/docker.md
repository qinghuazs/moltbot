---
summary: "可选的 Docker 化安装与引导流程"
read_when:
  - 你想用容器化 gateway 而不是本地安装
  - 你在验证 Docker 方案
---

# Docker（可选）

Docker 是**可选**的。只有在你想要容器化 gateway 或验证 Docker 流程时才使用。

## Docker 适合我吗

- **适合**：你想要隔离的、可丢弃的 gateway 环境，或在没有本地安装的主机上运行 Moltbot。
- **不适合**：你在自己的机器上，只想要最快的开发循环。请使用正常安装流程。
- **沙箱说明**：agent 沙箱也会使用 Docker，但它**不要求**整个 gateway 在 Docker 中运行。参见 [Sandboxing](/gateway/sandboxing)。

本指南覆盖：
- 容器化 Gateway（Docker 中运行完整 Moltbot）
- 会话级 Agent 沙箱（宿主机 gateway + Docker 隔离工具）

沙箱详情：[Sandboxing](/gateway/sandboxing)

## 要求

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 足够的磁盘空间用于镜像和日志

## 容器化 Gateway（Docker Compose）

### 快速开始（推荐）

在仓库根目录：

```bash
./docker-setup.sh
```

该脚本会：
- 构建 gateway 镜像
- 运行引导向导
- 打印可选的提供方设置提示
- 通过 Docker Compose 启动 gateway
- 生成 gateway token 并写入 `.env`

可选环境变量：
- `CLAWDBOT_DOCKER_APT_PACKAGES` — 构建时安装额外 apt 包
- `CLAWDBOT_EXTRA_MOUNTS` — 增加额外的宿主机 bind mount
- `CLAWDBOT_HOME_VOLUME` — 用命名卷持久化 `/home/node`

完成后：
- 在浏览器打开 `http://127.0.0.1:18789/`。
- 在 Control UI（Settings → token）中粘贴 token。

它会把配置和工作区写到宿主机：
- `~/.clawdbot/`
- `~/clawd`

在 VPS 上运行？参见 [Hetzner (Docker VPS)](/platforms/hetzner)。

### 手动流程（compose）

```bash
docker build -t moltbot:local -f Dockerfile .
docker compose run --rm moltbot-cli onboard
docker compose up -d moltbot-gateway
```

### 额外挂载（可选）

如果你想把宿主机的额外目录挂载进容器，在运行 `docker-setup.sh` 之前设置
`CLAWDBOT_EXTRA_MOUNTS`。它接受一个逗号分隔的 Docker bind mount 列表，并通过生成
`docker-compose.extra.yml` 应用到 `moltbot-gateway` 与 `moltbot-cli`。

示例：

```bash
export CLAWDBOT_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

说明：
- 路径必须在 macOS/Windows 的 Docker Desktop 共享列表中。
- 如果你修改了 `CLAWDBOT_EXTRA_MOUNTS`，请重新运行 `docker-setup.sh` 以重新生成额外的 compose 文件。
- `docker-compose.extra.yml` 由脚本生成，不要手动编辑。

### 持久化整个容器 home（可选）

如果你想让 `/home/node` 在容器重建后仍持久化，通过 `CLAWDBOT_HOME_VOLUME` 设置命名卷。
该方式会创建 Docker volume 并挂载到 `/home/node`，同时保留标准的配置和工作区 bind mounts。
这里请使用**命名卷**（不要使用 bind 路径）；若要 bind，使用 `CLAWDBOT_EXTRA_MOUNTS`。

示例：

```bash
export CLAWDBOT_HOME_VOLUME="moltbot_home"
./docker-setup.sh
```

可以与额外挂载组合：

```bash
export CLAWDBOT_HOME_VOLUME="moltbot_home"
export CLAWDBOT_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

说明：
- 如果你修改了 `CLAWDBOT_HOME_VOLUME`，请重新运行 `docker-setup.sh` 以重新生成额外 compose 文件。
- 命名卷会一直保留，直到执行 `docker volume rm <name>` 删除。

### 安装额外 apt 包（可选）

如果你需要在镜像内安装系统包（例如构建工具或媒体库），在运行 `docker-setup.sh` 之前设置 `CLAWDBOT_DOCKER_APT_PACKAGES`。
这些包会在镜像构建时安装，因此即使容器被删除也会保留。

示例：

```bash
export CLAWDBOT_DOCKER_APT_PACKAGES="ffmpeg build-essential"
./docker-setup.sh
```

说明：
- 这里接受以空格分隔的 apt 包名列表。
- 如果你修改了 `CLAWDBOT_DOCKER_APT_PACKAGES`，请重新运行 `docker-setup.sh` 以重建镜像。

### 更快的重建（推荐）

为加速重建，请调整 Dockerfile 的顺序以利用缓存层。这样除非 lockfile 变化，否则不会重复执行 `pnpm install`：

```dockerfile
FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

# Cache dependencies unless package metadata changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

### 渠道设置（可选）

使用 CLI 容器配置渠道，然后按需重启 gateway。

WhatsApp（二维码）：
```bash
docker compose run --rm moltbot-cli channels login
```

Telegram（bot token）：
```bash
docker compose run --rm moltbot-cli channels add --channel telegram --token "<token>"
```

Discord（bot token）：
```bash
docker compose run --rm moltbot-cli channels add --channel discord --token "<token>"
```

文档：[WhatsApp](/channels/whatsapp)、[Telegram](/channels/telegram)、[Discord](/channels/discord)

### 健康检查

```bash
docker compose exec moltbot-gateway node dist/index.js health --token "$CLAWDBOT_GATEWAY_TOKEN"
```

### E2E 冒烟测试（Docker）

```bash
scripts/e2e/onboard-docker.sh
```

### 二维码导入冒烟测试（Docker）

```bash
pnpm test:docker:qr
```

### 说明

- Gateway 绑定默认使用 `lan` 以适配容器。
- gateway 容器是会话的事实来源（`~/.clawdbot/agents/<agentId>/sessions/`）。

## Agent 沙箱（宿主机 gateway + Docker 工具）

深入阅读：[Sandboxing](/gateway/sandboxing)

### 功能说明

当启用 `agents.defaults.sandbox` 时，**非 main 会话**会在 Docker 容器内运行工具。
gateway 仍在宿主机，但工具执行被隔离：
- scope：默认是 `"agent"`（每个 agent 一个容器与工作区）
- scope：`"session"` 为按会话隔离
- 每个 scope 的工作区挂载到 `/workspace`
- 可选的 agent 工作区访问（`agents.defaults.sandbox.workspaceAccess`）
- allow/deny 工具策略（deny 优先）
- 入站媒体会复制到当前沙箱工作区（`media/inbound/*`），方便工具读取（当 `workspaceAccess: "rw"` 时，会进入 agent 工作区）

警告：`scope: "shared"` 会禁用跨会话隔离。所有会话共享同一容器与工作区。

### 按 agent 的沙箱配置（多 agent）

如果你使用多 agent 路由，每个 agent 可以覆盖沙箱与工具设置：
`agents.list[].sandbox` 与 `agents.list[].tools`（以及 `agents.list[].tools.sandbox.tools`）。这样一个 gateway 可以运行不同的访问级别：
- 全权限（个人 agent）
- 只读工具 + 只读工作区（家庭或工作 agent）
- 无文件系统或 shell 工具（公共 agent）

例子、优先级和排障见 [Multi-Agent Sandbox & Tools](/multi-agent-sandbox-tools)。

### 默认行为

- 镜像：`moltbot-sandbox:bookworm-slim`
- 每个 agent 一个容器
- Agent 工作区访问：`workspaceAccess: "none"`（默认）使用 `~/.clawdbot/sandboxes`
  - `"ro"` 保持沙箱工作区在 `/workspace`，并将 agent 工作区只读挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）
  - `"rw"` 以读写方式将 agent 工作区挂载到 `/workspace`
- 自动清理：空闲 > 24h 或总年龄 > 7d
- 网络：默认 `none`（如需出站必须显式开启）
- 默认允许：`exec`、`process`、`read`、`write`、`edit`、`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- 默认拒绝：`browser`、`canvas`、`nodes`、`cron`、`discord`、`gateway`

### 启用沙箱

如果你计划在 `setupCommand` 中安装包，请注意：
- 默认 `docker.network` 为 `"none"`（无出站）。
- `readOnlyRoot: true` 会阻止包安装。
- `user` 必须是 root 才能执行 `apt-get`（省略 `user` 或设置 `user: "0:0"`）。
Moltbot 会在 `setupCommand`（或 docker 配置）变化时自动重建容器，
除非容器**刚刚被使用过**（约 5 分钟内）。热容器会记录一条警告，并给出精确的 `moltbot sandbox recreate ...` 命令。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared (agent is default)
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.clawdbot/sandboxes",
        docker: {
          image: "moltbot-sandbox:bookworm-slim",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "moltbot-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"]
        },
        prune: {
          idleHours: 24, // 0 disables idle pruning
          maxAgeDays: 7  // 0 disables max-age pruning
        }
      }
    }
  },
  tools: {
    sandbox: {
      tools: {
        allow: ["exec", "process", "read", "write", "edit", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"]
      }
    }
  }
}
```

加固选项位于 `agents.defaults.sandbox.docker`：
`network`、`user`、`pidsLimit`、`memory`、`memorySwap`、`cpus`、`ulimits`、
`seccompProfile`、`apparmorProfile`、`dns`、`extraHosts`。

多 agent：可通过 `agents.list[].sandbox.{docker,browser,prune}.*` 按 agent 覆盖 `agents.defaults.sandbox.{docker,browser,prune}.*`
（当 `agents.defaults.sandbox.scope` / `agents.list[].sandbox.scope` 为 `"shared"` 时忽略）。

### 构建默认沙箱镜像

```bash
scripts/sandbox-setup.sh
```

该脚本会使用 `Dockerfile.sandbox` 构建 `moltbot-sandbox:bookworm-slim`。

### 沙箱通用镜像（可选）

如果你希望沙箱镜像包含常用构建工具（Node、Go、Rust 等），可构建通用镜像：

```bash
scripts/sandbox-common-setup.sh
```

这会构建 `moltbot-sandbox-common:bookworm-slim`。使用方式：

```json5
{
  agents: { defaults: { sandbox: { docker: { image: "moltbot-sandbox-common:bookworm-slim" } } } }
}
```

### 沙箱浏览器镜像

要在沙箱内运行 browser 工具，构建浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

这会使用 `Dockerfile.sandbox-browser` 构建 `moltbot-sandbox-browser:bookworm-slim`。容器运行启用了 CDP 的 Chromium，并提供可选 noVNC 观察者（通过 Xvfb 提供有界面模式）。

说明：
- 有界面模式（Xvfb）比无头更不易被反爬阻拦。
- 无头仍可用，通过设置 `agents.defaults.sandbox.browser.headless=true`。
- 不需要完整桌面环境（GNOME）；Xvfb 提供显示即可。

配置示例：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: { enabled: true }
      }
    }
  }
}
```

自定义浏览器镜像：

```json5
{
  agents: {
    defaults: {
      sandbox: { browser: { image: "my-moltbot-browser" } }
    }
  }
}
```

启用后，agent 会获得：
- 沙箱浏览器控制 URL（用于 `browser` 工具）
- noVNC URL（若启用且 headless=false）

注意：如果你为工具设置了 allowlist，请把 `browser` 加入 allow，并从 deny 移除，否则该工具仍会被阻止。
清理规则（`agents.defaults.sandbox.prune`）同样适用于浏览器容器。

### 自定义沙箱镜像

构建自定义镜像并在配置中指向它：

```bash
docker build -t my-moltbot-sbx -f Dockerfile.sandbox .
```

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "my-moltbot-sbx" } }
    }
  }
}
```

### 工具策略（allow/deny）

- `deny` 优先于 `allow`。
- `allow` 为空：所有工具（除 deny 外）可用。
- `allow` 非空：仅 allow 中的工具可用（再减去 deny）。

### 清理策略

两个参数：
- `prune.idleHours`：清理 X 小时未使用的容器（0 表示禁用）
- `prune.maxAgeDays`：清理超过 X 天的容器（0 表示禁用）

示例：
- 保留活跃会话但限制生命周期：
  `idleHours: 24`，`maxAgeDays: 7`
- 永不清理：
  `idleHours: 0`，`maxAgeDays: 0`

### 安全说明

- 硬隔离仅适用于**工具**（exec/read/write/edit/apply_patch）。  
- 浏览器/相机/canvas 等宿主机工具默认被阻止。  
- 在沙箱中允许 `browser` **会破坏隔离**（浏览器在宿主机上运行）。

## 故障排查

- 镜像缺失：使用 [`scripts/sandbox-setup.sh`](https://github.com/moltbot/moltbot/blob/main/scripts/sandbox-setup.sh) 构建或设置 `agents.defaults.sandbox.docker.image`。
- 容器未运行：会按需为会话自动创建。
- 沙箱权限错误：将 `docker.user` 设为与挂载工作区一致的 UID:GID（或 chown 工作区）。
- 自定义工具找不到：Moltbot 使用 `sh -lc`（登录 shell）执行命令，会读取 `/etc/profile` 并可能重置 PATH。设置 `docker.env.PATH` 以在 PATH 前置自定义工具路径（例如 `/custom/bin:/usr/local/share/npm-global/bin`），或在 Dockerfile 中添加 `/etc/profile.d/` 脚本。
