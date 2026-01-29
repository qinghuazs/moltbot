---
summary: "Matrix 支持状态、能力与配置"
read_when:
  - 在处理 Matrix 渠道功能时
---
# Matrix（插件）

Matrix 是开放的去中心化消息协议。Moltbot 以 Matrix **用户**身份连接到任意 homeserver，
因此你需要一个 Matrix 账号用于机器人。登录后可以直接私聊机器人或邀请它进入房间（Matrix “群组”）。
Beeper 也可作为客户端，但它要求启用 E2EE。

状态：通过插件支持（@vector-im/matrix-bot-sdk）。支持私聊、房间、线程、媒体、反应、投票（发送 + poll-start 文本化）、位置以及 E2EE（需加密模块）。

## 需要插件

Matrix 作为插件提供，不随核心安装包附带。

通过 CLI 安装（npm registry）：

```bash
moltbot plugins install @moltbot/matrix
```

本地检出（从 git 仓库运行时）：

```bash
moltbot plugins install ./extensions/matrix
```

若在配置/引导中选择 Matrix 且检测到 git 检出，
Moltbot 会自动提供本地安装路径。

详情：见 [插件](/plugin)

## 设置

1) 安装 Matrix 插件：
   - npm：`moltbot plugins install @moltbot/matrix`
   - 本地检出：`moltbot plugins install ./extensions/matrix`
2) 在 homeserver 创建 Matrix 账号：
   - 参考托管选项：<https://matrix.org/ecosystem/hosting/>
   - 或自行托管。
3) 获取 bot 账号 access token：
   - 在 homeserver 上用 `curl` 调用 Matrix 登录 API：

   ```bash
   curl --request POST \
     --url https://matrix.example.org/_matrix/client/v3/login \
     --header 'Content-Type: application/json' \
     --data '{
     "type": "m.login.password",
     "identifier": {
       "type": "m.id.user",
       "user": "your-user-name"
     },
     "password": "your-password"
   }'
   ```

   - 将 `matrix.example.org` 替换为你的 homeserver URL。
   - 或设置 `channels.matrix.userId` + `channels.matrix.password`：Moltbot 会调用同一登录端点，并将 access token 存入 `~/.clawdbot/credentials/matrix/credentials.json`，下次启动复用。
4) 配置凭据：
   - 环境变量：`MATRIX_HOMESERVER`、`MATRIX_ACCESS_TOKEN`（或 `MATRIX_USER_ID` + `MATRIX_PASSWORD`）
   - 或配置：`channels.matrix.*`
   - 两者同时存在时，配置优先。
   - 使用 access token 时，用户 ID 会通过 `/whoami` 自动获取。
   - 设置 `channels.matrix.userId` 时需使用完整 Matrix ID（如 `@bot:example.org`）。
5) 重启 gateway（或完成引导）。
6) 通过任意 Matrix 客户端与机器人私聊或邀请其进入房间
   （Element、Beeper 等；见 <https://matrix.org/ecosystem/clients/>）。Beeper 需要启用 E2EE，
   所以请设置 `channels.matrix.encryption: true` 并验证设备。

最小配置（access token，user ID 自动获取）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      dm: { policy: "pairing" }
    }
  }
}
```

E2EE 配置（启用端到端加密）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      encryption: true,
      dm: { policy: "pairing" }
    }
  }
}
```

## 加密（E2EE）

通过 Rust crypto SDK **支持**端到端加密。

设置 `channels.matrix.encryption: true`：

- 加密模块加载成功后，自动解密加密房间消息。
- 向加密房间发送媒体会自动加密。
- 首次连接时，Moltbot 会向你的其他会话请求设备验证。
- 在其他 Matrix 客户端（Element 等）中验证设备以共享密钥。
- 若加密模块无法加载，E2EE 会被禁用且加密房间无法解密；Moltbot 会记录警告。
- 若出现加密模块缺失（例如 `@matrix-org/matrix-sdk-crypto-nodejs-*`），允许 `@matrix-org/matrix-sdk-crypto-nodejs` 的构建脚本并执行
  `pnpm rebuild @matrix-org/matrix-sdk-crypto-nodejs`，或运行
  `node node_modules/@matrix-org/matrix-sdk-crypto-nodejs/download-lib.js` 拉取二进制。

加密状态按账号 + access token 存储在
`~/.clawdbot/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/crypto/`
（SQLite 数据库）。同步状态保存在同级的 `bot-storage.json`。
若 access token（设备）变化，会创建新的存储，并需要重新验证才能解密房间。

**设备验证：**
启用 E2EE 后，机器人启动会请求其他会话验证。打开 Element（或其他客户端）并通过验证请求以建立信任。
验证完成后机器人即可解密加密房间消息。

## 路由模型

