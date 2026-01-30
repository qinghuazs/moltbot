---
title: 沙盒 CLI
summary: "管理沙盒容器并检查有效的沙盒策略"
read_when: "您正在管理沙盒容器或调试沙盒/工具策略行为。"
status: active
---

# 沙盒 CLI

管理用于隔离代理执行的基于 Docker 的沙盒容器。

## 概述

Moltbot 可以在隔离的 Docker 容器中运行代理以确保安全。`sandbox` 命令帮助您管理这些容器，特别是在更新或配置更改后。

## 命令

### `moltbot sandbox explain`

检查**有效的**沙盒模式/范围/工作区访问、沙盒工具策略和提升门控（带有修复配置键路径）。

```bash
moltbot sandbox explain
moltbot sandbox explain --session agent:main:main
moltbot sandbox explain --agent work
moltbot sandbox explain --json
```

### `moltbot sandbox list`

列出所有沙盒容器及其状态和配置。

```bash
moltbot sandbox list
moltbot sandbox list --browser  # 仅列出浏览器容器
moltbot sandbox list --json     # JSON 输出
```

**输出包括：**
- 容器名称和状态（运行中/已停止）
- Docker 镜像及其是否与配置匹配
- 年龄（自创建以来的时间）
- 空闲时间（自上次使用以来的时间）
- 关联的会话/代理

### `moltbot sandbox recreate`

移除沙盒容器以强制使用更新的镜像/配置重新创建。

```bash
moltbot sandbox recreate --all                # 重新创建所有容器
moltbot sandbox recreate --session main       # 特定会话
moltbot sandbox recreate --agent mybot        # 特定代理
moltbot sandbox recreate --browser            # 仅浏览器容器
moltbot sandbox recreate --all --force        # 跳过确认
```

**选项：**
- `--all`：重新创建所有沙盒容器
- `--session <key>`：为特定会话重新创建容器
- `--agent <id>`：为特定代理重新创建容器
- `--browser`：仅重新创建浏览器容器
- `--force`：跳过确认提示

**重要：** 容器会在下次使用代理时自动重新创建。

## 用例

### 更新 Docker 镜像后

```bash
# 拉取新镜像
docker pull moltbot-sandbox:latest
docker tag moltbot-sandbox:latest moltbot-sandbox:bookworm-slim

# 更新配置以使用新镜像
# 编辑配置：agents.defaults.sandbox.docker.image（或 agents.list[].sandbox.docker.image）

# 重新创建容器
moltbot sandbox recreate --all
```

### 更改沙盒配置后

```bash
# 编辑配置：agents.defaults.sandbox.*（或 agents.list[].sandbox.*）

# 重新创建以应用新配置
moltbot sandbox recreate --all
```

### 更改 setupCommand 后

```bash
moltbot sandbox recreate --all
# 或仅一个代理：
moltbot sandbox recreate --agent family
```


### 仅针对特定代理

```bash
# 仅更新一个代理的容器
moltbot sandbox recreate --agent alfred
```

## 为什么需要这样做？

**问题：** 当您更新沙盒 Docker 镜像或配置时：
- 现有容器继续使用旧设置运行
- 容器仅在 24 小时不活动后才被清理
- 经常使用的代理会无限期保持旧容器运行

**解决方案：** 使用 `moltbot sandbox recreate` 强制移除旧容器。它们会在下次需要时使用当前设置自动重新创建。

提示：优先使用 `moltbot sandbox recreate` 而不是手动 `docker rm`。它使用网关的容器命名，避免在范围/会话键更改时出现不匹配。

## 配置

沙盒设置位于 `~/.clawdbot/moltbot.json` 的 `agents.defaults.sandbox` 下（每个代理的覆盖在 `agents.list[].sandbox` 中）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all",                    // off, non-main, all
        "scope": "agent",                 // session, agent, shared
        "docker": {
          "image": "moltbot-sandbox:bookworm-slim",
          "containerPrefix": "moltbot-sbx-"
          // ... 更多 Docker 选项
        },
        "prune": {
          "idleHours": 24,               // 24 小时空闲后自动清理
          "maxAgeDays": 7                // 7 天后自动清理
        }
      }
    }
  }
}
```

## 另请参阅

- [沙盒文档](/gateway/sandboxing)
- [代理配置](/concepts/agent-workspace)
- [Doctor 命令](/gateway/doctor) - 检查沙盒设置
