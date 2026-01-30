---
title: Fly.io
description: 在 Fly.io 上部署 Moltbot
---

# Fly.io 部署

**目标：** 在 [Fly.io](https://fly.io) 机器上运行 Moltbot Gateway，具备持久化存储、自动 HTTPS，以及 Discord/渠道访问。

## 你需要准备

- 已安装 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 账号（免费层可用）
- 模型认证：Anthropic API key（或其他提供方 key）
- 渠道凭据：Discord bot token、Telegram token 等

## 新手快速路径

1. 克隆仓库 → 修改 `fly.toml`
2. 创建 app + volume → 设置 secrets
3. 用 `fly deploy` 部署
4. SSH 进入创建配置或使用 Control UI

## 1) 创建 Fly 应用

```bash
# 克隆仓库
git clone https://github.com/moltbot/moltbot.git
cd moltbot

# 创建新 Fly app（自选名称）
fly apps create my-moltbot

# 创建持久化卷（1GB 通常够用）
fly volumes create moltbot_data --size 1 --region iad
```

**提示：** 选择离你更近的区域。常用：`lhr`（伦敦）、`iad`（弗吉尼亚）、`sjc`（圣何塞）。

## 2) 配置 fly.toml

编辑 `fly.toml` 匹配你的应用名称与需求。

**安全提示：** 默认配置暴露公网 URL。如需无公网的加固部署，请见 [Private Deployment](#private-deployment-hardened) 或使用 `fly.private.toml`。

```toml
app = "my-moltbot"  # 你的 app 名
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  CLAWDBOT_PREFER_PNPM = "1"
  CLAWDBOT_STATE_DIR = "/data"
  NODE_OPTIONS = "--max-old-space-size=1536"

[processes]
  app = "node dist/index.js gateway --allow-unconfigured --port 3000 --bind lan"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[vm]]
  size = "shared-cpu-2x"
  memory = "2048mb"

[mounts]
  source = "moltbot_data"
  destination = "/data"
```

**关键设置：**

| 设置 | 原因 |
|---------|-----|
| `--bind lan` | 绑定到 `0.0.0.0` 以让 Fly 代理访问 gateway |
| `--allow-unconfigured` | 启动时无需配置文件（稍后创建） |
| `internal_port = 3000` | 必须与 `--port 3000`（或 `CLAWDBOT_GATEWAY_PORT`）一致，以便 Fly 健康检查 |
| `memory = "2048mb"` | 512MB 太小；推荐 2GB |
| `CLAWDBOT_STATE_DIR = "/data"` | 在 volume 上持久化状态 |

## 3) 设置 secrets

```bash
# 必需：Gateway token（非 loopback 绑定需要）
fly secrets set CLAWDBOT_GATEWAY_TOKEN=$(openssl rand -hex 32)

# 模型提供方 API key
fly secrets set ANTHROPIC_API_KEY=sk-ant-...

# 可选：其他提供方
fly secrets set OPENAI_API_KEY=sk-...
fly secrets set GOOGLE_API_KEY=...

# 渠道 token
fly secrets set DISCORD_BOT_TOKEN=MTQ...
```

**说明：**
- 非 loopback 绑定（`--bind lan`）需要 `CLAWDBOT_GATEWAY_TOKEN`。
- 把这些 token 当作密码。
- **优先用环境变量而非配置文件**保存所有 API key 与 token，避免意外写入或被日志暴露。

## 4) 部署

```bash
fly deploy
```

首次部署会构建 Docker 镜像（约 2-3 分钟），之后更快。

部署后验证：
```bash
fly status
fly logs
```

你应看到：
```
[gateway] listening on ws://0.0.0.0:3000 (PID xxx)
[discord] logged in to discord as xxx
```

## 5) 创建配置文件

SSH 进入机器创建配置：

```bash
fly ssh console
```

创建配置目录与文件：
```bash
mkdir -p /data
cat > /data/moltbot.json << 'EOF'
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-5",
        "fallbacks": ["anthropic/claude-sonnet-4-5", "openai/gpt-4o"]
      },
      "maxConcurrent": 4
    },
    "list": [
      {
        "id": "main",
        "default": true
      }
    ]
  },
  "auth": {
    "profiles": {
      "anthropic:default": { "mode": "token", "provider": "anthropic" },
      "openai:default": { "mode": "token", "provider": "openai" }
    }
  },
  "bindings": [
    {
      "agentId": "main",
      "match": { "channel": "discord" }
    }
  ],
  "channels": {
    "discord": {
      "enabled": true,
      "groupPolicy": "allowlist",
      "guilds": {
        "YOUR_GUILD_ID": {
          "channels": { "general": { "allow": true } },
          "requireMention": false
        }
      }
    }
  },
  "gateway": {
    "mode": "local",
    "bind": "auto"
  },
  "meta": {
    "lastTouchedVersion": "2026.1.27-beta.1"
  }
}
EOF
```

**说明：** `CLAWDBOT_STATE_DIR=/data` 时，配置路径为 `/data/moltbot.json`。

**说明：** Discord token 来源可为：
- 环境变量：`DISCORD_BOT_TOKEN`（推荐）
- 配置文件：`channels.discord.token`

若使用 env，无需在配置中写 token。Gateway 会自动读取 `DISCORD_BOT_TOKEN`。

重启生效：
```bash
exit
fly machine restart <machine-id>
```

## 6) 访问 Gateway

### Control UI

在浏览器打开：
```bash
fly open
```

或访问 `https://my-moltbot.fly.dev/`

粘贴 gateway token（来自 `CLAWDBOT_GATEWAY_TOKEN`）进行认证。

### 日志

```bash
fly logs              # 实时日志
fly logs --no-tail    # 最近日志
```

### SSH 控制台

```bash
fly ssh console
```

## 故障排查

### “App is not listening on expected address”

Gateway 绑定在 `127.0.0.1` 而不是 `0.0.0.0`。

**修复：** 在 `fly.toml` 的 process 命令中添加 `--bind lan`。

### 健康检查失败 / 连接被拒绝

Fly 无法访问配置端口上的 gateway。

**修复：** 确保 `internal_port` 与 gateway 端口一致（设置 `--port 3000` 或 `CLAWDBOT_GATEWAY_PORT=3000`）。

### OOM 或内存问题

容器反复重启或被杀。表现：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration` 或静默重启。

**修复：** 在 `fly.toml` 提高内存：
```toml
[[vm]]
  memory = "2048mb"
```

或更新现有机器：
```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**说明：** 512MB 太小。1GB 可能勉强可用，但在负载或 verbose 日志下会 OOM。**推荐 2GB**。

### Gateway Lock 问题

Gateway 报 “already running” 无法启动。

这是容器重启但 PID 锁文件还在 volume 上。

**修复：** 删除锁文件：
```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

锁文件位于 `/data/gateway.*.lock`（不在子目录）。

### 配置未读取

使用 `--allow-unconfigured` 时，gateway 会生成最小配置。你的自定义配置 `/data/moltbot.json` 应在重启时读取。

确认配置存在：
```bash
fly ssh console --command "cat /data/moltbot.json"
```

### 通过 SSH 写配置

`fly ssh console -C` 不支持重定向。要写配置文件：

```bash
# 用 echo + tee（从本地管道到远端）
echo '{"your":"config"}' | fly ssh console -C "tee /data/moltbot.json"

# 或使用 sftp
fly sftp shell
> put /local/path/config.json /data/moltbot.json
```

**说明：** 如果文件已存在，`fly sftp` 可能失败。先删除：
```bash
fly ssh console --command "rm /data/moltbot.json"
```

### 状态未持久化

如果重启后凭据或会话丢失，说明状态目录写入了容器文件系统。

**修复：** 确保 `CLAWDBOT_STATE_DIR=/data` 在 `fly.toml` 中设置并重新部署。

## 更新

```bash
# 拉取最新代码
git pull

# 重新部署
fly deploy

# 查看健康
fly status
fly logs
```

### 更新机器命令

如需在不重新部署的情况下修改启动命令：

```bash
# 获取机器 ID
fly machines list

# 更新命令
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# 或增加内存
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**说明：** `fly deploy` 后机器命令可能重置为 `fly.toml` 中的内容。若手动改过，请在部署后重新应用。

## Private Deployment（加固）

默认 Fly 会分配公网 IP，使 gateway 可通过 `https://your-app.fly.dev` 访问。虽然方便，但意味着部署可被互联网扫描器（Shodan、Censys 等）发现。

如需**无公网暴露**的加固部署，使用私有模板。

### 何时使用私有部署

- 你只进行**出站**调用/消息（无入站 webhook）
- 使用 **ngrok 或 Tailscale** 隧道承载 webhook 回调
- 通过 **SSH、代理或 WireGuard** 访问 gateway
- 希望部署**不被扫描器发现**

### 设置

使用 `fly.private.toml` 替代标准配置：

```bash
# 用私有配置部署
fly deploy -c fly.private.toml
```

或将现有部署转换为私有：

```bash
# 列出当前 IP
fly ips list -a my-moltbot

# 释放公网 IP
fly ips release <public-ipv4> -a my-moltbot
fly ips release <public-ipv6> -a my-moltbot

# 切换到私有配置，避免后续部署重新分配公网 IP
#（移除 [http_service] 或使用私有模板部署）
fly deploy -c fly.private.toml

# 申请仅私有 IPv6
fly ips allocate-v6 --private -a my-moltbot
```

之后 `fly ips list` 应只显示 `private` 类型：
```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 访问私有部署

由于没有公网 URL，可用以下方式之一：

**方式 1：本地代理（最简单）**
```bash
# 将本地端口 3000 转发到 app
fly proxy 3000:3000 -a my-moltbot

# 然后打开 http://localhost:3000
```

**方式 2：WireGuard VPN**
```bash
# 创建 WireGuard 配置（一次性）
fly wireguard create

# 导入到 WireGuard 客户端，然后通过内部 IPv6 访问
# 示例：http://[fdaa:x:x:x:x::x]:3000
```

**方式 3：仅 SSH**
```bash
fly ssh console -a my-moltbot
```

### 私有部署下的 Webhook

如果需要 webhook 回调（Twilio、Telnyx 等）而不公开应用：

1. **ngrok 隧道** - 在容器内运行 ngrok 或作为 sidecar
2. **Tailscale Funnel** - 通过 Tailscale 暴露特定路径
3. **仅出站** - 部分提供方（Twilio）可在无 webhook 下完成外呼

使用 ngrok 的 voice-call 配置示例：
```json
{
  "plugins": {
    "entries": {
      "voice-call": {
        "enabled": true,
        "config": {
          "provider": "twilio",
          "tunnel": { "provider": "ngrok" }
        }
      }
    }
  }
}
```

ngrok 隧道运行在容器内，可提供公网 webhook URL 而不暴露 Fly 应用本身。

### 安全收益

| 方面 | 公网 | 私有 |
|--------|--------|---------|
| 被互联网扫描发现 | 可被发现 | 隐藏 |
| 直接攻击 | 可能 | 被阻断 |
| Control UI 访问 | 浏览器 | 代理/VPN |
| Webhook 投递 | 直接 | 通过隧道 |

## 说明

- Fly.io 使用 **x86 架构**（非 ARM）
- Dockerfile 兼容两种架构
- WhatsApp/Telegram 引导请使用 `fly ssh console`
- 持久化数据位于 `/data`
- Signal 需要 Java + signal-cli；使用自定义镜像并保持内存 2GB+。

## 成本

使用推荐配置（`shared-cpu-2x`，2GB RAM）：
- 约 $10-15/月（取决于用量）
- 免费层提供部分额度

详情见 [Fly.io pricing](https://fly.io/docs/about/pricing/)。
