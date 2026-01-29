---
summary: "Gateway WebSocket 协议：握手、帧、版本管理"
read_when:
  - 实现或更新网关 WS 客户端
  - 排查协议不匹配或连接失败
  - 重新生成协议 schema 或模型
---

# Gateway 协议（WebSocket）

Gateway WS 协议是 Moltbot 的 **单一控制面 + 节点传输**。
所有客户端（CLI、Web UI、macOS 应用、iOS/Android 节点、无头节点）
通过 WebSocket 连接，并在握手时声明其 **角色** 与 **作用域**。

## 传输层

- WebSocket，文本帧承载 JSON 负载。
- 第一帧 **必须** 是 `connect` 请求。

## 握手（connect）

网关 → 客户端（预连接挑战）：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

客户端 → 网关：

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "moltbot-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

网关 → 客户端：

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

当签发设备令牌时，`hello-ok` 还会包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

### 节点示例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "moltbot-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## 帧结构

- **请求**：`{type:"req", id, method, params}`  
- **响应**：`{type:"res", id, ok, payload|error}`  
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

带副作用的方法需要 **幂等键**（见 schema）。

## 角色与作用域

### 角色
- `operator` = 控制面客户端（CLI/UI/自动化）。
- `node` = 能力宿主（camera/screen/canvas/system.run）。

### 作用域（operator）
常用 scope：
- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

### 能力、命令、权限（node）
节点在连接时声明能力主张：
- `caps`：高层能力分类。
- `commands`：可被 invoke 的命令允许列表。
- `permissions`：细粒度开关（例如 `screen.record`、`camera.capture`）。

Gateway 将其视为 **主张**，并在服务端执行允许列表约束。

## Presence

- `system-presence` 返回按设备身份键入的条目。
- Presence 条目包含 `deviceId`、`roles` 与 `scopes`，便于 UI 在同一设备
  同时连接为 **operator** 与 **node** 时仍只显示一行。

### 节点辅助方法

- 节点可调用 `skills.bins` 获取当前技能可执行文件列表，
  用于自动允许检查。

## Exec 审批

- 当 exec 请求需要审批时，网关会广播 `exec.approval.requested`。
- Operator 客户端通过 `exec.approval.resolve` 处理（需要 `operator.approvals` 作用域）。

## 版本管理

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器拒绝不匹配。
- Schema 与模型由 TypeBox 定义生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## 认证

- 若设置了 `CLAWDBOT_GATEWAY_TOKEN`（或 `--token`），`connect.params.auth.token`
  必须匹配，否则会关闭 socket。
- 配对后，Gateway 会签发 **设备令牌**，按连接角色与作用域进行范围化。
  它会出现在 `hello-ok.auth.deviceToken`，客户端应保存以供后续连接使用。
- 设备令牌可通过 `device.token.rotate` 与 `device.token.revoke` 轮换或吊销
  （需要 `operator.pairing` 作用域）。

## 设备身份与配对

- 节点应包含稳定的设备身份（`device.id`），通常来自密钥对指纹。
- 网关按设备 + 角色签发令牌。
- 新设备 ID 需要配对审批，除非启用了本地自动审批。
- **本地** 连接包括回环地址和网关主机自身的 tailnet 地址
  （因此同机 tailnet 绑定仍可自动审批）。
- 所有 WS 客户端在 `connect` 中都必须携带 `device` 身份（operator + node）。
  仅当启用 `gateway.controlUi.allowInsecureAuth`
  （或紧急场景使用 `gateway.controlUi.dangerouslyDisableDeviceAuth`）时，
  控制台 UI 才可省略。
- 非本地连接必须对服务器提供的 `connect.challenge` nonce 签名。

## TLS 与固定

- WS 连接支持 TLS。
- 客户端可选固定网关证书指纹（见 `gateway.tls` 配置，以及
  `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 范围

此协议暴露 **完整的网关 API**（status、channels、models、chat、agent、
sessions、nodes、approvals 等）。具体表面由
`src/gateway/protocol/schema.ts` 中的 TypeBox schema 定义。
