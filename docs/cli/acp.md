---
summary: "运行 ACP 桥接以集成 IDE"
read_when:
  - 设置基于 ACP 的 IDE 集成
  - 调试 ACP 会话到 Gateway 的路由
---

# acp

运行 ACP（Agent Client Protocol）桥接，与 Moltbot Gateway 通信。

该命令通过 stdio 与 IDE 讲 ACP，并通过 WebSocket 将提示转发到 Gateway。
它会将 ACP 会话映射到 Gateway 会话 key。

## 用法

```bash
moltbot acp

# 远程 Gateway
moltbot acp --url wss://gateway-host:18789 --token <token>

# 绑定到现有会话 key
moltbot acp --session agent:main:main

# 通过标签绑定（必须已存在）
moltbot acp --session-label "support inbox"

# 在首条提示前重置会话 key
moltbot acp --session agent:main:main --reset-session
```

## ACP 客户端（调试）

使用内置 ACP 客户端在不依赖 IDE 的情况下验证桥接。
它会启动 ACP 桥接，并允许你交互式输入提示。

```bash
moltbot acp client

# 将启动的桥接指向远程 Gateway
moltbot acp client --server-args --url wss://gateway-host:18789 --token <token>

# 覆盖 server 命令（默认：moltbot）
moltbot acp client --server "node" --server-args moltbot.mjs acp --url ws://127.0.0.1:19001
```

## 如何使用

当 IDE（或其它客户端）支持 Agent Client Protocol 且你希望它驱动 Moltbot Gateway 会话时使用 ACP。

1. 确保 Gateway 正在运行（本地或远程）。
2. 配置 Gateway 目标（配置或标志）。
3. 让 IDE 通过 stdio 运行 `moltbot acp`。

示例配置（持久化）：

```bash
moltbot config set gateway.remote.url wss://gateway-host:18789
moltbot config set gateway.remote.token <token>
```

示例直接运行（不写配置）：

```bash
moltbot acp --url wss://gateway-host:18789 --token <token>
```

## 选择代理

ACP 不直接选择代理，它按 Gateway 会话 key 路由。

使用带代理范围的会话 key 来锁定特定代理：

```bash
moltbot acp --session agent:main:main
moltbot acp --session agent:design:main
moltbot acp --session agent:qa:bug-123
```

每个 ACP 会话映射到一个 Gateway 会话 key。一个代理可以有多个会话；
除非覆盖 key 或 label，ACP 默认使用隔离的 `acp:<uuid>` 会话。

## Zed 编辑器配置

在 `~/.config/zed/settings.json` 中添加自定义 ACP agent（或使用 Zed Settings UI）：

```json
{
  "agent_servers": {
    "Moltbot ACP": {
      "type": "custom",
      "command": "moltbot",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

要指向特定 Gateway 或代理：

```json
{
  "agent_servers": {
    "Moltbot ACP": {
      "type": "custom",
      "command": "moltbot",
      "args": [
        "acp",
        "--url", "wss://gateway-host:18789",
        "--token", "<token>",
        "--session", "agent:design:main"
      ],
      "env": {}
    }
  }
}
```

在 Zed 中打开 Agent 面板并选择 “Moltbot ACP” 开始对话。

## 会话映射

默认情况下，ACP 会话会获得带 `acp:` 前缀的隔离 Gateway 会话 key。
如需复用已知会话，传入会话 key 或 label：

- `--session <key>`：使用指定 Gateway 会话 key。
- `--session-label <label>`：通过 label 解析现有会话。
- `--reset-session`：为该 key 生成新的会话 id（同 key，新记录）。

如果 ACP 客户端支持元数据，可按会话覆盖：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

会话 key 详情见 [/concepts/session](/concepts/session)。

## 选项

- `--url <url>`：Gateway WebSocket URL（若已配置则默认 `gateway.remote.url`）。
- `--token <token>`：Gateway 认证 token。
- `--password <password>`：Gateway 认证密码。
- `--session <key>`：默认会话 key。
- `--session-label <label>`：默认会话 label（解析现有会话）。
- `--require-existing`：会话 key 或 label 不存在则失败。
- `--reset-session`：首次使用前重置会话 key。
- `--no-prefix-cwd`：不要在提示前添加工作目录前缀。
- `--verbose, -v`：stderr 详细日志。

### `acp client` 选项

- `--cwd <dir>`：ACP 会话的工作目录。
- `--server <command>`：ACP server 命令（默认：`moltbot`）。
- `--server-args <args...>`：传给 ACP server 的额外参数。
- `--server-verbose`：开启 ACP server 的详细日志。
- `--verbose, -v`：客户端详细日志。
