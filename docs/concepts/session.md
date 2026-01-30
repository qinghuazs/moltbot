---
summary: "聊天的会话管理规则、键和持久化"
read_when:
  - 修改会话处理或存储
---
# 会话管理

Moltbot 将**每个代理一个直接聊天会话**视为主要会话。直接聊天折叠到 `agent:<agentId>:<mainKey>`（默认 `main`），而群组/频道聊天获得自己的键。`session.mainKey` 被遵循。

使用 `session.dmScope` 控制**直接消息**如何分组：
- `main`（默认）：所有私聊共享主会话以保持连续性。
- `per-peer`：按跨渠道的发送者 id 隔离。
- `per-channel-peer`：按渠道 + 发送者隔离（推荐用于多用户收件箱）。
- `per-account-channel-peer`：按账户 + 渠道 + 发送者隔离（推荐用于多账户收件箱）。
使用 `session.identityLinks` 将提供商前缀的对等体 id 映射到规范身份，以便在使用 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 时，同一人跨渠道共享私聊会话。

## 网关是真实来源
所有会话状态由**网关**（"主"Moltbot）**拥有**。UI 客户端（macOS 应用、WebChat 等）必须向网关查询会话列表和令牌计数，而不是读取本地文件。

- 在**远程模式**下，您关心的会话存储位于远程网关主机上，而不是您的 Mac 上。
- UI 中显示的令牌计数来自网关的存储字段（`inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`）。客户端不解析 JSONL 记录来"修正"总数。

## 状态位置
- 在**网关主机**上：
  - 存储文件：`~/.clawdbot/agents/<agentId>/sessions/sessions.json`（每代理）。
- 记录：`~/.clawdbot/agents/<agentId>/sessions/<SessionId>.jsonl`（Telegram 主题会话使用 `.../<SessionId>-topic-<threadId>.jsonl`）。
- 存储是 `sessionKey -> { sessionId, updatedAt, ... }` 的映射。删除条目是安全的；它们会按需重新创建。
- 群组条目可能包含 `displayName`、`channel`、`subject`、`room` 和 `space` 以在 UI 中标记会话。
- 会话条目包含 `origin` 元数据（标签 + 路由提示），以便 UI 可以解释会话来源。
- Moltbot **不**读取旧版 Pi/Tau 会话文件夹。

## 会话修剪
Moltbot 默认在 LLM 调用前从内存上下文中修剪**旧工具结果**。
这**不会**重写 JSONL 历史。参见 [/concepts/session-pruning](/concepts/session-pruning)。

## 压缩前记忆刷新
当会话接近自动压缩时，Moltbot 可以运行**静默记忆刷新**轮次，提醒模型将持久笔记写入磁盘。这仅在工作区可写时运行。参见 [记忆](/concepts/memory) 和 [压缩](/concepts/compaction)。

## 传输映射 → 会话键
- 直接聊天遵循 `session.dmScope`（默认 `main`）。
  - `main`：`agent:<agentId>:<mainKey>`（跨设备/渠道的连续性）。
    - 多个电话号码和渠道可以映射到同一个代理主键；它们充当进入一个对话的传输。
  - `per-peer`：`agent:<agentId>:dm:<peerId>`。
  - `per-channel-peer`：`agent:<agentId>:<channel>:dm:<peerId>`。
  - `per-account-channel-peer`：`agent:<agentId>:<channel>:<accountId>:dm:<peerId>`（accountId 默认为 `default`）。
  - 如果 `session.identityLinks` 匹配提供商前缀的对等体 id（例如 `telegram:123`），规范键替换 `<peerId>`，以便同一人跨渠道共享会话。
- 群聊隔离状态：`agent:<agentId>:<channel>:group:<id>`（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
  - Telegram 论坛主题在群组 id 后附加 `:topic:<threadId>` 以进行隔离。
  - 旧版 `group:<id>` 键仍被识别用于迁移。
- 入站上下文可能仍使用 `group:<id>`；渠道从 `Provider` 推断并规范化为规范的 `agent:<agentId>:<channel>:group:<id>` 形式。
- 其他来源：
  - Cron 作业：`cron:<job.id>`
  - Webhooks：`hook:<uuid>`（除非由 hook 明确设置）
  - 节点运行：`node-<nodeId>`

