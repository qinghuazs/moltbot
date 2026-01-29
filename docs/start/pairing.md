---
summary: "配对概览：审批谁能私信你 + 哪些节点可加入"
read_when:
  - 设置私信访问控制
  - 配对新的 iOS/Android 节点
  - 审阅 Moltbot 安全姿态
---

# 配对

“配对”是 Moltbot 的明确**所有者审批**步骤。
它用于两个场景：

1) **私信配对**（谁可以和机器人对话）
2) **节点配对**（哪些设备或节点可以加入 gateway 网络）

安全背景：[Security](/gateway/security)

## 1) 私信配对（入站聊天访问）

当某个渠道的私信策略为 `pairing` 时，未知发送者会收到一个短码，消息在审批前**不会处理**。

默认私信策略见：[Security](/gateway/security)

配对码：
- 8 位，大写，不含易混字符（`0O1I`）。
- **1 小时后过期**。机器人只在创建新请求时发送配对消息（每个发送者大约每小时一次）。
- 待处理配对请求默认**每个渠道最多 3 个**；超过后会忽略新请求，直到有请求过期或被批准。

### 批准发送者

```bash
moltbot pairing list telegram
moltbot pairing approve telegram <CODE>
```

支持的渠道：`telegram`、`whatsapp`、`signal`、`imessage`、`discord`、`slack`。

### 状态存储位置

存储于 `~/.clawdbot/credentials/`：
- 待处理请求：`<channel>-pairing.json`
- 已批准 allowlist：`<channel>-allowFrom.json`

请视为敏感数据（它们控制你助手的访问）。


## 2) 节点设备配对（iOS/Android/macOS/无头节点）

节点以 **设备** 形式连接 Gateway，`role: node`。Gateway 会创建一个必须审批的设备配对请求。

### 批准节点设备

```bash
moltbot devices list
moltbot devices approve <requestId>
moltbot devices reject <requestId>
```

### 状态存储位置

存储于 `~/.clawdbot/devices/`：
- `pending.json`（短期存在；待处理请求会过期）
- `paired.json`（已配对设备与 token）

### 说明

- 旧版 `node.pair.*` API（CLI：`moltbot nodes pending/approve`）是
  一个独立的 gateway 配对存储。WS 节点仍需要设备配对。


## 相关文档

- 安全模型与提示注入：[Security](/gateway/security)
- 安全更新（运行 doctor）：[Updating](/install/updating)
- 渠道配置：
  - Telegram：[Telegram](/channels/telegram)
  - WhatsApp：[WhatsApp](/channels/whatsapp)
  - Signal：[Signal](/channels/signal)
  - iMessage：[iMessage](/channels/imessage)
  - Discord：[Discord](/channels/discord)
  - Slack：[Slack](/channels/slack)
