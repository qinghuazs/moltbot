---
name: slack
description: Use when you need to control Slack from Moltbot via the slack tool, including reacting to messages or pinning/unpinning items in Slack channels or DMs.
metadata: {"moltbot":{"emoji":"💬","requires":{"config":["channels.slack"]}}}
---

# Slack 操作

## 概述

使用 `slack` 来反应、管理置顶、发送/编辑/删除消息，以及获取成员信息。该工具使用为 Moltbot 配置的机器人令牌。

## 需要收集的输入

- `channelId` 和 `messageId`（Slack 消息时间戳，例如 `1712023032.1234`）。
- 对于反应，需要一个 `emoji`（Unicode 或 `:name:`）。
- 对于发送消息，需要一个 `to` 目标（`channel:<id>` 或 `user:<id>`）和 `content`。

消息上下文行包含您可以直接重用的 `slack message id` 和 `channel` 字段。

## 操作

### 操作组

| 操作组 | 默认 | 注释 |
| --- | --- | --- |
| reactions | 启用 | 反应 + 列出反应 |
| messages | 启用 | 读取/发送/编辑/删除 |
| pins | 启用 | 置顶/取消置顶/列出 |
| memberInfo | 启用 | 成员信息 |
| emojiList | 启用 | 自定义表情符号列表 |

### 对消息做出反应

```json
{
  "action": "react",
  "channelId": "C123",
  "messageId": "1712023032.1234",
  "emoji": "✅"
}
```

### 列出反应

```json
{
  "action": "reactions",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

### 发送消息

```json
{
  "action": "sendMessage",
  "to": "channel:C123",
  "content": "Hello from Moltbot"
}
```

### 编辑消息

```json
{
  "action": "editMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234",
  "content": "Updated text"
}
```

### 删除消息

```json
{
  "action": "deleteMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

### 读取最近消息

```json
{
  "action": "readMessages",
  "channelId": "C123",
  "limit": 20
}
```

### 置顶消息

```json
{
  "action": "pinMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

### 取消置顶消息

```json
{
  "action": "unpinMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

### 列出置顶项目

```json
{
  "action": "listPins",
  "channelId": "C123"
}
```

### 成员信息

```json
{
  "action": "memberInfo",
  "userId": "U123"
}
```

### 表情符号列表

```json
{
  "action": "emojiList"
}
```

## 尝试的想法

- 用 ✅ 反应来标记已完成的任务。
- 置顶关键决策或每周状态更新。
