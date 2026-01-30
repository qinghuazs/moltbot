---
summary: "WhatsApp 群消息处理行为与配置（mentionPatterns 在多个渠道共用）"
read_when:
  - 修改群消息规则或提及策略
---
# 群消息（WhatsApp web 渠道）

目标：让 Clawd 进入 WhatsApp 群，仅在被点名时唤醒，并与个人私聊会话分离。

说明：`agents.list[].groupChat.mentionPatterns` 现在也用于 Telegram/Discord/Slack/iMessage；本文聚焦 WhatsApp 特有行为。多代理场景请在每个代理上设置 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作为全局兜底）。

## 已实现功能（2025-12-03）
- 激活模式：`mention`（默认）或 `always`。`mention` 需要 ping（真实 WhatsApp @ 提及的 `mentionedJids`，正则匹配，或文本中的机器人 E.164）。`always` 会对每条消息唤醒代理，但仅在有价值时回复，否则返回静默 token `NO_REPLY`。默认值可在配置中设置（`channels.whatsapp.groups`），并可通过 `/activation` 在群内覆盖。设置 `channels.whatsapp.groups` 时，它也作为群允许列表（包含 `"*"` 代表允许全部）。
- 群策略：`channels.whatsapp.groupPolicy` 控制是否接受群消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（兜底为显式 `channels.whatsapp.allowFrom`）。默认是 `allowlist`（未添加发送者前阻止）。
- 群会话隔离：会话 key 形如 `agent:<agentId>:whatsapp:group:<jid>`，因此 `/verbose on` 或 `/think high` 等命令（以独立消息发送）只作用于该群；个人私聊状态不受影响。群线程不执行心跳。
- 上下文注入：**仅待处理**的群消息（默认 50 条）且*未*触发运行的，会被前缀为 `[Chat messages since your last reply - for context]`，触发消息则标在 `[Current message - respond to this]` 下。已进入会话的消息不会重复注入。
- 发送者提示：每批群消息结尾追加 `[from: Sender Name (+E164)]`，让 Pi 知道是谁在说话。
- 一次性与阅后即焚：解析文本与提及时会先解包，因此其中的 ping 仍可触发。
- 群系统提示：在群会话首轮（以及 `/activation` 改变模式时），系统提示会注入短提示，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.` 若元数据不可用，也会提示这是群聊。

## 配置示例（WhatsApp）

在 `~/.clawdbot/moltbot.json` 添加 `groupChat` 以支持显示名 ping，即便 WhatsApp 在文本中去掉了可见的 `@`：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true }
      }
    }
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          historyLimit: 50,
          mentionPatterns: [
            "@?moltbot",
            "\\+?15555550123"
          ]
        }
      }
    ]
  }
}
```

说明：
- 正则为大小写不敏感，覆盖显示名 ping（如 `@moltbot`）以及带或不带 `+`/空格的号码。
- WhatsApp 在用户点击联系人时仍会发送 `mentionedJids`，因此号码兜底很少用到，但可作为安全网。

### 激活命令（仅 owner）

使用群聊命令：
- `/activation mention`
- `/activation always`

只有 owner 号码（来自 `channels.whatsapp.allowFrom`，若未设置则为机器人自身 E.164）可修改。
在群里发送独立的 `/status` 可查看当前激活模式。

## 使用方法
1) 将运行 Moltbot 的 WhatsApp 账号加入群聊。
2) 发送 `@moltbot …`（或包含号码）。除非设置 `groupPolicy: "open"`，否则只有允许列表中的发送者可触发。
3) 代理提示词会包含最近群上下文，并带上末尾的 `[from: …]` 标记以便指向正确的发送者。
4) 会话级指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）只作用于该群会话；请以独立消息发送以便生效。个人私聊会话保持独立。

## 测试与验证
- 手动冒烟：
  - 在群里发送 `@clawd`，确认回复包含发送者名。
  - 再发送一次 ping，确认历史块被包含并在下一轮清空。
- 检查 gateway 日志（以 `--verbose` 运行）查看 `inbound web message` 条目，包含 `from: <groupJid>` 与 `[from: …]` 后缀。

## 已知注意事项
- 群聊故意跳过心跳以避免噪声广播。
- 回声抑制使用合并后的批量字符串；若无提及且发送相同文本两次，仅第一次会触发回复。
- 会话存储条目会显示为 `agent:<agentId>:whatsapp:group:<jid>`（默认存储于 `~/.clawdbot/agents/<agentId>/sessions/sessions.json`）；缺失只表示该群尚未触发运行。
- 群内输入指示遵循 `agents.defaults.typingMode`（默认：未提及时为 `message`）。