- 回复总是回到 Matrix。
- 私聊共享 agent 主会话；房间映射为群会话。

## 访问控制（私聊）

- 默认：`channels.matrix.dm.policy = "pairing"`。陌生发送者收到配对码。
- 批准方式：
  - `moltbot pairing list matrix`
  - `moltbot pairing approve matrix <CODE>`
- 开放私聊：`channels.matrix.dm.policy="open"` 且 `channels.matrix.dm.allowFrom=["*"]`。
- `channels.matrix.dm.allowFrom` 接受用户 ID 或显示名。向导在目录查询可用时会解析显示名到用户 ID。

## 房间（群组）

- 默认：`channels.matrix.groupPolicy = "allowlist"`（提及门控）。未设置时可用 `channels.defaults.groupPolicy` 覆盖默认值。
- 用 `channels.matrix.groups` allowlist 房间（房间 ID、别名或名称）：

```json5
{
  channels: {
    matrix: {
      groupPolicy: "allowlist",
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true }
      },
      groupAllowFrom: ["@owner:example.org"]
    }
  }
}
```

- `requireMention: false` 可在该房间内自动回复。
- `groups."*"` 可为所有房间设置提及门控默认值。
- `groupAllowFrom` 可限制在房间中可触发机器人的发送者（可选）。
- 每个房间可设置 `users` allowlist 进一步限制发送者。
- 配置向导会提示 room allowlist（房间 ID、别名或名称），并在可能时解析名称。
- 启动时 Moltbot 会将 allowlist 中的房间/用户名称解析为 ID 并记录映射；无法解析的条目保留原样。
- 默认自动接受邀请；可用 `channels.matrix.autoJoin` 与 `channels.matrix.autoJoinAllowlist` 控制。
- 若不允许任何房间，设 `channels.matrix.groupPolicy: "disabled"`（或保持空 allowlist）。
- 旧键：`channels.matrix.rooms`（与 `groups` 同结构）。

## 线程

- 支持回复线程。
- `channels.matrix.threadReplies` 控制回复是否保留在线程：
  - `off`、`inbound`（默认）、`always`
- `channels.matrix.replyToMode` 控制不在线程中时的 reply-to 元数据：
  - `off`（默认）、`first`、`all`

## 能力

| 功能 | 状态 |
|---------|--------|
| 私聊 | ✅ 支持 |
| 房间 | ✅ 支持 |
| 线程 | ✅ 支持 |
| 媒体 | ✅ 支持 |
| E2EE | ✅ 支持（需加密模块） |
| 反应 | ✅ 支持（工具发送/读取） |
| 投票 | ✅ 支持发送；入站 poll-start 转为文本（不处理响应/结束） |
| 位置 | ✅ 支持（geo URI；忽略海拔） |
| 原生命令 | ✅ 支持 |

## 配置参考（Matrix）

完整配置：见 [配置](/gateway/configuration)

Provider 选项：

- `channels.matrix.enabled`：启用/禁用渠道启动。
- `channels.matrix.homeserver`：homeserver URL。
- `channels.matrix.userId`：Matrix 用户 ID（access token 时可选）。
- `channels.matrix.accessToken`：access token。
- `channels.matrix.password`：用于登录的密码（token 会被保存）。
- `channels.matrix.deviceName`：设备显示名。
- `channels.matrix.encryption`：启用 E2EE（默认 false）。
- `channels.matrix.initialSyncLimit`：首次同步限制。
- `channels.matrix.threadReplies`：`off | inbound | always`（默认 inbound）。
- `channels.matrix.textChunkLimit`：出站分块大小（字符）。
- `channels.matrix.chunkMode`：`length`（默认）或 `newline`（按空行分段再按长度分块）。
- `channels.matrix.dm.policy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.matrix.dm.allowFrom`：私聊 allowlist（用户 ID 或显示名）。`open` 需包含 `"*"`。向导在可能时解析名称到 ID。
- `channels.matrix.groupPolicy`：`allowlist | open | disabled`（默认：allowlist）。
- `channels.matrix.groupAllowFrom`：群聊 allowlist 发送者。
- `channels.matrix.allowlistOnly`：强制私聊 + 房间均走 allowlist 规则。
- `channels.matrix.groups`：群 allowlist + 按房间设置。
- `channels.matrix.rooms`：旧版群 allowlist/配置。
- `channels.matrix.replyToMode`：线程/标签的 reply-to 模式。
- `channels.matrix.mediaMaxMb`：入站/出站媒体上限（MB）。
- `channels.matrix.autoJoin`：邀请处理（`always | allowlist | off`，默认 always）。
- `channels.matrix.autoJoinAllowlist`：允许自动加入的房间 ID/别名。
- `channels.matrix.actions`：按动作工具开关（reactions/messages/pins/memberInfo/channelInfo）。
