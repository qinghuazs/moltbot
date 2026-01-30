---
summary: "`moltbot devices` CLI 参考（设备配对 + 令牌轮换/撤销）"
read_when:
  - 您正在批准设备配对请求
  - 您需要轮换或撤销设备令牌
---

# `moltbot devices`

管理设备配对请求和设备范围的令牌。

## 命令

### `moltbot devices list`

列出待处理的配对请求和已配对的设备。

```
moltbot devices list
moltbot devices list --json
```

### `moltbot devices approve <requestId>`

批准待处理的设备配对请求。

```
moltbot devices approve <requestId>
```

### `moltbot devices reject <requestId>`

拒绝待处理的设备配对请求。

```
moltbot devices reject <requestId>
```

### `moltbot devices rotate --device <id> --role <role> [--scope <scope...>]`

为特定角色轮换设备令牌（可选更新权限范围）。

```
moltbot devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `moltbot devices revoke --device <id> --role <role>`

撤销特定角色的设备令牌。

```
moltbot devices revoke --device <deviceId> --role node
```

## 通用选项

- `--url <url>`：网关 WebSocket URL（配置时默认为 `gateway.remote.url`）。
- `--token <token>`：网关令牌（如果需要）。
- `--password <password>`：网关密码（密码认证）。
- `--timeout <ms>`：RPC 超时。
- `--json`：JSON 输出（推荐用于脚本）。

## 说明

- 令牌轮换返回新令牌（敏感信息）。请像对待密钥一样对待它。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）权限范围。