## 生命周期
- 重置策略：会话被重用直到过期，过期在下一条入站消息时评估。
- 每日重置：默认为**网关主机本地时间凌晨 4:00**。当会话的最后更新早于最近的每日重置时间时，会话过期。
- 空闲重置（可选）：`idleMinutes` 添加滑动空闲窗口。当同时配置每日和空闲重置时，**先过期的**强制新会话。
- 旧版仅空闲：如果您设置 `session.idleMinutes` 而没有任何 `session.reset`/`resetByType` 配置，Moltbot 保持仅空闲模式以向后兼容。
- 按类型覆盖（可选）：`resetByType` 允许您覆盖 `dm`、`group` 和 `thread` 会话的策略（thread = Slack/Discord 线程、Telegram 主题、连接器提供时的 Matrix 线程）。
- 按渠道覆盖（可选）：`resetByChannel` 覆盖渠道的重置策略（适用于该渠道的所有会话类型，优先于 `reset`/`resetByType`）。
- 重置触发器：精确的 `/new` 或 `/reset`（加上 `resetTriggers` 中的任何额外项）开始新的会话 id 并传递消息的其余部分。`/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）来设置新会话模型。如果单独发送 `/new` 或 `/reset`，Moltbot 运行一个简短的"hello"问候轮次来确认重置。
- 手动重置：从存储中删除特定键或删除 JSONL 记录；下一条消息会重新创建它们。
- 隔离的 cron 作业始终为每次运行生成新的 `sessionId`（无空闲重用）。

## 发送策略（可选）
阻止特定会话类型的投递，而无需列出单个 id。

```json5
{
  session: {
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } },
        { action: "deny", match: { keyPrefix: "cron:" } }
      ],
      default: "allow"
    }
  }
}
```

运行时覆盖（仅所有者）：
- `/send on` → 允许此会话
- `/send off` → 拒绝此会话
- `/send inherit` → 清除覆盖并使用配置规则
将这些作为独立消息发送以便注册。

## 配置（可选重命名示例）
```json5
// ~/.clawdbot/moltbot.json
{
  session: {
    scope: "per-sender",      // 保持群组键分开
    dmScope: "main",          // 私聊连续性（为共享收件箱设置 per-channel-peer/per-account-channel-peer）
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"]
    },
    reset: {
      // 默认：mode=daily，atHour=4（网关主机本地时间）。
      // 如果您还设置了 idleMinutes，先过期的获胜。
      mode: "daily",
      atHour: 4,
      idleMinutes: 120
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      dm: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 }
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 }
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.clawdbot/agents/{agentId}/sessions/sessions.json",
    mainKey: "main",
  }
}
```

## 检查
- `moltbot status` — 显示存储路径和最近会话。
- `moltbot sessions --json` — 转储每个条目（使用 `--active <minutes>` 过滤）。
- `moltbot gateway call sessions.list --params '{}'` — 从运行的网关获取会话（使用 `--url`/`--token` 访问远程网关）。
- 在聊天中发送 `/status` 作为独立消息，查看代理是否可达、会话上下文使用了多少、当前思考/详细切换，以及您的 WhatsApp web 凭据上次刷新时间（帮助发现重新链接需求）。
- 发送 `/context list` 或 `/context detail` 查看系统提示和注入的工作区文件中有什么（以及最大的上下文贡献者）。
- 发送 `/stop` 作为独立消息以中止当前运行、清除该会话的排队后续，并停止从中生成的任何子代理运行（回复包含停止计数）。
- 发送 `/compact`（可选指令）作为独立消息以总结旧上下文并释放窗口空间。参见 [/concepts/compaction](/concepts/compaction)。
- JSONL 记录可以直接打开以查看完整轮次。

## 提示
- 将主键专用于 1:1 流量；让群组保持自己的键。
- 自动化清理时，删除单个键而不是整个存储以保留其他地方的上下文。

## 会话来源元数据
每个会话条目在 `origin` 中记录其来源（尽力而为）：
- `label`：人类标签（从对话标签 + 群组主题/频道解析）
- `provider`：规范化渠道 id（包括扩展）
- `from`/`to`：入站信封中的原始路由 id
- `accountId`：提供商账户 id（多账户时）
- `threadId`：渠道支持时的线程/主题 id
来源字段为直接消息、频道和群组填充。如果连接器仅更新投递路由（例如，保持私聊主会话新鲜），它仍应提供入站上下文，以便会话保持其解释器元数据。扩展可以通过在入站上下文中发送 `ConversationLabel`、`GroupSubject`、`GroupChannel`、`GroupSpace` 和 `SenderName` 并调用 `recordSessionMetaFromInbound`（或将相同上下文传递给 `updateLastRoute`）来实现。
